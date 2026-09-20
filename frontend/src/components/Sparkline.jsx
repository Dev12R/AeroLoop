import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

/** Minimal single-series trend line for small-multiple cards -- no axes/grid. */
export default function Sparkline({ data, dataKey, color, height = 60 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <YAxis hide domain={["auto", "auto"]} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
