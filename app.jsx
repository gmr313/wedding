// app.jsx — Geri & Gerry wedding upload page
const { useState, useEffect, useRef, useCallback } = React;

// Optional: paste a hero photo URL (or leave "" for the elegant placeholder).
const HERO_IMAGE = "https://withjoy.com/media/46156b59-2736-58c5-b9f0-ae5c63fe306a/1263d2c0-b7de-11f0-8154-172802ff1706-Venue.png";

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "headline": "Help us capture the day",
  "bgTone": "sage",
  "columns": "three",
  "corners": "soft",
  "showDate": true
} /*EDITMODE-END*/;

const TONES = {
  sage: { "--bg": "#c9cea5", "--paper": "#ffffff" },
  ivory: { "--bg": "#faf8f4", "--paper": "#ffffff" },
  pure: { "--bg": "#ffffff", "--paper": "#ffffff" },
  grey: { "--bg": "#f1efea", "--paper": "#ffffff" }
};

// ── small geometric icons (simple shapes only) ─────────────────────
function IconCamera() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2.5" y="6.5" width="19" height="13" rx="2.2" />
      <circle cx="12" cy="13" r="3.6" />
      <path d="M8 6.5 L9.4 4.2 H14.6 L16 6.5" />
    </svg>);

}
function IconLibrary() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="3" y="3" width="14" height="14" rx="2" />
      <rect x="7" y="7" width="14" height="14" rx="2" />
    </svg>);

}
function PlayBadge() {
  return (
    <span style={wedStyles.playBadge}>
      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 2 L10 6 L3 10 Z" fill="#fff" /></svg>
    </span>);

}
function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: "spin 0.9s linear infinite" }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2.4" />
      <path d="M12 3 a9 9 0 0 1 9 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>);

}
function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5 L10 17.5 L19 6.5" />
    </svg>);

}

// ── flourish divider ───────────────────────────────────────────────
function Divider() {
  return (
    <div style={wedStyles.divider}>
      <span style={wedStyles.dividerLine} />
      <svg width="26" height="10" viewBox="0 0 26 10" style={{ flex: "0 0 auto" }}>
        <circle cx="13" cy="5" r="2.1" fill="var(--ink)" />
        <circle cx="4" cy="5" r="1" fill="var(--ink)" />
        <circle cx="22" cy="5" r="1" fill="var(--ink)" />
      </svg>
      <span style={wedStyles.dividerLine} />
    </div>);

}

// ── hero ────────────────────────────────────────────────────────────
function Hero({ headline, showDate }) {
  return (
    <header style={wedStyles.hero}>
      {showDate && <div className="label" style={{ color: "var(--ink-soft)", textTransform: "none", letterSpacing: "0.18em" }}></div>}
      <h1 style={{ ...wedStyles.names, fontSize: "51px", color: "rgb(0, 0, 0)" }}>Geri + Gerry</h1>
      {HERO_IMAGE ?
      <img src={HERO_IMAGE} alt="Geri and Gerry" style={wedStyles.heroPhoto} /> :
      <div style={wedStyles.heroFrame}>
          <div style={wedStyles.heroPlaceholder}>
            <span style={wedStyles.monoNote}>your photo here</span>
            <span style={wedStyles.monoSub}>set HERO_IMAGE in app.jsx</span>
          </div>
        </div>}
      <h2 style={{ ...wedStyles.headline, fontFamily: "\"Cormorant Garamond\"", color: "rgb(0, 0, 0)" }}>{headline}</h2>
      <p style={{ ...wedStyles.intro, color: "rgb(0, 0, 0)" }}>Every snap, every silly video — we want to see the day through your eyes. Share your photos and videos right here, and they’ll come straight to us.


      </p>
    </header>);

}

// ── a single tile in the gallery / staging grid ─────────────────────
function Tile({ item }) {
  return (
    <div style={{ ...wedStyles.tile, animation: "pop .35s ease both" }}>
      {item.thumb ?
      <img src={item.thumb} alt="" style={wedStyles.tileImg} /> :
      <div style={wedStyles.tileFallback}><span className="label" style={{ fontSize: 9, color: "var(--ink-soft)" }}>{item.kind}</span></div>}
      {item.kind === "video" && <PlayBadge />}

      {item.status === "uploading" &&
      <div style={wedStyles.tileOverlay}>
          <Spinner />
          <div style={wedStyles.progressTrack}>
            <div style={{ ...wedStyles.progressFill, width: Math.round((item.progress || 0) * 100) + "%" }} />
          </div>
        </div>
      }
      {item.status === "done" &&
      <div style={wedStyles.doneTick}><Check /></div>
      }
      {item.status === "error" &&
      <div style={{ ...wedStyles.tileOverlay, background: "rgba(120,20,20,.55)" }}>
          <span className="label" style={{ color: "#fff", fontSize: 9 }}>retry</span>
        </div>
      }
    </div>);

}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [items, setItems] = useState([]); // staging (ready/uploading/error)
  const [gallery, setGallery] = useState(() => loadGallery()); // persisted, done
  const [guest, setGuest] = useState(() => {try {return localStorage.getItem(NAME_KEY) || "";} catch (e) {return "";}});
  const [busy, setBusy] = useState(false);
  const [thanks, setThanks] = useState(false);
  const camRef = useRef(null);
  const libRef = useRef(null);

  useEffect(() => {try {localStorage.setItem(NAME_KEY, guest);} catch (e) {}}, [guest]);

  const ready = items.filter((it) => it.status === "ready" || it.status === "error");
  const cols = t.columns === "two" ? 2 : 3;

  const addFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (!files.length) return;
    const staged = files.map((file) => ({
      id: uid(), file,
      kind: file.type.startsWith("video/") ? "video" : "photo",
      thumb: null, status: "ready", progress: 0, at: Date.now()
    }));
    setItems((prev) => [...prev, ...staged]);
    // generate previews lazily
    staged.forEach(async (it) => {
      const thumb = await makeThumb(it.file);
      setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, thumb } : x));
    });
  }, []);

  const onPick = (e) => {addFiles(e.target.files);e.target.value = "";};

  const shareAll = useCallback(async () => {
    if (busy) return;
    const queue = items.filter((it) => it.status === "ready" || it.status === "error");
    if (!queue.length) return;
    setBusy(true);
    for (const it of queue) {
      setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, status: "uploading", progress: 0 } : x));
      try {
        const res = await uploadItem(it, guest, (p) => {
          setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, progress: p } : x));
        });
        const doneItem = { ...it, status: "done", progress: 1, guest, url: res.url };
        setItems((prev) => prev.map((x) => x.id === it.id ? doneItem : x));
        setGallery((prev) => {
          const next = [...prev, { id: doneItem.id, kind: doneItem.kind, thumb: doneItem.thumb, guest, at: doneItem.at }];
          saveGallery(next.map((g) => ({ ...g, status: "done" })));
          return next;
        });
      } catch (err) {
        setItems((prev) => prev.map((x) => x.id === it.id ? { ...x, status: "error" } : x));
      }
    }
    setBusy(false);
    // clear the done ones out of staging after a beat; show thanks
    setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.status !== "done"));
      setThanks(true);
    }, 700);
  }, [items, guest, busy]);

  useEffect(() => {
    if (!thanks) return;
    const id = setTimeout(() => setThanks(false), 5200);
    return () => clearTimeout(id);
  }, [thanks]);

  const toneVars = TONES[t.bgTone] || TONES.ivory;
  const radius = t.corners === "sharp" ? "0px" : "3px";
  const totalShared = gallery.length;

  return (
    <div style={{ ...toneVars, "--radius": radius, background: "var(--bg)", minHeight: "100vh", fontSize: "16px" }}>
      <main style={{ ...wedStyles.page, paddingTop: DEMO_MODE ? 78 : 48 }}>
        <Hero headline={t.headline} showDate={t.showDate} />

        {/* ── Upload card ── */}
        <section style={{ ...wedStyles.card, marginTop: 48 }}>
          <div className="label" style={{ textAlign: "center", color: "rgb(0, 0, 0)" }}>Share a moment</div>

          <div style={wedStyles.pickRow}>
            <button style={wedStyles.pickBtn} onClick={() => camRef.current && camRef.current.click()}>
              <IconCamera /><span style={{ ...wedStyles.pickLabel, color: "rgb(0, 0, 0)" }}>Take a photo<br />or video</span>
            </button>
            <button style={wedStyles.pickBtn} onClick={() => libRef.current && libRef.current.click()}>
              <IconLibrary /><span style={{ ...wedStyles.pickLabel, color: "rgb(0, 0, 0)" }}>Choose from<br />your library</span>
            </button>
          </div>

          <input ref={camRef} type="file" accept="image/*,video/*" capture="environment" onChange={onPick} style={{ display: "none" }} />
          <input ref={libRef} type="file" accept="image/*,video/*" multiple onChange={onPick} style={{ display: "none" }} />

          <label style={wedStyles.nameWrap}>
            <span className="label" style={{ fontSize: 10.5, color: "rgb(0, 0, 0)" }}>Your name <span style={{ textTransform: "none", letterSpacing: 0, fontStyle: "italic", fontSize: 13 }}>— optional</span></span>
            <input
              value={guest}
              onChange={(e) => setGuest(e.target.value)}
              placeholder="So we know who to thank"
              style={{ ...wedStyles.nameInput, borderTop: "rgb(0, 0, 0)", borderRight: "rgb(0, 0, 0)", borderLeft: "rgb(0, 0, 0)", borderBottomColor: "rgb(0, 0, 0)" }} />
            
          </label>

          {ready.length > 0 &&
          <div style={{ animation: "fadeUp .3s ease both" }}>
              <div style={wedStyles.stagingHead}>
                <span style={{ ...wedStyles.stagingCount, color: "rgb(0, 0, 0)" }}>{ready.length} selected</span>
                <button style={{ ...wedStyles.clearBtn, color: "rgb(0, 0, 0)" }} onClick={() => setItems((prev) => prev.filter((x) => x.status === "done" || x.status === "uploading"))} disabled={busy}>Clear</button>
              </div>
              <div style={{ ...wedStyles.grid, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                {items.filter((x) => x.status !== "done").map((it) => <Tile key={it.id} item={it} />)}
              </div>
            </div>
          }

          <button
            style={{ ...wedStyles.shareBtn, opacity: ready.length && !busy ? 1 : 0.4, pointerEvents: busy ? "none" : "auto" }}
            onClick={shareAll}
            disabled={!ready.length || busy}>
            
            {busy ? "Sharing…" : ready.length ? `Share ${ready.length} with Geri & Gerry` : "Share with Geri & Gerry"}
          </button>
        </section>

        {/* ── Live gallery ── */}
        <section style={{ marginTop: 44 }}>
          <h3 style={{ ...wedStyles.galleryTitle, fontSize: "38px", color: "rgb(0, 0, 0)" }}>The gallery</h3>
          <p style={{ ...wedStyles.gallerySub, color: "rgb(0, 0, 0)" }}>
            {totalShared === 0 ?
            "You’ve shared no moments so far" :
            `${totalShared} ${totalShared === 1 ? "moment" : "moments"} you’ve shared so far`}
          </p>
          {totalShared > 0 &&
          <div style={{ ...wedStyles.grid, gridTemplateColumns: `repeat(${cols}, 1fr)`, marginTop: 18 }}>
              {[...gallery].reverse().map((g) => <Tile key={g.id} item={{ ...g, status: "done" }} />)}
            </div>
          }
        </section>

        <footer style={wedStyles.footer}>
          <span style={{ ...wedStyles.script, padding: "0px", color: "rgb(0, 0, 0)" }}>Geri + Gerry</span>
          <span className="label" style={{ fontSize: 10, margin: "0px", padding: "1px 0px 0px", textTransform: "none", letterSpacing: "0.18em", color: "rgb(0, 0, 0)" }}>27 June 2026 · Richmond, London
          </span>
        </footer>
      </main>

      {/* thank-you toast */}
      {thanks && <div style={wedStyles.toast}>
          <div style={wedStyles.toastTick}><Check /></div>
          <div>
            <div style={{ fontSize: 19, lineHeight: 1.2 }}>Thank you{guest ? ", " + guest.split(" ")[0] : ""}!</div>
            <div style={{ fontSize: 14, color: "var(--ink-soft)", fontStyle: "italic" }}>Your moments are on their way to us.</div>
          </div>
        </div>
      }

      {/* owner-only preview notice */}
      {DEMO_MODE &&
      <div style={wedStyles.demoNote}>
          Preview mode — uploads aren’t saved yet. Connect your Google Drive (see “Google Drive Setup.md”) to go live.
        </div>
      }

      <TweaksPanel>
        <TweakSection label="Words" />
        <TweakText label="Headline" value={t.headline} onChange={(v) => setTweak("headline", v)} />
        <TweakToggle label="Show date" value={t.showDate} onChange={(v) => setTweak("showDate", v)} />
        <TweakSection label="Look" />
        <TweakRadio label="Background" value={t.bgTone} options={["sage", "ivory", "pure", "grey"]} onChange={(v) => setTweak("bgTone", v)} />
        <TweakRadio label="Corners" value={t.corners} options={["soft", "sharp"]} onChange={(v) => setTweak("corners", v)} />
        <TweakRadio label="Gallery cols" value={t.columns} options={["two", "three"]} onChange={(v) => setTweak("columns", v)} />
      </TweaksPanel>
    </div>);

}

const wedStyles = {
  page: { maxWidth: 540, margin: "0 auto", padding: "48px 22px 60px" },
  hero: { textAlign: "center" },
  names: { fontFamily: "var(--script)", fontWeight: 400, fontSize: "clamp(64px, 22vw, 104px)", lineHeight: 0.9, margin: "30px 0 4px", color: "var(--ink)" },
  heroFrame: { position: "relative", margin: "22px auto 0", maxWidth: 360, aspectRatio: "4 / 5", border: "1px solid var(--line)", padding: 7, background: "var(--paper)" },
  heroPhoto: { display: "block", width: "100%", height: "auto", margin: "24px 0 0", borderRadius: "var(--radius)" },
  heroImg: { width: "100%", height: "100%", objectFit: "cover", display: "block", filter: "grayscale(1) contrast(1.02)" },
  heroPlaceholder: {
    width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#f3f0ea",
    backgroundImage: "repeating-linear-gradient(45deg, rgba(22,20,18,.05) 0 1px, transparent 1px 11px)"
  },
  monoNote: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 11, letterSpacing: "0.08em", color: "#8a857c", textTransform: "uppercase" },
  monoSub: { fontFamily: "ui-monospace, Menlo, monospace", fontSize: 9.5, color: "#b3ada3" },
  headline: { fontFamily: "var(--serif)", fontWeight: 400, fontStyle: "italic", fontSize: "clamp(26px, 8vw, 34px)", margin: "30px 0 0", lineHeight: 1.1, color: "var(--ink)" },
  intro: { fontSize: 17, lineHeight: 1.5, color: "var(--ink-soft)", maxWidth: 380, margin: "14px auto 0", textWrap: "pretty" },

  divider: { display: "flex", alignItems: "center", gap: 12, margin: "34px auto", maxWidth: 220 },
  dividerLine: { flex: 1, height: 1, background: "var(--line)" },

  card: { background: "var(--paper)", border: "1px solid var(--line-soft)", borderRadius: "var(--radius)", padding: "26px 20px", display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 1px 0 rgba(22,20,18,.02)" },
  pickRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  pickBtn: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 9, padding: "22px 8px", background: "#faf8f4", border: "1px solid var(--line)", borderRadius: "var(--radius)", color: "var(--ink)", transition: "background .15s, transform .1s" },
  pickLabel: { fontSize: 15, lineHeight: 1.2, textAlign: "center", color: "var(--ink)" },

  nameWrap: { display: "flex", flexDirection: "column", gap: 7 },
  nameInput: { border: "none", borderBottom: "1px solid var(--line)", background: "transparent", padding: "8px 2px", fontSize: 18, color: "var(--ink)", outline: "none" },

  stagingHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  stagingCount: { fontStyle: "italic", fontSize: 16, color: "var(--ink-soft)" },
  clearBtn: { background: "none", border: "none", fontStyle: "italic", fontSize: 15, color: "var(--ink-soft)", textDecoration: "underline", textUnderlineOffset: 3 },

  grid: { display: "grid", gap: 7 },
  tile: { position: "relative", aspectRatio: "1 / 1", overflow: "hidden", borderRadius: "var(--radius)", background: "#ece8e1" },
  tileImg: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  tileFallback: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  playBadge: { position: "absolute", bottom: 6, left: 6, width: 22, height: 22, borderRadius: "50%", background: "rgba(22,20,18,.62)", display: "flex", alignItems: "center", justifyContent: "center" },
  tileOverlay: { position: "absolute", inset: 0, background: "rgba(22,20,18,.42)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 },
  progressTrack: { width: "62%", height: 2, background: "rgba(255,255,255,.3)", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "#fff", transition: "width .15s ease" },
  doneTick: { position: "absolute", top: 6, right: 6, width: 22, height: 22, borderRadius: "50%", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", animation: "pop .3s ease both" },

  shareBtn: { marginTop: 4, width: "100%", padding: "16px", background: "var(--ink)", color: "#fff", border: "none", borderRadius: "var(--radius)", fontSize: 17, letterSpacing: "0.02em", transition: "opacity .2s", fontFamily: "var(--serif)", fontWeight: 500 },

  galleryTitle: { fontFamily: "var(--script)", fontWeight: 400, fontSize: 46, textAlign: "center", margin: "4px 0 0", color: "var(--ink)" },
  gallerySub: { textAlign: "center", fontStyle: "italic", fontSize: 15, color: "var(--ink-soft)", margin: "2px 0 0" },

  footer: { marginTop: 54, paddingTop: 26, borderTop: "1px solid var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  script: { fontFamily: "var(--script)", fontSize: 38, color: "var(--ink)", lineHeight: 1 },

  toast: { position: "fixed", left: 16, right: 16, bottom: 26, maxWidth: 420, margin: "0 auto", background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 6, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 12px 40px rgba(22,20,18,.16)", animation: "fadeUp .4s ease both", zIndex: 50 },
  toastTick: { flex: "0 0 auto", width: 34, height: 34, borderRadius: "50%", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" },

  demoNote: { position: "fixed", top: 0, left: 0, right: 0, padding: "7px 14px", background: "var(--ink)", color: "#efe9df", fontSize: 12.5, fontStyle: "italic", textAlign: "center", letterSpacing: "0.01em", zIndex: 40 }
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
