import { useState, useRef } from "react";
import { search as apiSearch } from "../api.js";
import VerseCard from "../components/VerseCard.jsx";
import Ornament from "../components/Ornament.jsx";
import ErrorCard from "../components/ErrorCard.jsx";

function SkeletonCard() {
  return (
    <div style={skeletonStyles.card}>
      <div style={skeletonStyles.topRow}>
        <div
          className="skeleton"
          style={{ width: 80, height: 28, borderRadius: 20 }}
        />
        <div className="skeleton" style={{ width: 100, height: 20 }} />
        <div
          className="skeleton"
          style={{
            width: 52,
            height: 24,
            borderRadius: 20,
            marginLeft: "auto",
          }}
        />
      </div>
      <div className="skeleton" style={{ height: 80, borderRadius: 12 }} />
      <div className="skeleton" style={{ height: 18, width: "90%" }} />
      <div className="skeleton" style={{ height: 18, width: "70%" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <div
          className="skeleton"
          style={{ width: 60, height: 24, borderRadius: 20 }}
        />
        <div
          className="skeleton"
          style={{ width: 80, height: 24, borderRadius: 20 }}
        />
        <div
          className="skeleton"
          style={{ width: 50, height: 24, borderRadius: 20 }}
        />
      </div>
    </div>
  );
}

const skeletonStyles = {
  card: {
    background: "var(--warm-white)",
    border: "1px solid rgba(201, 168, 76, 0.15)",
    borderRadius: 20,
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
};

export default function Search() {
  const [query, setQuery] = useState("");
  const [topK, setTopK] = useState(10);
  const [includeTafsir, setIncludeTafsir] = useState(true);
  const [tafsirSlug, setTafsirSlug] = useState("ibn-kathir");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [revelationPlace, setRevelationPlace] = useState("");
  const [juzNumber, setJuzNumber] = useState("");

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(null);

  const startRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);
    startRef.current = performance.now();

    try {
      const body = {
        query: query.trim(),
        top_k: topK,
        include_tafsir: includeTafsir,
        tafsir_slug: tafsirSlug,
      };
      if (revelationPlace) body.revelation_place = revelationPlace;
      if (juzNumber) body.juz_number = parseInt(juzNumber, 10);

      const data = await apiSearch(body);
      const ms = Math.round(performance.now() - startRef.current);
      setElapsed(ms);
      setResults(
        Array.isArray(data) ? data : (data.results ?? data.verses ?? []),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page} className="geo-bg">
      <div style={styles.inner}>
        {/* Page header */}
        <header style={styles.header}>
          <h1 className="heading page-title" style={styles.title}>
            Corpus Search
          </h1>
          <p style={styles.subtitle}>
            Find Quranic verses by meaning, theme, or Arabic phrase
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
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by meaning, theme, or Arabic phrase…"
            style={styles.textarea}
            rows={4}
            aria-label="Search query"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey))
                handleSubmit(e);
            }}
          />

          {/* Controls row */}
          <div style={styles.controlsRow}>
            <div style={styles.controlGroup}>
              <label htmlFor="top-k-slider" style={styles.controlLabel}>
                Results:{" "}
                <strong style={{ color: "var(--emerald-deep)" }}>{topK}</strong>
              </label>
              <input
                id="top-k-slider"
                type="range"
                min={1}
                max={20}
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                style={styles.slider}
                aria-valuemin={1}
                aria-valuemax={20}
                aria-valuenow={topK}
              />
              <div style={styles.sliderLabels}>
                <span>1</span>
                <span>20</span>
              </div>
            </div>

            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>Tafsir</label>
              <button
                type="button"
                onClick={() => setIncludeTafsir((v) => !v)}
                style={getToggleStyle(includeTafsir)}
                role="switch"
                aria-checked={includeTafsir}
              >
                <span style={getToggleKnobStyle(includeTafsir)} />
              </button>
            </div>

            <div style={styles.controlGroup}>
              <label htmlFor="tafsir-select" style={styles.controlLabel}>
                Commentary
              </label>
              <select
                id="tafsir-select"
                value={tafsirSlug}
                onChange={(e) => setTafsirSlug(e.target.value)}
                style={styles.select}
                disabled={!includeTafsir}
              >
                <option value="ibn-kathir">Ibn Kathir</option>
                <option value="saadi">Al-Sa'di</option>
              </select>
            </div>
          </div>

          {/* Optional filters */}
          <div style={styles.filtersToggleRow}>
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              style={styles.filtersToggle}
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? "▲" : "▼"} Optional filters
            </button>
          </div>

          {filtersOpen && (
            <div style={styles.filtersPanel}>
              <div style={styles.filterGroup}>
                <span style={styles.controlLabel}>Revelation Place</span>
                <div
                  style={styles.radioGroup}
                  role="radiogroup"
                  aria-label="Revelation place"
                >
                  {["", "makkah", "madinah"].map((val) => (
                    <label key={val} style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="revelation_place"
                        value={val}
                        checked={revelationPlace === val}
                        onChange={() => setRevelationPlace(val)}
                        style={styles.radioInput}
                      />
                      {val === ""
                        ? "Any"
                        : val.charAt(0).toUpperCase() + val.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.filterGroup}>
                <label htmlFor="juz-input" style={styles.controlLabel}>
                  Juz (1–30)
                </label>
                <input
                  id="juz-input"
                  type="number"
                  min={1}
                  max={30}
                  value={juzNumber}
                  onChange={(e) => setJuzNumber(e.target.value)}
                  placeholder="Any"
                  style={styles.numberInput}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !query.trim()}
            style={{
              ...styles.cta,
              opacity: loading || !query.trim() ? 0.6 : 1,
              cursor: loading || !query.trim() ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Searching…" : "Search Corpus"}
          </button>
        </form>

        {/* Error */}
        {error && <ErrorCard message={error} />}

        {/* Loading skeletons */}
        {loading && (
          <div style={styles.results}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && results !== null && (
          <>
            {results.length > 0 ? (
              <>
                <div style={styles.resultsHeader}>
                  <span style={styles.resultsMeta}>
                    {results.length} result{results.length !== 1 ? "s" : ""}
                    {elapsed != null && ` · ${elapsed}ms`}
                  </span>
                </div>
                <div style={styles.results}>
                  {results.map((verse, i) => (
                    <VerseCard
                      key={verse.verse_key ?? i}
                      {...verse}
                      index={i}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div style={styles.emptyState}>
                <Ornament />
                <p className="heading" style={styles.emptyText}>
                  No results found. Try a different query.
                </p>
              </div>
            )}
          </>
        )}

        {/* Initial empty state */}
        {!loading && results === null && !error && (
          <div style={styles.initialEmptyState}>
            <div style={styles.initialEmptyIcon}>
              {/* Astrolabe compass — "finding" in the corpus */}
              <svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true">
                {/* Handle */}
                <line x1="67" y1="67" x2="82" y2="82" stroke="#c9a84c" strokeWidth="5" strokeLinecap="round"/>
                {/* Outer dashed ring */}
                <circle cx="48" cy="48" r="36" stroke="#c9a84c" strokeWidth="1.5" strokeDasharray="4 3"/>
                {/* Inner ring */}
                <circle cx="48" cy="48" r="27" stroke="rgba(201,168,76,0.3)" strokeWidth="1"/>
                {/* Cardinal tick marks */}
                <line x1="48" y1="13" x2="48" y2="20" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round"/>
                <line x1="83" y1="48" x2="76" y2="48" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round"/>
                <line x1="48" y1="83" x2="48" y2="76" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round"/>
                <line x1="13" y1="48" x2="20" y2="48" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round"/>
                {/* Diagonal ticks (softer) */}
                <line x1="22.7" y1="22.7" x2="27.2" y2="27.2" stroke="rgba(201,168,76,0.45)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="73.3" y1="22.7" x2="68.8" y2="27.2" stroke="rgba(201,168,76,0.45)" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="22.7" y1="73.3" x2="27.2" y2="68.8" stroke="rgba(201,168,76,0.45)" strokeWidth="1.5" strokeLinecap="round"/>
                {/* 8-pointed star: two overlapping squares */}
                <rect x="38" y="38" width="20" height="20" rx="1" fill="#0c4b33" fillOpacity="0.88"/>
                <rect x="38" y="38" width="20" height="20" rx="1" fill="#0c4b33" fillOpacity="0.88" transform="rotate(45 48 48)"/>
                {/* Center gold dot */}
                <circle cx="48" cy="48" r="3.5" fill="#c9a84c"/>
              </svg>
            </div>
            <p className="heading" style={styles.initialEmptyTitle}>
              Search the Quran by meaning
            </p>
            <p style={styles.initialEmptyHint}>
              Try "patience during hardship" or "gratitude"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function getToggleStyle(on) {
  return {
    position: "relative",
    width: 44,
    height: 24,
    borderRadius: 12,
    background: on ? "var(--emerald)" : "var(--parchment-dark)",
    border: "none",
    cursor: "pointer",
    transition: "background 0.2s ease",
    flexShrink: 0,
    padding: 0,
  };
}

function getToggleKnobStyle(on) {
  return {
    position: "absolute",
    top: 3,
    left: on ? 23 : 3,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "white",
    transition: "left 0.2s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    display: "block",
  };
}

const styles = {
  page: {
    minHeight: "calc(100vh - 64px)",
    padding: "48px 24px 80px",
  },
  inner: {
    maxWidth: 800,
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
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
    marginBottom: 32,
    boxShadow: "0 2px 20px rgba(12, 75, 51, 0.06)",
  },
  textarea: {
    width: "100%",
    padding: "16px 18px",
    borderRadius: 12,
    border: "1px solid rgba(201, 168, 76, 0.3)",
    background: "var(--cream)",
    fontFamily: "'Cormorant Garamond', serif",
    fontSize: 20,
    color: "var(--ink)",
    lineHeight: 1.6,
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  controlsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 24,
    alignItems: "flex-end",
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 140,
  },
  controlLabel: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 12,
    fontWeight: 500,
    color: "var(--ink-muted)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
  },
  slider: {
    width: "100%",
    accentColor: "var(--emerald)",
    cursor: "pointer",
  },
  sliderLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    color: "var(--ink-muted)",
  },
  select: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(201, 168, 76, 0.3)",
    background: "var(--cream)",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "var(--ink)",
    outline: "none",
    cursor: "pointer",
  },
  filtersToggleRow: {
    borderTop: "1px solid rgba(201, 168, 76, 0.12)",
    paddingTop: 12,
  },
  filtersToggle: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: "var(--ink-muted)",
    fontWeight: 500,
    padding: 0,
    letterSpacing: "0.02em",
  },
  filtersPanel: {
    display: "flex",
    flexWrap: "wrap",
    gap: 24,
    padding: "16px 0 0",
    borderTop: "1px solid rgba(201, 168, 76, 0.1)",
  },
  filterGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  radioGroup: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "var(--ink-soft)",
    cursor: "pointer",
  },
  radioInput: {
    accentColor: "var(--emerald)",
    cursor: "pointer",
  },
  numberInput: {
    width: 80,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(201, 168, 76, 0.3)",
    background: "var(--cream)",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    color: "var(--ink)",
    outline: "none",
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
  resultsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  resultsMeta: {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    color: "var(--ink-muted)",
  },
  results: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 0",
  },
  emptyText: {
    fontFamily: "'Cormorant Garamond', serif",
    fontStyle: "italic",
    fontSize: 22,
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
  },
};
