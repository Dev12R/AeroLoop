// Icon glyphs stand in for color so the AQI category is never carried by
// hue alone (CPCB's six official category colors are reused here, not the
// app's categorical palette -- see docs/METHODOLOGY.md).
const ICONS = {
  Good: "✓",
  Satisfactory: "🙂",
  Moderate: "😐",
  Poor: "😷",
  "Very Poor": "⚠",
  Severe: "☠",
};

export default function AqiBadge({ aqi, label, color, size = "md" }) {
  const fontSize = size === "lg" ? 15 : 12;
  return (
    <span
      className="aqi-badge"
      style={{ background: color, fontSize }}
      title={`AQI ${aqi} - ${label}`}
    >
      <span className="aqi-dot" aria-hidden="true" />
      {ICONS[label] || ""} {label} ({aqi})
    </span>
  );
}
