import { useState } from "react";

const TAFSIR_TRUNCATE = 300;

export default function VerseCard({
  verse_key,
  surah_name,
  surah_name_arabic,
  text_arabic,
  translation,
  tafsir,
  topics,
  similar_verses,
  scores,
  label,
  match_type,
  simplified,
  style,
  index = 0,
}) {
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [tafsirExpanded, setTafsirExpanded] = useState(false);

  const hybridScore =
    scores?.hybrid != null
      ? Math.round(scores.hybrid * 100)
      : scores?.hybrid_score != null
        ? Math.round(scores.hybrid_score * 100)
        : scores?.score != null
          ? Math.round(scores.score * 100)
          : null;

  const tafsirText = tafsir?.text_plain || tafsir?.text || null;

  const tafsirTruncated =
    tafsirText && tafsirText.length > TAFSIR_TRUNCATE && !tafsirExpanded
      ? tafsirText.slice(0, TAFSIR_TRUNCATE) + "…"
      : tafsirText;

  return (
    <article
      className="fade-in"
      style={{
        ...cardStyles.card,
        animationDelay: `${index * 80}ms`,
        ...style,
      }}
    >
      {/* Label pill (e.g. "Opening Verse") */}
      {label && (
        <div style={cardStyles.labelRow}>
          <span style={cardStyles.labelPill}>{label}</span>
        </div>
      )}

      {/* Top row */}
      <div style={cardStyles.topRow}>
        <div style={cardStyles.metaGroup}>
          {verse_key && (
            <span style={cardStyles.verseKeyBadge} className="heading">
              {verse_key}
            </span>
          )}
          {(surah_name || surah_name_arabic) && (
            <div style={cardStyles.surahNames}>
              {surah_name && (
                <span style={cardStyles.surahEnglish}>{surah_name}</span>
              )}
              {surah_name_arabic && (
                <span className="arabic" style={cardStyles.surahArabic}>
                  {surah_name_arabic}
                </span>
              )}
            </div>
          )}
          {match_type && (
            <span style={getMatchBadgeStyle(match_type)}>
              {formatMatchType(match_type)}
            </span>
          )}
        </div>

        {hybridScore != null && (
          <span style={cardStyles.scoreBadge} title="Relevance score">
            {hybridScore}%
          </span>
        )}
      </div>

      {/* Arabic text */}
      {text_arabic && (
        <div style={cardStyles.arabicBlock}>
          <p className="arabic" style={cardStyles.arabicText} lang="ar">
            {text_arabic}
          </p>
        </div>
      )}

      {/* Translation */}
      {translation && (
        <p style={cardStyles.translation}>
          {typeof translation === "object" ? translation?.text : translation}
        </p>
      )}

      {/* Tafsir (collapsible) — hidden in simplified mode */}
      {!simplified && tafsirText && (
        <div style={cardStyles.tafsirSection}>
          <button
            onClick={() => setTafsirOpen((o) => !o)}
            style={cardStyles.tafsirToggle}
            aria-expanded={tafsirOpen}
          >
            <span>Ibn Kathir</span>
            <span
              style={{
                transition: "transform 0.2s",
                display: "inline-block",
                transform: tafsirOpen ? "rotate(90deg)" : "rotate(0deg)",
              }}
            >
              →
            </span>
          </button>
          {tafsirOpen && (
            <div style={cardStyles.tafsirBody}>
              <p style={cardStyles.tafsirText}>{tafsirTruncated}</p>
              {tafsirText.length > TAFSIR_TRUNCATE && (
                <button
                  onClick={() => setTafsirExpanded((e) => !e)}
                  style={cardStyles.readMoreBtn}
                >
                  {tafsirExpanded ? "show less" : "read more"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Topics */}
      {!simplified && topics && topics.length > 0 && (
        <div style={cardStyles.pillRow}>
          {topics.map((topic, i) => (
            <span key={i} style={cardStyles.topicPill}>
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Similar verses */}
      {!simplified && similar_verses && similar_verses.length > 0 && (
        <div style={cardStyles.similarRow}>
          <span style={cardStyles.similarLabel}>Similar:</span>
          {similar_verses.slice(0, 6).map((sv, i) => (
            <span key={i} style={cardStyles.similarChip}>
              {typeof sv === "string" ? sv : sv.verse_key || sv}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function formatMatchType(t) {
  if (t === "verified_exact") return "✓ Exact Match";
  if (t === "verified_paraphrase") return "~ Paraphrase";
  if (t === "not_found") return "✗ Not Found";
  return t;
}

function getMatchBadgeStyle(t) {
  const base = {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.02em",
  };
  if (t === "verified_exact")
    return {
      ...base,
      background: "var(--emerald-deep)",
      color: "var(--gold-glow)",
    };
  if (t === "verified_paraphrase")
    return { ...base, background: "#B8860B", color: "#FFF8E1" };
  if (t === "not_found")
    return { ...base, background: "#7B1818", color: "#FFE4E4" };
  return {
    ...base,
    background: "var(--parchment-dark)",
    color: "var(--ink-soft)",
  };
}

const cardStyles = {
  card: {
    background: "var(--warm-white)",
    border: "1px solid rgba(201, 168, 76, 0.25)",
    borderRadius: 20,
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    transition: "box-shadow 0.25s ease, transform 0.25s ease",
    cursor: "default",
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
  },
  labelPill: {
    display: "inline-block",
    padding: "4px 14px",
    background: "var(--gold)",
    color: "var(--emerald-deep)",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  topRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  metaGroup: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  verseKeyBadge: {
    display: "inline-block",
    padding: "4px 12px",
    background: "var(--gold)",
    color: "var(--emerald-deep)",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Cormorant Garamond', serif",
    letterSpacing: "0.03em",
    flexShrink: 0,
  },
  surahNames: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  surahEnglish: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: "var(--ink-soft)",
    fontWeight: 500,
  },
  surahArabic: {
    fontSize: 16,
    color: "var(--ink-muted)",
  },
  scoreBadge: {
    display: "inline-block",
    padding: "4px 12px",
    background: "var(--emerald-deep)",
    color: "var(--gold-glow)",
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    letterSpacing: "0.03em",
    flexShrink: 0,
  },
  arabicBlock: {
    background: "var(--parchment-dark)",
    borderRadius: 12,
    padding: "16px 20px",
  },
  arabicText: {
    fontSize: 22,
    lineHeight: 2,
    color: "var(--ink)",
    textAlign: "right",
  },
  translation: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 17,
    fontStyle: "italic",
    color: "var(--ink-soft)",
    lineHeight: 1.7,
  },
  tafsirSection: {
    borderTop: "1px solid rgba(201, 168, 76, 0.15)",
    paddingTop: 12,
  },
  tafsirToggle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: "var(--gold)",
    fontWeight: 600,
    letterSpacing: "0.03em",
    padding: 0,
  },
  tafsirBody: {
    marginTop: 10,
    padding: "12px 16px",
    background: "var(--parchment)",
    borderRadius: 10,
    borderLeft: "3px solid var(--gold)",
  },
  tafsirText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 16,
    color: "var(--ink-soft)",
    lineHeight: 1.75,
  },
  readMoreBtn: {
    marginTop: 8,
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: "var(--gold)",
    fontWeight: 600,
    padding: 0,
    letterSpacing: "0.03em",
  },
  pillRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
  },
  topicPill: {
    display: "inline-block",
    padding: "4px 12px",
    border: "1px solid var(--gold)",
    borderRadius: 20,
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    color: "var(--ink-soft)",
    background: "transparent",
    letterSpacing: "0.02em",
  },
  similarRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
  },
  similarLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    color: "var(--ink-muted)",
    fontWeight: 500,
    marginRight: 2,
  },
  similarChip: {
    display: "inline-block",
    padding: "3px 10px",
    background: "var(--emerald-deep)",
    color: "rgba(247, 242, 232, 0.9)",
    borderRadius: 20,
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
};
