// Sequential (magnitude) encoding: one hue, light -> dark, per the inversion
// strength value. This is a physical intensity, not a good/bad status, so
// it deliberately does NOT borrow the AQI's red/orange severity colors.
function shade(value) {
  if (value < 25) return "var(--seq-100)";
  if (value < 50) return "var(--seq-300)";
  if (value < 75) return "var(--seq-500)";
  return "var(--seq-700)";
}

export default function InversionGauge({ value }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div
        style={{
          height: 10,
          borderRadius: 6,
          background: "var(--surface-2)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: shade(pct),
            borderRadius: 6,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--text-muted)",
          marginTop: 4,
        }}
      >
        <span>Well-mixed</span>
        <span>Strong inversion</span>
      </div>
    </div>
  );
}
