import { useState } from "react";
import { outline as apiOutline } from "../api.js";
import VerseCard from "../components/VerseCard.jsx";
import Ornament from "../components/Ornament.jsx";
import ErrorCard from "../components/ErrorCard.jsx";

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
          <header style={styles.header} className="outline-form-section">
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
            className="form-card outline-form-section"
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
          {error && <ErrorCard message={error} />}

          {/* Result */}
          {result && <OutlineResult result={result} />}

          {/* Idle state */}
          {!loading && !result && !error && (
            <div style={styles.initialEmptyState}>
              <div style={styles.initialEmptyIcon}>
                {/* Mihrab arch — where the Khateeb stands to deliver the Khutbah */}
                <svg
                  width="96"
                  height="96"
                  viewBox="0 0 96 96"
                  fill="none"
                  aria-hidden="true"
                >
                  {/* Outer dashed gold circle */}
                  <circle
                    cx="48"
                    cy="50"
                    r="38"
                    stroke="#c9a84c"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                  {/* Cardinal dots */}
                  <circle cx="48" cy="13" r="2" fill="#c9a84c" />
                  <circle cx="85" cy="50" r="2" fill="rgba(201,168,76,0.5)" />
                  <circle cx="11" cy="50" r="2" fill="rgba(201,168,76,0.5)" />
                  <circle cx="48" cy="87" r="2" fill="rgba(201,168,76,0.5)" />
                  {/* Mihrab arch body */}
                  <path
                    d="M31 80 L31 50 Q31 24 48 22 Q65 24 65 50 L65 80 Z"
                    stroke="#0c4b33"
                    strokeWidth="2"
                    fill="rgba(12,75,51,0.07)"
                    strokeLinejoin="round"
                  />
                  {/* Inner arch frame */}
                  <path
                    d="M36 80 L36 52 Q36 32 48 30 Q60 32 60 52 L60 80"
                    stroke="rgba(201,168,76,0.3)"
                    strokeWidth="1"
                    fill="none"
                  />
                  {/* Keystone 8-pointed star */}
                  <rect
                    x="43.5"
                    y="27.5"
                    width="9"
                    height="9"
                    rx="0.5"
                    fill="#c9a84c"
                    fillOpacity="0.9"
                  />
                  <rect
                    x="43.5"
                    y="27.5"
                    width="9"
                    height="9"
                    rx="0.5"
                    fill="#c9a84c"
                    fillOpacity="0.9"
                    transform="rotate(45 48 32)"
                  />
                  {/* Outline text lines inside arch */}
                  <line
                    x1="39"
                    y1="55"
                    x2="57"
                    y2="55"
                    stroke="#c9a84c"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="37"
                    y1="63"
                    x2="59"
                    y2="63"
                    stroke="rgba(201,168,76,0.6)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="40"
                    y1="71"
                    x2="56"
                    y2="71"
                    stroke="rgba(201,168,76,0.35)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="heading" style={styles.initialEmptyTitle}>
                Enter a topic to generate a structured Khutbah outline
              </p>
              <p style={styles.initialEmptyHint}>
                Choose your topic, duration, and style above to get a full
                outline with relevant Quranic verses
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

function buildOutlineText(result) {
  const lines = [];
  lines.push(result.title ?? result.topic ?? "Khutbah Outline");
  lines.push("");
  if (result.opening_verse) {
    const v = normalizeVerse(result.opening_verse);
    lines.push("Opening Verse: " + (v.verse_key ?? ""));
    if (v.translation)
      lines.push(
        String(
          typeof v.translation === "object"
            ? v.translation.text
            : v.translation,
        ),
      );
    lines.push("");
  }
  if (result.sections) {
    result.sections.forEach((section, si) => {
      lines.push(`Section ${si + 1}: ${section.title}`);
      if (section.talking_points) {
        section.talking_points.forEach((pt, pi) => {
          lines.push(`  ${pi + 1}. ${pt}`);
        });
      }
      if (section.verses) {
        section.verses.forEach((v) => {
          const nv = normalizeVerse(v);
          lines.push(
            `  [${nv.verse_key ?? ""}] ${typeof nv.translation === "object" ? nv.translation?.text : (nv.translation ?? "")}`,
          );
        });
      }
      lines.push("");
    });
  }
  if (result.closing_dua) {
    const v = normalizeVerse(result.closing_dua);
    lines.push("Closing Du'ā': " + (v.verse_key ?? ""));
    if (v.translation)
      lines.push(
        String(
          typeof v.translation === "object"
            ? v.translation.text
            : v.translation,
        ),
      );
  }
  return lines.join("\n");
}

function OutlineResult({ result }) {
  const totalVerses = countVerses(result);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = buildOutlineText(result);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div
      style={resultStyles.container}
      className="fade-in outline-result-print"
    >
      {/* Warning banner */}
      {result.warning && (
        <div style={resultStyles.warningBanner} role="alert">
          <span style={resultStyles.warningIcon}>⚠</span>
          <p style={resultStyles.warningText}>{result.warning}</p>
        </div>
      )}

      {/* Title row with action buttons */}
      <div style={resultStyles.titleRow}>
        <h2 className="heading" style={resultStyles.outlineTitle}>
          {result.title ?? result.topic}
        </h2>
        <div style={resultStyles.actionButtons} className="outline-print-hide">
          <button
            onClick={handleCopy}
            style={resultStyles.actionBtn}
            title="Copy outline as plain text"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? "✓ Copied" : "Copy outline"}
          </button>
          <button
            onClick={handlePrint}
            style={resultStyles.actionBtn}
            title="Print outline"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
        </div>
      </div>

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
              {/* Section header with number + gold underline */}
              <div style={resultStyles.sectionHeader}>
                <span style={resultStyles.sectionNumber}>{si + 1}</span>
                <div style={resultStyles.sectionHeaderText}>
                  <h3 className="heading" style={resultStyles.sectionTitle}>
                    {section.title}
                  </h3>
                  <div style={resultStyles.sectionRule} aria-hidden="true" />
                </div>
              </div>

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

              {/* Supporting verses — parchment inset cards */}
              {section.verses && section.verses.length > 0 && (
                <div style={resultStyles.sectionVerses}>
                  <p style={resultStyles.versesLabel}>Supporting Verses</p>
                  {section.verses.map((v, vi) => {
                    const nv = normalizeVerse(v);
                    return (
                      <div key={vi} style={resultStyles.supportingVerseInset}>
                        {nv.verse_key && (
                          <span style={resultStyles.insetVerseKey}>
                            {nv.verse_key}
                          </span>
                        )}
                        {nv.text_arabic && (
                          <p
                            className="arabic"
                            style={resultStyles.insetArabic}
                            lang="ar"
                          >
                            {nv.text_arabic}
                          </p>
                        )}
                        {nv.translation && (
                          <p style={resultStyles.insetTranslation}>
                            {typeof nv.translation === "object"
                              ? nv.translation?.text
                              : nv.translation}
                          </p>
                        )}
                        {v.rationale && (
                          <p style={resultStyles.rationale}>{v.rationale}</p>
                        )}
                      </div>
                    );
                  })}
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
  titleRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  outlineTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 36,
    fontWeight: 600,
    color: "var(--emerald-deep)",
    lineHeight: 1.2,
    flex: 1,
  },
  actionButtons: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
    alignItems: "center",
  },
  actionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    background: "var(--parchment)",
    border: "1px solid var(--gold)",
    borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    color: "var(--emerald-deep)",
    cursor: "pointer",
    transition: "background 0.2s ease",
  },
  section: {
    marginBottom: 28,
  },
  sectionCard: {
    background: "var(--warm-white)",
    border: "1px solid rgba(201, 168, 76, 0.2)",
    borderRadius: 20,
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
    boxShadow: "0 2px 12px rgba(12, 75, 51, 0.04)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
  },
  sectionNumber: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 52,
    fontWeight: 700,
    color: "var(--gold)",
    lineHeight: 1,
    flexShrink: 0,
    opacity: 0.7,
    marginTop: -4,
  },
  sectionHeaderText: {
    flex: 1,
    paddingTop: 6,
  },
  sectionTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 26,
    fontWeight: 600,
    color: "var(--emerald-deep)",
    lineHeight: 1.25,
    marginBottom: 10,
  },
  sectionRule: {
    height: 2,
    background: "linear-gradient(90deg, var(--gold), transparent)",
    borderRadius: 1,
    width: "100%",
  },
  talkingPoints: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    paddingLeft: 0,
    listStyle: "none",
  },
  talkingPoint: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
  },
  talkingPointNum: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "var(--emerald)",
    color: "white",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
    marginTop: 1,
  },
  talkingPointText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    color: "var(--ink-soft)",
    lineHeight: 1.75,
    flex: 1,
  },
  sectionVerses: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  versesLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "var(--gold)",
    marginBottom: 4,
  },
  supportingVerseInset: {
    background: "var(--parchment)",
    border: "1px solid rgba(201, 168, 76, 0.25)",
    borderRadius: 12,
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  insetVerseKey: {
    display: "inline-block",
    padding: "3px 10px",
    background: "var(--gold)",
    color: "var(--emerald-deep)",
    borderRadius: 20,
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    alignSelf: "flex-start",
  },
  insetArabic: {
    fontFamily: "'Amiri', serif",
    fontSize: 20,
    lineHeight: 2,
    color: "var(--ink)",
    textAlign: "right",
    direction: "rtl",
  },
  insetTranslation: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 16,
    color: "var(--ink-soft)",
    lineHeight: 1.7,
  },
  rationale: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 14,
    color: "var(--gold)",
    lineHeight: 1.6,
    borderTop: "1px solid rgba(201, 168, 76, 0.2)",
    paddingTop: 8,
    marginTop: 4,
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
  initialEmptyState: {
    background: "var(--parchment)",
    border: "1px solid var(--gold)",
    borderRadius: 20,
    padding: "60px 40px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  initialEmptyIcon: {
    width: 96,
    height: 96,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  initialEmptyTitle: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 24,
    fontWeight: 600,
    color: "var(--emerald-deep)",
  },
  initialEmptyHint: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    color: "var(--ink-muted)",
    maxWidth: 420,
    lineHeight: 1.6,
    margin: "0 auto",
  },
};
