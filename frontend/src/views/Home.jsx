import { useEffect, useRef } from "react";
import Ornament from "../components/Ornament";

const GEO_BG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cpath d='M60 0L120 60L60 120L0 60Z' fill='none' stroke='%23C9A84C' stroke-width='0.5'/%3E%3Cpath d='M60 20L100 60L60 100L20 60Z' fill='none' stroke='%23C9A84C' stroke-width='0.5'/%3E%3Cpath d='M60 40L80 60L60 80L40 60Z' fill='none' stroke='%23C9A84C' stroke-width='0.5'/%3E%3Ccircle cx='60' cy='60' r='8' fill='none' stroke='%23C9A84C' stroke-width='0.3'/%3E%3C/svg%3E")`;

export default function Home({ onNavigate }) {
  const fadeRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("visible");
        }),
      { threshold: 0.12 },
    );
    fadeRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const addRef = (el) => {
    if (el && !fadeRefs.current.includes(el)) fadeRefs.current.push(el);
  };

  return (
    <div style={{ paddingTop: 64 }}>
      {/* ── HERO ── */}
      <section style={s.hero}>
        <div style={{ ...s.geoBg, opacity: 0.08 }} />
        <div style={s.heroGlow} />
        <div style={s.heroContent}>
          <p style={s.bismillah} className="bismillah-text">بِسْمِ اللهِ الرَّحْمَنِ الرَّحِيمِ</p>
          <h1 style={s.heroTitle} className="hero-title">
            Prepare Your Khutbah
            <br />
            with{" "}
            <em style={{ color: "var(--gold)", fontStyle: "italic" }}>
              Certainty
            </em>
          </h1>
          <p style={s.heroSub} className="hero-subtitle">
            The AI-powered preparation companion for Khateebs.
            <br />
            Verify citations. Discover ayat by meaning. Structure your message.
            <br />
            Step onto the mimbar with confidence.
          </p>
          <p style={s.heroAyah}>
            "...a clarification of all things" — Quran 16:89
          </p>
          <button onClick={() => onNavigate("search")} style={s.heroCta} className="hero-cta">
            Start Searching
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div style={s.scrollIndicator}>
          <div style={s.scrollLine} />
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section
        ref={addRef}
        style={{ ...s.section, ...s.sectionCream }}
        className="fade-section home-section"
      >
        <p style={s.label}>The Problem</p>
        <h2 style={s.sectionTitle}>
          Khutbah Preparation
          <br />
          Takes Too Long
        </h2>
        <p style={s.sectionBody}>
          Hours spent searching Quran apps, verifying authenticity across
          multiple websites, cross-referencing scholarly opinions — all before
          you've shaped your message.
        </p>
        <div style={s.painGrid}>
          {[
            {
              icon: "📖",
              title: "Scattered Sources",
              body: "Jumping between Quran apps, sunnah.com, Dorar.net, and physical books just to compile references for a single Khutbah.",
            },
            {
              icon: "⚖️",
              title: "Authentication Anxiety",
              body: "Is that hadith sahih or da'if? Misquoting from the mimbar erodes trust with the congregation. Verification takes time.",
            },
            {
              icon: "⏱️",
              title: "Lost Focus",
              body: "The best part of preparation — crafting the spiritual message — gets crowded out by citation logistics.",
            },
          ].map((p, i) => (
            <div
              key={i}
              ref={addRef}
              style={s.painCard}
              className="fade-section pain-card"
            >
              <div style={s.painIcon}>{p.icon}</div>
              <h3 style={s.painTitle}>{p.title}</h3>
              <p style={s.painBody}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHAT IS BAYAN ── */}
      <section
        className="home-section"
        style={{
          ...s.section,
          background: "var(--parchment)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ ...s.geoBg, opacity: 0.04 }} />
        <div style={s.whatInner}>
          <div ref={addRef} style={s.whatText} className="fade-section">
            <p style={s.label}>What is Bayan</p>
            <h2 style={{ ...s.sectionTitle, textAlign: "left" }}>
              Your Scholarly
              <br />
              Research Assistant
            </h2>
            <p style={{ ...s.sectionBody, margin: 0 }}>
              Bayan is an AI-powered preparation tool for Khateebs and scholars.
              Enter your Khutbah topic or a verse you half-remember — Bayan
              searches the full Quran corpus by meaning, verifies citations, and
              structures an outline.
            </p>
            <br />
            <p style={{ ...s.sectionBody, margin: 0 }}>
              It does not write your Khutbah. Your voice, your reasoning, your
              pastoral wisdom remain entirely yours. Bayan handles the research.
            </p>
            <Ornament style={{ justifyContent: "flex-start", marginTop: 32 }} />
          </div>

          <div ref={addRef} style={s.demoBox} className="fade-section">
            <div style={s.demoHeader}>
              <div style={s.demoDot} />
              <div style={{ ...s.demoDot, opacity: 0.5 }} />
              <div style={{ ...s.demoDot, opacity: 0.3 }} />
              <span style={s.demoLabel}>Bayan · Live Preview</span>
            </div>
            <div style={s.demoInput}>
              <div style={s.demoInputLabel}>Khutbah Topic</div>
              <div style={s.demoInputText}>
                "Patience during hardship and trusting in Allah's plan"
              </div>
            </div>
            {[
              {
                ref: "Quran · Al-Baqarah 2:155",
                arabic:
                  "وَلَنَبْلُوَنَّكُم بِشَيْءٍ مِّنَ الْخَوْفِ وَالْجُوعِ وَنَقْصٍ مِّنَ الْأَمْوَالِ وَالْأَنفُسِ وَالثَّمَرَاتِ",
                trans:
                  '"And We will surely test you with something of fear and hunger and a loss of wealth and lives and fruits..."',
              },
              {
                ref: "Quran · Az-Zumar 39:10",
                arabic:
                  "إِنَّمَا يُوَفَّى الصَّابِرُونَ أَجْرَهُم بِغَيْرِ حِسَابٍ",
                trans:
                  '"Indeed, the patient will be given their reward without account."',
              },
            ].map((r, i) => (
              <div key={i} style={s.demoResult}>
                <div style={s.demoResultRef}>{r.ref}</div>
                <div style={s.demoArabic}>{r.arabic}</div>
                <div style={s.demoTrans}>{r.trans}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section
        ref={addRef}
        style={{ ...s.section, ...s.sectionCream, textAlign: "center" }}
        className="fade-section home-section"
      >
        <p style={s.label}>Core Features</p>
        <h2 style={s.sectionTitle}>Source. Verify. Structure.</h2>
        <p style={s.sectionBody}>
          Three pillars that transform how you prepare.
        </p>
        <div style={s.featuresGrid}>
          {[
            {
              n: "1",
              title: "Search",
              body: "Semantic search across the full Quran. Finds ayat by meaning — not just keywords. Discovers connections you might have missed.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="1.5"
                  width="28"
                  height="28"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
                </svg>
              ),
              action: "search",
            },
            {
              n: "2",
              title: "Verify",
              body: "Paste any Arabic or English text — Bayan checks whether it matches a verse in the corpus, with exact reference and confidence score.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="1.5"
                  width="28"
                  height="28"
                >
                  <path d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              ),
              action: "verify",
            },
            {
              n: "3",
              title: "Outline",
              body: "Enter your Khutbah topic and receive a full structured outline — opening verse, thematic sections with talking points, supporting ayat, and closing du'ā.",
              icon: (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--gold)"
                  strokeWidth="1.5"
                  width="28"
                  height="28"
                >
                  <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
                </svg>
              ),
              action: "outline",
            },
          ].map((f, i) => (
            <div
              key={i}
              ref={addRef}
              style={s.featureCard}
              className="fade-section feature-card"
              onClick={() => onNavigate(f.action)}
            >
              <span style={s.featureNumber}>{f.n}</span>
              <div style={s.featureIcon}>{f.icon}</div>
              <h3 style={s.featureTitle}>{f.title}</h3>
              <p style={s.featureBody}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMMITMENT ── */}
      <section
        className="home-section"
        style={{
          ...s.section,
          background: "var(--emerald-deep)",
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ ...s.geoBg, opacity: 0.05 }} />
        <p style={{ ...s.label, color: "var(--gold-glow)" }}>Our Commitment</p>
        <h2 style={{ ...s.sectionTitle, color: "var(--parchment)" }}>
          Built to Assist, Not Replace
        </h2>
        <p style={{ ...s.sectionBody, color: "rgba(247,242,232,0.7)" }}>
          Bayan serves the Khateeb's existing practice. It does not change it.
        </p>
        <div style={s.notGrid}>
          {[
            {
              yes: true,
              text: (
                <>
                  <strong>Surfaces verified verses</strong> from the Quran
                  corpus with exact references
                </>
              ),
            },
            {
              yes: false,
              text: (
                <>
                  <strong>Does not generate</strong> Khutbah content — your
                  words remain your own
                </>
              ),
            },
            {
              yes: true,
              text: (
                <>
                  <strong>Returns tafsir excerpts</strong> attributed to named
                  scholars (Ibn Kathir, al-Sa'di)
                </>
              ),
            },
            {
              yes: false,
              text: (
                <>
                  <strong>Does not offer opinions</strong> — only
                  corpus-retrieved text is shown
                </>
              ),
            },
          ].map((item, i) => (
            <div
              key={i}
              ref={addRef}
              style={s.notItem}
              className="fade-section"
            >
              <div
                style={{ ...s.notCheck, ...(item.yes ? s.notYes : s.notNo) }}
              >
                {item.yes ? "✓" : "✗"}
              </div>
              <p
                style={{
                  fontSize: 15,
                  color: "rgba(247,242,232,0.85)",
                  lineHeight: 1.5,
                }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ROADMAP ── */}
      <section
        ref={addRef}
        style={{
          ...s.section,
          background: "var(--parchment)",
          textAlign: "center",
        }}
        className="fade-section home-section"
      >
        <p style={s.label}>Roadmap</p>
        <h2 style={s.sectionTitle}>Growing With the Ummah</h2>
        <p style={s.sectionBody}>
          Bayan starts with Khutbah preparation and grows into a full scholarly
          companion.
        </p>
        <div style={s.roadmapTrack}>
          {[
            {
              num: "١",
              title: "Khateeb Preparation Tool",
              body: "Semantic Quran search, citation verification, Khutbah outline generation with Ibn Kathir tafsir.",
              tag: "now",
              tagLabel: "Building Now",
            },
            {
              num: "٢",
              title: "Hadith Search & Grading",
              body: "Search the six major hadith collections by meaning, with authenticity grading from classical scholars.",
              tag: "next",
              tagLabel: "Next",
            },
            {
              num: "٣",
              title: "Post-Khutbah Recap",
              body: "AI-generated summaries with every ayah cited, sent to congregants after Jumu'ah.",
              tag: "next",
              tagLabel: "Next",
            },
            {
              num: "٤",
              title: "Halaqah Live Display",
              body: "Real-time projection of ayat as the teacher speaks during study circles.",
              tag: "later",
              tagLabel: "Later",
            },
          ].map((item, i) => (
            <div
              key={i}
              ref={addRef}
              style={{
                ...s.roadmapItem,
                ...(i === 0 ? s.roadmapItemActive : {}),
              }}
              className="fade-section"
            >
              <div
                style={{
                  ...s.roadmapDot,
                  ...(i === 0 ? s.roadmapDotActive : {}),
                }}
              >
                {item.num}
              </div>
              <div style={{ textAlign: "left" }}>
                <h3 style={s.roadmapTitle}>{item.title}</h3>
                <p style={s.roadmapBody}>{item.body}</p>
                <span
                  style={{
                    ...s.roadmapTag,
                    ...(item.tag === "now"
                      ? s.tagNow
                      : item.tag === "next"
                        ? s.tagNext
                        : s.tagLater),
                  }}
                >
                  {item.tagLabel}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={s.footerBrand}>بيان</div>
        <p style={s.footerSub}>Bayan — The Khateeb's Preparation Companion</p>
        <div style={s.footerLinks}>
          {["Search", "Verify", "Outline"].map((v) => (
            <button
              key={v}
              onClick={() => onNavigate(v.toLowerCase())}
              style={s.footerLink}
            >
              {v}
            </button>
          ))}
        </div>
        <p style={s.footerCopy}>Built for the Khateebs of the Ummah</p>
      </footer>

      <style>{`
        .fade-section { opacity: 0; transform: translateY(24px); transition: opacity 0.6s cubic-bezier(0.23,1,0.32,1), transform 0.6s cubic-bezier(0.23,1,0.32,1); }
        .fade-section.visible { opacity: 1; transform: translateY(0); }
        .pain-card { transition: transform 280ms cubic-bezier(0.23,1,0.32,1), box-shadow 280ms ease, border-color 180ms ease !important; }
        .pain-card:hover { border-color: var(--gold) !important; box-shadow: 0 8px 32px rgba(12,75,51,0.07) !important; transform: translateY(-3px) !important; }
        .feature-card { cursor: pointer; transition: transform 280ms cubic-bezier(0.23,1,0.32,1), box-shadow 280ms ease, border-color 180ms ease !important; }
        .feature-card:hover { transform: translateY(-3px) !important; box-shadow: 0 12px 36px rgba(12,75,51,0.09) !important; border-color: var(--gold) !important; }
        .hero-cta { transition: transform 160ms ease-out, box-shadow 200ms ease !important; }
        .hero-cta:hover { box-shadow: 0 8px 24px rgba(201,168,76,0.35) !important; transform: translateY(-1px) !important; }
        .hero-cta:active { transform: scale(0.97) !important; box-shadow: none !important; }
        @keyframes scrollPulse { 0%,100%{opacity:.3;transform:scaleY(1)} 50%{opacity:.8;transform:scaleY(1.2)} }
      `}</style>
    </div>
  );
}

const s = {
  geoBg: {
    position: "absolute",
    inset: 0,
    backgroundImage: GEO_BG,
    backgroundSize: "120px 120px",
    pointerEvents: "none",
  },
  hero: {
    position: "relative",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "140px 24px 100px",
    background:
      "linear-gradient(175deg, var(--emerald-deep) 0%, #0A3D2A 45%, #072E20 100%)",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(201,168,76,0.14) 0%, transparent 70%)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%,-50%)",
    pointerEvents: "none",
  },
  heroContent: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  bismillah: {
    fontFamily: "'Amiri', serif",
    fontSize: 30,
    color: "var(--gold)",
    marginBottom: 40,
    direction: "rtl",
    animation: "fadeUp 0.65s cubic-bezier(0.23,1,0.32,1) 0.15s both",
  },
  heroTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "clamp(44px, 7vw, 82px)",
    fontWeight: 700,
    color: "var(--parchment)",
    lineHeight: 1.1,
    maxWidth: 780,
    marginBottom: 24,
    animation: "fadeUp 0.65s cubic-bezier(0.23,1,0.32,1) 0.28s both",
  },
  heroSub: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "clamp(17px, 2.2vw, 22px)",
    color: "rgba(247,242,232,0.75)",
    maxWidth: 560,
    lineHeight: 1.7,
    marginBottom: 12,
    animation: "fadeUp 0.65s cubic-bezier(0.23,1,0.32,1) 0.4s both",
  },
  heroAyah: {
    fontFamily: "'Amiri', serif",
    fontSize: 15,
    color: "var(--gold-glow)",
    opacity: 0.75,
    marginBottom: 48,
    animation: "fadeUp 0.65s cubic-bezier(0.23,1,0.32,1) 0.5s both",
  },
  heroCta: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 40px",
    background: "var(--gold)",
    color: "var(--emerald-deep)",
    fontWeight: 600,
    fontSize: 16,
    fontFamily: "'DM Sans', sans-serif",
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    animation: "fadeUp 0.65s cubic-bezier(0.23,1,0.32,1) 0.6s both",
  },
  scrollIndicator: {
    position: "absolute",
    bottom: 32,
    left: "50%",
    transform: "translateX(-50%)",
  },
  scrollLine: {
    width: 1,
    height: 44,
    background: "linear-gradient(to bottom, var(--gold), transparent)",
    animation: "scrollPulse 2s ease infinite",
  },

  section: {
    position: "relative",
    padding: "100px 24px",
    textAlign: "center",
  },
  sectionCream: { background: "var(--cream)" },
  label: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "3px",
    textTransform: "uppercase",
    color: "var(--gold)",
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: "clamp(30px, 4vw, 46px)",
    fontWeight: 600,
    color: "var(--emerald-deep)",
    lineHeight: 1.2,
    marginBottom: 18,
  },
  sectionBody: {
    fontSize: 17,
    lineHeight: 1.8,
    color: "var(--ink-soft)",
    maxWidth: 620,
    margin: "0 auto",
  },

  painGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 24,
    maxWidth: 960,
    margin: "56px auto 0",
  },
  painCard: {
    background: "var(--warm-white)",
    border: "1px solid rgba(201,168,76,0.2)",
    borderRadius: 16,
    padding: "36px 28px",
    textAlign: "left",
  },
  painIcon: { fontSize: 32, marginBottom: 16 },
  painTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
    color: "var(--emerald-deep)",
    marginBottom: 10,
  },
  painBody: { fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.7 },

  whatInner: {
    maxWidth: 1000,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 72,
    alignItems: "center",
    position: "relative",
  },
  whatText: { textAlign: "left" },

  demoBox: {
    background: "var(--emerald-deep)",
    borderRadius: 20,
    padding: 32,
    boxShadow: "0 24px 64px rgba(12,75,51,0.22)",
    overflow: "hidden",
  },
  demoHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
    paddingBottom: 14,
    borderBottom: "1px solid rgba(201,168,76,0.18)",
  },
  demoDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "var(--gold)",
  },
  demoLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    color: "var(--gold-glow)",
    marginLeft: 8,
    fontWeight: 500,
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  demoInput: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(201,168,76,0.2)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  demoInputLabel: {
    fontSize: 10,
    color: "var(--gold)",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    marginBottom: 6,
    fontFamily: "'DM Sans', sans-serif",
  },
  demoInputText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 17,
    color: "var(--parchment)",
    fontStyle: "italic",
    lineHeight: 1.5,
  },
  demoResult: {
    background: "rgba(201,168,76,0.07)",
    border: "1px solid rgba(201,168,76,0.14)",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  demoResultRef: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    color: "var(--gold)",
    letterSpacing: "1px",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  demoArabic: {
    fontFamily: "'Amiri', serif",
    fontSize: 18,
    color: "var(--parchment)",
    direction: "rtl",
    lineHeight: 1.9,
    marginBottom: 6,
  },
  demoTrans: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 14,
    color: "rgba(247,242,232,0.65)",
    fontStyle: "italic",
    lineHeight: 1.5,
  },

  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 28,
    maxWidth: 1000,
    margin: "56px auto 0",
  },
  featureCard: {
    background: "var(--warm-white)",
    border: "1px solid rgba(201,168,76,0.15)",
    borderRadius: 20,
    padding: "44px 30px 36px",
    textAlign: "center",
    position: "relative",
  },
  featureNumber: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 60,
    fontWeight: 700,
    color: "var(--gold)",
    opacity: 0.18,
    position: "absolute",
    top: 14,
    right: 22,
    lineHeight: 1,
  },
  featureIcon: {
    width: 54,
    height: 54,
    background: "linear-gradient(135deg, var(--emerald-deep), var(--emerald))",
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 22px",
  },
  featureTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: "var(--emerald-deep)",
    marginBottom: 10,
  },
  featureBody: { fontSize: 15, color: "var(--ink-muted)", lineHeight: 1.7 },

  notGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
    maxWidth: 800,
    margin: "44px auto 0",
    position: "relative",
    zIndex: 1,
  },
  notItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    textAlign: "left",
    padding: 20,
    background: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    border: "1px solid rgba(201,168,76,0.1)",
  },
  notCheck: {
    flexShrink: 0,
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    marginTop: 2,
  },
  notYes: { background: "rgba(26,138,101,0.3)", color: "#7DDFB8" },
  notNo: { background: "rgba(180,60,60,0.3)", color: "#E8A0A0" },

  roadmapTrack: {
    maxWidth: 680,
    margin: "56px auto 0",
    position: "relative",
    paddingLeft: 0,
  },
  roadmapItem: {
    display: "flex",
    gap: 24,
    alignItems: "flex-start",
    textAlign: "left",
    marginBottom: 36,
    position: "relative",
  },
  roadmapItemActive: {},
  roadmapDot: {
    flexShrink: 0,
    width: 50,
    height: 50,
    borderRadius: "50%",
    background: "var(--warm-white)",
    border: "2px solid var(--gold)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Amiri', serif",
    fontSize: 20,
    fontWeight: 700,
    color: "var(--emerald-deep)",
  },
  roadmapDotActive: {
    background: "var(--gold)",
    color: "var(--emerald-deep)",
    boxShadow: "0 0 0 6px rgba(201,168,76,0.18)",
  },
  roadmapTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 22,
    fontWeight: 600,
    color: "var(--emerald-deep)",
    marginBottom: 6,
  },
  roadmapBody: {
    fontSize: 15,
    color: "var(--ink-muted)",
    lineHeight: 1.6,
    marginBottom: 8,
  },
  roadmapTag: {
    display: "inline-block",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "1px",
    textTransform: "uppercase",
    padding: "4px 12px",
    borderRadius: 20,
  },
  tagNow: { background: "rgba(201,168,76,0.15)", color: "var(--gold)" },
  tagNext: {
    background: "rgba(26,138,101,0.1)",
    color: "var(--emerald-light)",
  },
  tagLater: { background: "rgba(107,104,96,0.1)", color: "var(--ink-muted)" },

  footer: {
    background: "#071E16",
    padding: "48px 24px",
    textAlign: "center",
    borderTop: "1px solid rgba(201,168,76,0.1)",
  },
  footerBrand: {
    fontFamily: "'Amiri', serif",
    fontSize: 28,
    fontWeight: 700,
    color: "var(--parchment)",
    marginBottom: 4,
  },
  footerSub: { fontSize: 13, color: "rgba(247,242,232,0.3)", marginBottom: 20 },
  footerLinks: {
    display: "flex",
    gap: 24,
    justifyContent: "center",
    marginBottom: 20,
  },
  footerLink: {
    fontSize: 13,
    color: "rgba(247,242,232,0.5)",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "color 0.2s",
  },
  footerCopy: { fontSize: 12, color: "rgba(247,242,232,0.2)" },
};
