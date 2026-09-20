import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatTick(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: undefined });
}

function CustomTooltip({ active, payload, label, series, unit }) {
  if (!active || !payload || !payload.length) return null;
  const d = new Date(label);
  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "var(--text-primary)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
      }}
    >
      <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
        {d.toLocaleString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
        })}
      </div>
      {series.map((s) => {
        const point = payload.find((p) => p.dataKey === s.key);
        if (!point) return null;
        return (
          <div key={s.key} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "var(--text-secondary)" }}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: s.color,
                  marginRight: 6,
                }}
              />
              {s.label}
            </span>
            <strong>
              {point.value}
              {unit ? ` ${unit}` : ""}
            </strong>
          </div>
        );
      })}
    </div>
  );
}

/**
 * A single-axis time-series line chart. `series` is a fixed-order list of
 * {key, label, color, dash?} -- never auto-cycled hues (see METHODOLOGY.md).
 */
export default function TimeSeriesChart({ data, series, unit, height = 260 }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="time"
            tickFormatter={formatTick}
            stroke="var(--baseline-axis)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            minTickGap={40}
          />
          <YAxis
            stroke="var(--baseline-axis)"
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip series={series} unit={unit} />} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dash ? "5 4" : undefined}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="legend-row">
        {series.map((s) => (
          <span key={s.key} className="legend-dot">
            <span className="legend-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
