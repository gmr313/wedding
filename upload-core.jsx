// upload-core.jsx — config, media helpers, upload, persistence
// ───────────────────────────────────────────────────────────────────
// CHOOSE A STORAGE METHOD. The page auto-detects which one you filled in.
//
// ▶ RECOMMENDED — Cloudinary (free, reliable, no guest login, real progress).
//   See "Cloudinary Setup.md" for the 3-minute setup. Paste both values:
const CLOUDINARY_CLOUD  = "dmitjdbog";  // your "Cloud name", e.g. "dabc1xyz"
const CLOUDINARY_PRESET = "ng2ptcqd";  // your UNSIGNED upload preset name, e.g. "wedding_uploads"
//
// ▶ ALTERNATIVE — Google Apps Script / Drive (see "Google Drive Setup.md").
const DRIVE_ENDPOINT = ""; // e.g. "https://script.google.com/macros/s/AKfy.../exec"
//
// If none are filled in, the page runs in DEMO mode (uploads are simulated).
// ───────────────────────────────────────────────────────────────────

const STORAGE =
  (CLOUDINARY_CLOUD && CLOUDINARY_PRESET) ? "cloudinary" :
  DRIVE_ENDPOINT ? "drive" : "demo";
const DEMO_MODE = STORAGE === "demo";
const GALLERY_KEY = "gg_wedding_gallery_v2";
const NAME_KEY = "gg_wedding_guestname_v1";
const MAX_THUMB = 320; // px, longest edge for stored preview

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function readBlobAsDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

function drawScaled(source, sw, sh) {
  const scale = Math.min(1, MAX_THUMB / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.72);
}

// Build a small JPEG preview (data URL) for an image OR a video's first frame.
function makeThumb(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.muted = true; v.playsInline = true; v.preload = "metadata";
      v.src = url;
      const grab = () => {
        try { resolve(drawScaled(v, v.videoWidth || 320, v.videoHeight || 240)); }
        catch (e) { resolve(null); }
        finally { URL.revokeObjectURL(url); }
      };
      v.onloadeddata = () => { try { v.currentTime = Math.min(0.15, (v.duration || 1) / 2); } catch (e) { grab(); } };
      v.onseeked = grab;
      v.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      setTimeout(() => { if (v.readyState < 2) { grab(); } }, 2500);
    } else {
      const img = new Image();
      img.onload = () => { resolve(drawScaled(img, img.naturalWidth, img.naturalHeight)); URL.revokeObjectURL(url); };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    }
  });
}

function humanSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return mb.toFixed(1) + " MB";
  return Math.max(1, Math.round(bytes / 1024)) + " KB";
}

// Upload one item to the configured store. onProgress(0..1).
// Resolves { ok, url } or throws.
async function uploadItem(item, guestName, onProgress) {
  if (STORAGE === "demo") {
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, 70 + Math.random() * 90));
      onProgress(i / steps);
    }
    return { ok: true, url: null, demo: true };
  }

  if (STORAGE === "cloudinary") {
    // Direct unsigned upload to Cloudinary. CORS-enabled, so we get a real
    // response (and real upload progress via XHR).
    const form = new FormData();
    form.append("file", item.file);
    form.append("upload_preset", CLOUDINARY_PRESET);
    if (guestName) form.append("context", "guest=" + guestName.replace(/[|=]/g, " "));
    const url = "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/auto/upload";
    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.min(0.98, e.loaded / e.total)); };
      xhr.onload = () => {
        onProgress(1);
        if (xhr.status >= 200 && xhr.status < 300) {
          let j = {};
          try { j = JSON.parse(xhr.responseText); } catch (e) {}
          resolve({ ok: true, url: j.secure_url || null });
        } else {
          let msg = "Upload failed (" + xhr.status + ")";
          try { msg = JSON.parse(xhr.responseText).error.message || msg; } catch (e) {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(form);
    });
  }

  // STORAGE === "drive": Apps Script answers a cross-origin POST with a
  // redirect to a no-CORS domain, so we can't read the reply even though the
  // script ran. A "simple" multipart request in no-cors mode delivers the file.
  const dataUrl = await readBlobAsDataURL(item.file);
  const base64 = String(dataUrl).split(",")[1] || "";
  if (!base64) throw new Error("Could not read file");
  const form = new FormData();
  form.append("data", base64);
  form.append("filename", item.file.name || (item.kind + "-" + uid()));
  form.append("mimeType", item.file.type || "application/octet-stream");
  form.append("guest", guestName || "");
  onProgress(0.2);
  await fetch(DRIVE_ENDPOINT, { method: "POST", mode: "no-cors", body: form });
  onProgress(1);
  return { ok: true, url: null };
}

// ---- lightweight persistence of the live gallery (thumbnails only) ----
function loadGallery() {
  try {
    const raw = localStorage.getItem(GALLERY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}
function saveGallery(items) {
  // Persist only what survives a refresh: thumb + meta of uploaded items.
  const slim = items
    .filter((it) => it.status === "done")
    .slice(-60)
    .map((it) => ({ id: it.id, kind: it.kind, thumb: it.thumb, guest: it.guest || "", at: it.at }));
  try { localStorage.setItem(GALLERY_KEY, JSON.stringify(slim)); } catch (e) {}
}

Object.assign(window, {
  DRIVE_ENDPOINT, DEMO_MODE, NAME_KEY,
  uid, makeThumb, humanSize, uploadItem, loadGallery, saveGallery,
});
