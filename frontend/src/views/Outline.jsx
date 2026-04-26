import { useState } from "react";
import { outline as apiOutline } from "../api.js";
import VerseCard from "../components/VerseCard.jsx";
import Ornament from "../components/Ornament.jsx";

const DURATION_MARKS = [
  { value: 10, label: "Short (10 min)" },
  { value: 20, label: "Standard (20 min)" },
  { value: 45, label: "Long (45 min)" },
];

function getDurationLabel(val) {
  const mark = DURATION_MARKS.find((m) => m.value === val);
  return mark ? mark.label : `${val} min`;
}

function LoadingOverlay() {
  return (
    <div style={overlayStyles.overlay} role="status" aria-live="polite">
      <div style={overlayStyles.content}>
        {/* Rotating diamond spinner */}
        <div style={overlayStyles.spinnerWrap}>
          <div style={overlayStyles.spinner} />
        </div>
        <p className="heading" style={overlayStyles.spinnerText}>
          Searching the corpus…
        </p>
        <p style={overlayStyles.spinnerSub}>
          Generating your khutbah outline with relevant verses
        </p>
      </div>
    </div>
  );
}

const overlayStyles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 200,
    background: "rgba(247, 242, 232, 0.95)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  spinnerWrap: {
    width: 64,
    height: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: 48,
    height: 48,
    background: "var(--gold)",
    clipPath:
      "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
    animation: "spinDiamond 1.4s linear infinite",
  },
  spinnerText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 28,
    fontWeight: 500,
    color: "var(--emerald-deep)",
    animation: "pulse 2s ease-in-out infinite",
  },
  spinnerSub: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "var(--ink-muted)",
  },
};

function StyleCard({ id, label, description, icon, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      style={{
        ...styleCardStyles.card,
        ...(selected ? styleCardStyles.cardSelected : {}),
      }}
      aria-pressed={selected}
    >
      <span style={styleCardStyles.icon} aria-hidden="true">
        {icon}
      </span>
      <div style={styleCardStyles.text}>
        <div style={styleCardStyles.label}>{label}</div>
        {description && (
          <div style={styleCardStyles.description}>{description}</div>
        )}
      </div>
      {selected && (
        <span style={styleCardStyles.checkmark} aria-hidden="true">
          ✓
        </span>
      )}
    </button>
  );
}

const styleCardStyles = {
  card: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 18px",
    borderRadius: 12,
    border: "1.5px solid rgba(201, 168, 76, 0.25)",
    background: "var(--cream)",
    cursor: "pointer",
    transition:
      "border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease",
    width: "100%",
    textAlign: "left",
  },
  cardSelected: {
    borderColor: "var(--gold)",
    background: "rgba(201, 168, 76, 0.07)",
    boxShadow: "0 2px 12px rgba(201, 168, 76, 0.15)",
  },
  icon: {
    fontSize: 22,
    flexShrink: 0,
  },
  text: {
    flex: 1,
  },
  label: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 600,
    color: "var(--ink)",
  },
  description: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: "var(--ink-muted)",
    marginTop: 2,
  },
  checkmark: {
    fontSize: 14,
    color: "var(--emerald)",
    fontWeight: 700,
    flexShrink: 0,
  },
};

export default function Outline() {
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(20);
  const [khutbahStyle, setKhutbahStyle] = useState("jumuah");
  const [tafsirDepth, setTafsirDepth] = useState("brief");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body = {
        topic: topic.trim(),
        duration_minutes: duration,
        style: khutbahStyle,
        tafsir_depth: tafsirDepth,
      };
      const data = await apiOutline(body);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {loading && <LoadingOverlay />}

      <div style={styles.page} className="geo-bg">
        <div style={styles.inner}>
          {/* Header */}
          <header style={styles.header}>
            <h1 className="heading page-title" style={styles.title}>
              Khutbah Outline Generator
            </h1>
            <p style={styles.subtitle}>
              Generate a structured khutbah outline with relevant Quranic verses
            </p>
            <Ornament />
          </header>

          {/* Form — two-column on desktop */}
          <form
            onSubmit={handleSubmit}
            style={styles.form}
            className="form-card"
            noValidate
          >
            <div style={styles.formGrid}>
              {/* Left column */}
              <div style={styles.formLeft}>
                <div style={styles.fieldGroup}>
                  <label htmlFor="topic-textarea" style={styles.fieldLabel}>
                    Topic
                  </label>
                  <textarea
                    id="topic-textarea"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Patience in times of hardship"
                    style={styles.topicTextarea}
                    rows={4}
                    aria-label="Khutbah topic"
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label htmlFor="duration-slider" style={styles.fieldLabel}>
                    Duration:{" "}
                    <strong style={{ color: "var(--emerald-deep)" }}>
                      {getDurationLabel(duration)}
                    </strong>
                  </label>
                  <input
                    id="duration-slider"
                    type="range"
                    min={10}
                    max={45}
                    step={5}
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    style={styles.slider}
                    aria-valuemin={10}
                    aria-valuemax={45}
                    aria-valuenow={duration}
                  />
                  <div style={styles.sliderLabels}>
                    {DURATION_MARKS.map((m) => (
                      <span
                        key={m.value}
                        style={{
                          ...styles.sliderMark,
                          ...(duration === m.value
                            ? { color: "var(--emerald)", fontWeight: 600 }
                            : {}),
                        }}
                      >
                        {m.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right column */}
              <div style={styles.formRight}>
                <div style={styles.fieldGroup}>
                  <span style={styles.fieldLabel}>Khutbah Style</span>
                  <div style={styles.styleCards}>
                    <StyleCard
                      id="jumuah"
                      label="Friday Jumu'ah"
                      description="Two-part structure with break"
                      icon="🕌"
                      selected={khutbahStyle === "jumuah"}
                      onSelect={setKhutbahStyle}
                    />
                    <StyleCard
                      id="eid"
                      label="Eid Khutbah"
                      description="Celebratory, shorter format"
                      icon="🌙"
                      selected={khutbahStyle === "eid"}
                      onSelect={setKhutbahStyle}
                    />
                  </div>
                </div>

                <div style={styles.fieldGroup}>
                  <label htmlFor="tafsir-depth" style={styles.fieldLabel}>
                    Tafsir Depth
                  </label>
                  <select
                    id="tafsir-depth"
                    value={tafsirDepth}
                    onChange={(e) => setTafsirDepth(e.target.value)}
                    style={styles.select}
                  >
                    <option value="none">None</option>
                    <option value="brief">Brief</option>
                    <option value="full">Full</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading || !topic.trim()}
                  style={{
                    ...styles.cta,
                    opacity: loading || !topic.trim() ? 0.6 : 1,
                    cursor:
                      loading || !topic.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Generating…" : "Generate Outline"}
                </button>
              </div>
            </div>
          </form>

          {/* Error */}
          {error && (
            <div style={styles.errorCard} role="alert">
              <strong
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
              >
                Error
              </strong>
              <p
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 16,
                  marginTop: 4,
                }}
              >
                {error}
              </p>
            </div>
          )}

          {/* Result */}
          {result && <OutlineResult result={result} />}

          {/* Idle state */}
          {!loading && !result && !error && (
            <div style={styles.idleState}>
              <Ornament />
              <p className="heading" style={styles.idleText}>
                Enter a topic above to generate a structured khutbah outline
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Spinner animation */}
      <style>{`
        @keyframes spinDiamond {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}

function OutlineResult({ result }) {
  const totalVerses = countVerses(result);

  return (
    <div style={resultStyles.container} className="fade-in">
      {/* Warning banner */}
      {result.warning && (
        <div style={resultStyles.warningBanner} role="alert">
          <span style={resultStyles.warningIcon}>⚠</span>
          <p style={resultStyles.warningText}>{result.warning}</p>
        </div>
      )}

      {/* Title */}
      <h2 className="heading" style={resultStyles.outlineTitle}>
        {result.title ?? result.topic}
      </h2>

      <Ornament style={{ margin: "0 auto 24px" }} />

      {/* Opening verse */}
      {result.opening_verse && (
        <section style={resultStyles.section}>
          <VerseCard
            {...normalizeVerse(result.opening_verse)}
            label="Opening Verse"
          />
        </section>
      )}

      {/* Sections */}
      {result.sections &&
        result.sections.map((section, si) => (
          <section key={si} style={resultStyles.section}>
            <div style={resultStyles.sectionCard}>
              <h3 className="heading" style={resultStyles.sectionTitle}>
                {section.title}
              </h3>

              {/* Talking points */}
              {section.talking_points && section.talking_points.length > 0 && (
                <ol style={resultStyles.talkingPoints}>
                  {section.talking_points.map((point, pi) => (
                    <li key={pi} style={resultStyles.talkingPoint}>
                      <span style={resultStyles.talkingPointNum}>{pi + 1}</span>
                      <span style={resultStyles.talkingPointText}>{point}</span>
                    </li>
                  ))}
                </ol>
              )}

              {/* Supporting verses */}
              {section.verses && section.verses.length > 0 && (
                <div style={resultStyles.sectionVerses}>
                  {section.verses.map((v, vi) => (
                    <div key={vi} style={resultStyles.supportingVerseWrap}>
                      <VerseCard {...normalizeVerse(v)} simplified />
                      {v.rationale && (
                        <p style={resultStyles.rationale}>{v.rationale}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}

      {/* Closing dua */}
      {result.closing_dua && (
        <section style={resultStyles.section}>
          <VerseCard
            {...normalizeVerse(result.closing_dua)}
            label="Closing Du'ā'"
          />
        </section>
      )}

      <Ornament style={{ margin: "24px auto 0" }} />

      {/* Footer */}
      <div style={resultStyles.footer}>
        <span>
          {totalVerses} verse{totalVerses !== 1 ? "s" : ""} cited
        </span>
        <span style={resultStyles.footerDot}>·</span>
        <span>Retrieved via corpus</span>
        <span style={resultStyles.footerDot}>·</span>
        <span>Model: claude-sonnet-4-6</span>
      </div>
    </div>
  );
}

function normalizeVerse(v) {
  if (!v) return {};
  return {
    verse_key: v.verse_key ?? v.key,
    surah_name: v.surah_name ?? v.surah,
    surah_name_arabic: v.surah_name_arabic,
    text_arabic: v.text_arabic ?? v.arabic,
    translation: v.translation ?? v.text_english ?? v.text,
    tafsir: v.tafsir,
    topics: v.topics,
    similar_verses: v.similar_verses,
    scores: v.scores,
  };
}

function countVerses(result) {
  let count = 0;
  if (result.opening_verse) count++;
  if (result.closing_dua) count++;
  if (result.sections) {
    result.sections.forEach((s) => {
      if (s.verses) count += s.verses.length;
    });
  }
  return count;
}

const resultStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  warningBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    background: "rgba(184, 134, 26, 0.12)",
    border: "1px solid rgba(184, 134, 26, 0.3)",
    borderRadius: 10,
    padding: "12px 16px",
    marginBottom: 24,
  },
  warningIcon: {
    fontSize: 16,
    color: "#92681A",
    flexShrink: 0,
    marginTop: 2,
  },
  warningText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 16,
    color: "#5A4010",
    lineHeight: 1.6,
  },
  outlineTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 36,
    fontWeight: 600,
    color: "var(--emerald-deep)",
    textAlign: "center",
    lineHeight: 1.2,
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionCard: {
    background: "var(--warm-white)",
    border: "1px solid rgba(201, 168, 76, 0.2)",
    borderRadius: 20,
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    boxShadow: "0 2px 12px rgba(12, 75, 51, 0.04)",
  },
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: "var(--emerald-deep)",
    lineHeight: 1.25,
    paddingBottom: 12,
    borderBottom: "1px solid rgba(201, 168, 76, 0.15)",
  },
  talkingPoints: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    paddingLeft: 0,
    listStyle: "none",
  },
  talkingPoint: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  talkingPointNum: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    borderRadius: "50%",
    background: "var(--gold)",
    color: "var(--emerald-deep)",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1,
  },
  talkingPointText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    color: "var(--ink-soft)",
    lineHeight: 1.65,
    flex: 1,
  },
  sectionVerses: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  supportingVerseWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  rationale: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 15,
    color: "var(--gold)",
    paddingLeft: 20,
    lineHeight: 1.6,
  },
  footer: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 8,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: "var(--ink-muted)",
    marginTop: 8,
    paddingTop: 16,
  },
  footerDot: {
    color: "var(--gold)",
  },
};

const styles = {
  page: {
    minHeight: "calc(100vh - 64px)",
    padding: "48px 24px 80px",
  },
  inner: {
    maxWidth: 1000,
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: 40,
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 48,
    fontWeight: 600,
    color: "var(--emerald-deep)",
    lineHeight: 1.1,
  },
  subtitle: {
    marginTop: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    color: "var(--ink-muted)",
  },
  form: {
    background: "var(--warm-white)",
    borderRadius: 20,
    border: "1px solid rgba(201, 168, 76, 0.2)",
    padding: "32px",
    marginBottom: 32,
    boxShadow: "0 2px 20px rgba(12, 75, 51, 0.06)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 32,
  },
  formLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  formRight: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  fieldLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ink-muted)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  topicTextarea: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(201, 168, 76, 0.3)",
    background: "var(--cream)",
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 18,
    color: "var(--ink)",
    lineHeight: 1.65,
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  slider: {
    width: "100%",
    accentColor: "var(--emerald)",
    cursor: "pointer",
  },
  sliderLabels: {
    display: "flex",
    justifyContent: "space-between",
  },
  sliderMark: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    color: "var(--ink-muted)",
    textAlign: "center",
    flex: 1,
  },
  styleCards: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  select: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(201, 168, 76, 0.3)",
    background: "var(--cream)",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "var(--ink)",
    outline: "none",
    cursor: "pointer",
    width: "100%",
  },
  cta: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    background: "var(--gold)",
    color: "var(--emerald-deep)",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 700,
    fontSize: 16,
    letterSpacing: "0.04em",
    border: "none",
    transition: "background 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 4px 16px rgba(201, 168, 76, 0.3)",
    marginTop: 8,
  },
  errorCard: {
    background: "var(--parchment)",
    border: "1px solid rgba(180, 60, 60, 0.3)",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 24,
    color: "#7B1818",
  },
  idleState: {
    textAlign: "center",
    padding: "40px 0",
  },
  idleText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 20,
    color: "var(--ink-muted)",
  },
};
