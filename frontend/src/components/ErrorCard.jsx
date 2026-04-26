export default function ErrorCard({ message }) {
  return (
    <div
      style={{
        background: "rgba(123, 24, 24, 0.06)",
        border: "1px solid rgba(123, 24, 24, 0.2)",
        borderRadius: 12,
        padding: "16px 20px",
        marginBottom: 24,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
      role="alert"
    >
      <span
        style={{
          fontSize: 18,
          color: "#7B1818",
          flexShrink: 0,
          marginTop: 1,
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        ⚠
      </span>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 15,
          color: "#7B1818",
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {message}
      </p>
    </div>
  );
}
