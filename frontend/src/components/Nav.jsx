export default function Nav({ active, onNavigate }) {
  const tabs = [
    { id: "search", label: "Search" },
    { id: "verify", label: "Verify" },
    { id: "outline", label: "Outline" },
  ];

  return (
    <nav style={styles.nav} className="nav-bar">
      {/* Brand */}
      <button
        onClick={() => onNavigate("home")}
        style={styles.brand}
        aria-label="Go to home"
      >
        {/* Small Islamic star SVG */}
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <polygon
            points="16,1 19.5,11.2 30.4,11.2 21.8,17.6 25.2,27.8 16,21.4 6.8,27.8 10.2,17.6 1.6,11.2 12.5,11.2"
            fill="#C9A84C"
          />
        </svg>
        <span style={styles.brandName} className="nav-brand-name">
          Bayan
        </span>
      </button>

      {/* Tabs */}
      <div
        style={styles.tabs}
        className="nav-tabs"
        role="navigation"
        aria-label="Main navigation"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className="nav-tab"
            style={{
              ...styles.tab,
              ...(active === tab.id ? styles.tabActive : {}),
            }}
            aria-current={active === tab.id ? "page" : undefined}
          >
            {tab.label}
            <span
              style={{
                ...styles.tabUnderline,
                opacity: active === tab.id ? 1 : 0,
                transform:
                  active === tab.id
                    ? "translateX(-50%) scaleX(1)"
                    : "translateX(-50%) scaleX(0)",
              }}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: 64,
    padding: "0 40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(254, 252, 246, 0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderBottom: "1px solid rgba(201, 168, 76, 0.15)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  brandName: {
    fontFamily: "'Amiri', serif",
    fontSize: 26,
    fontWeight: 700,
    color: "var(--emerald-deep)",
    letterSpacing: "0.02em",
    lineHeight: 1,
  },
  tabs: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  tab: {
    position: "relative",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    fontSize: 14,
    color: "var(--ink-soft)",
    padding: "8px 16px",
    borderRadius: 8,
    letterSpacing: "0.03em",
    transition: "color 180ms ease-out, background 180ms ease-out",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  tabActive: {
    color: "var(--emerald-deep)",
    fontWeight: 600,
  },
  tabUnderline: {
    position: "absolute",
    bottom: 2,
    left: "50%",
    width: "60%",
    height: 2,
    background: "var(--gold)",
    borderRadius: 2,
    transition:
      "opacity 180ms ease-out, transform 180ms cubic-bezier(0.23,1,0.32,1)",
    transformOrigin: "center",
  },
};
