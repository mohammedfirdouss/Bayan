import { useState } from "react";
import { verify as apiVerify } from "../api.js";
import VerseCard from "../components/VerseCard.jsx";
import Ornament from "../components/Ornament.jsx";

export default function Verify() {
  const [text, setText] = useState("");
  const [lang, setLang] = useState("arabic"); // 'arabic' | 'english'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body = {
        text: text.trim(),
        language: lang,
      };
      const data = await apiVerify(body);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const statusInfo = result
    ? getStatusInfo(result.status ?? result.match_status)
    : null;

  return (
    <div style={styles.page} className="geo-bg">
      <div style={styles.inner}>
        {/* Page header */}
        <header style={styles.header}>
          <div style={styles.sectionLabel}>CITATION VERIFICATION</div>
          <h1 className="heading page-title" style={styles.title}>
            Verify a Quranic Citation
          </h1>
          <p style={styles.subtitle}>
            Confirm whether a verse citation is accurate, paraphrased, or not
            found in the corpus
          </p>
          <Ornament />
        </header>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={styles.form}
          className="form-card"
          noValidate
        >
          {/* Language toggle */}
          <div style={styles.langRow}>
            <span style={styles.controlLabel}>Language</span>
            <div
              style={styles.langToggle}
              role="group"
              aria-label="Select text language"
            >
              <button
                type="button"
                onClick={() => setLang("arabic")}
                style={getLangBtnStyle(lang === "arabic")}
                aria-pressed={lang === "arabic"}
              >
                العربية
              </button>
              <button
                type="button"
                onClick={() => setLang("english")}
                style={getLangBtnStyle(lang === "english")}
                aria-pressed={lang === "english"}
              >
                English
              </button>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              lang === "arabic"
                ? "أدخل النص القرآني هنا…"
                : "Enter the Quranic text or citation here…"
            }
            style={{
              ...styles.textarea,
              fontFamily:
                lang === "arabic" ? "'Amiri', serif" : "'DM Sans', sans-serif",
              fontSize: lang === "arabic" ? 22 : 16,
              direction: lang === "arabic" ? "rtl" : "ltr",
              textAlign: lang === "arabic" ? "right" : "left",
            }}
            rows={5}
            lang={lang === "arabic" ? "ar" : "en"}
            aria-label="Citation text to verify"
          />

          <button
            type="submit"
            disabled={loading || !text.trim()}
            style={{
              ...styles.cta,
              opacity: loading || !text.trim() ? 0.6 : 1,
              cursor: loading || !text.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Verifying…" : "Verify Citation"}
          </button>
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

        {/* Result panel */}
        {result && statusInfo && (
          <div style={styles.resultPanel}>
            {/* Status badge */}
            <div
              style={{
                ...styles.statusBadge,
                background: statusInfo.bg,
                color: statusInfo.color,
              }}
            >
              <span style={styles.statusIcon}>{statusInfo.icon}</span>
              <span style={styles.statusText}>{statusInfo.label}</span>
            </div>

            {/* Confidence bar */}
            {result.confidence != null && (
              <div style={styles.confidenceSection}>
                <div style={styles.confidenceHeader}>
                  <span style={styles.confidenceLabel}>Confidence</span>
                  <span style={styles.confidenceValue}>
                    {Math.round(result.confidence * 100)}%
                  </span>
                </div>
                <div style={styles.confidenceTrack}>
                  <div
                    style={{
                      ...styles.confidenceFill,
                      width: `${Math.round(result.confidence * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <Ornament style={{ margin: "16px auto" }} />

            {/* Matched verse */}
            {result.matched_verse && (
              <div style={{ marginBottom: 20 }}>
                <VerseCard
                  {...result.matched_verse}
                  match_type={result.status ?? result.match_status}
                  simplified
                />
              </div>
            )}

            {/* Analysis */}
            {result.analysis && (
              <blockquote style={styles.analysisBlock}>
                <p style={styles.analysisText}>{result.analysis}</p>
              </blockquote>
            )}
          </div>
        )}

        {/* Idle state */}
        {!loading && !result && !error && (
          <div style={styles.idleState}>
            <Ornament />
            <p className="heading" style={styles.idleText}>
              Enter a verse or citation above to verify its accuracy
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusInfo(status) {
  switch (status) {
    case "verified_exact":
      return {
        bg: "var(--emerald-deep)",
        color: "var(--gold-glow)",
        icon: "✓",
        label: "Verified — Exact Match",
      };
    case "verified_paraphrase":
      return {
        bg: "#92681A",
        color: "#FFF8E1",
        icon: "~",
        label: "Verified — Paraphrase",
      };
    case "not_found":
      return {
        bg: "#7B1818",
        color: "#FFE4E4",
        icon: "✗",
        label: "Not Found in Corpus",
      };
    default:
      return {
        bg: "var(--parchment-dark)",
        color: "var(--ink-soft)",
        icon: "?",
        label: status ?? "Unknown status",
      };
  }
}

function getLangBtnStyle(active) {
  return {
    padding: "7px 20px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    fontFamily:
      active && "'Amiri', serif" ? "'Amiri', serif" : "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    background: active ? "var(--emerald-deep)" : "transparent",
    color: active ? "var(--parchment)" : "var(--ink-soft)",
    transition: "background 0.2s ease, color 0.2s ease",
  };
}

const styles = {
  page: {
    minHeight: "calc(100vh - 64px)",
    padding: "48px 24px 80px",
  },
  inner: {
    maxWidth: 760,
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: 40,
  },
  sectionLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.15em",
    color: "var(--gold)",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 44,
    fontWeight: 600,
    color: "var(--emerald-deep)",
    lineHeight: 1.15,
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
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    marginBottom: 32,
    boxShadow: "0 2px 20px rgba(12, 75, 51, 0.06)",
  },
  langRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  controlLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ink-muted)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    flexShrink: 0,
  },
  langToggle: {
    display: "flex",
    background: "var(--parchment)",
    borderRadius: 24,
    padding: 3,
    gap: 2,
  },
  textarea: {
    width: "100%",
    padding: "16px 18px",
    borderRadius: 12,
    border: "1px solid rgba(201, 168, 76, 0.3)",
    background: "var(--cream)",
    color: "var(--ink)",
    lineHeight: 1.8,
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s ease",
  },
  cta: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    background: "var(--emerald-deep)",
    color: "var(--parchment)",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    fontSize: 16,
    letterSpacing: "0.04em",
    border: "none",
    transition: "background 0.2s ease, box-shadow 0.2s ease",
    boxShadow: "0 4px 16px rgba(12, 75, 51, 0.2)",
  },
  errorCard: {
    background: "var(--parchment)",
    border: "1px solid rgba(180, 60, 60, 0.3)",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 24,
    color: "#7B1818",
  },
  resultPanel: {
    background: "var(--warm-white)",
    borderRadius: 20,
    border: "1px solid rgba(201, 168, 76, 0.2)",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    boxShadow: "0 2px 20px rgba(12, 75, 51, 0.06)",
    animation: "fadeUp 0.4s ease forwards",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 20px",
    borderRadius: 12,
    width: "100%",
  },
  statusIcon: {
    fontSize: 20,
    fontWeight: 700,
    lineHeight: 1,
  },
  statusText: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: "0.03em",
  },
  confidenceSection: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  confidenceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confidenceLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ink-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  confidenceValue: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--emerald-deep)",
  },
  confidenceTrack: {
    height: 6,
    background: "var(--parchment-dark)",
    borderRadius: 3,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    background: "var(--gold)",
    borderRadius: 3,
    transition: "width 0.6s ease",
  },
  analysisBlock: {
    background: "var(--parchment)",
    borderRadius: 12,
    padding: "20px 24px",
    borderLeft: "3px solid var(--gold)",
  },
  analysisText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 18,
    color: "var(--ink-soft)",
    lineHeight: 1.75,
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
