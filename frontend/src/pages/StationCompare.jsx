import { useEffect, useState } from "react";
import { useStationContext } from "../context/StationContext";
import { getForecast } from "../api/client";
import AqiBadge from "../components/AqiBadge";
import Sparkline from "../components/Sparkline";
import { Loading, ErrorBox } from "../components/StatusStates";

// Fixed categorical order, one slot per station -- identity, never re-cycled.
const SLOT_COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];

export default function StationCompare() {
  const { stations } = useStationContext();
  const [forecasts, setForecasts] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stations.length) return;
    let cancelled = false;
    setLoading(true);
    Promise.all(stations.map((s) => getForecast(s.id, 72)))
      .then((results) => {
        if (!cancelled) setForecasts(results);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [stations]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">DELHI NCR</p>
          <h1>Station Comparison</h1>
          <p className="subtitle">
            72-hour coupled AQI outlook across all five monitored NCR stations, shown
            as small multiples so each trend reads on its own scale rather than a
            crowded overlay.
          </p>
        </div>
      </header>

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}

      {forecasts && (
        <section className="grid grid-3">
          {forecasts.map((f, i) => {
            const now = f.hourly[0];
            const spark = f.hourly.map((h) => ({ time: h.time, aqi: h.chemistry_coupled.aqi.aqi }));
            return (
              <div className="card station-card" key={f.station.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div className="station-name">{f.station.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{f.station.state}</div>
                  </div>
                  <AqiBadge {...now.chemistry_coupled.aqi} />
                </div>
                <Sparkline data={spark} dataKey="aqi" color={SLOT_COLORS[i % SLOT_COLORS.length]} />
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  72h peak AQI:{" "}
                  <strong>{Math.max(...f.hourly.map((h) => h.chemistry_coupled.aqi.aqi))}</strong>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </>
  );
}
