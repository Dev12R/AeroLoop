import { useStationContext } from "../context/StationContext";
import { useFetch } from "../hooks/useFetch";
import { getForecast } from "../api/client";
import StationPicker from "../components/StationPicker";
import TimeSeriesChart from "../components/TimeSeriesChart";
import InversionGauge from "../components/InversionGauge";
import { Loading, ErrorBox } from "../components/StatusStates";

export default function InversionTracker() {
  const { stationId } = useStationContext();
  const { data, error, loading } = useFetch(() => getForecast(stationId, 72), [stationId]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">ATMOSPHERIC PHYSICS</p>
          <h1>Inversion Strength Tracker</h1>
          <p className="subtitle">
            Boundary-layer height and inversion strength, before and after AeroLoop's
            aerosol-loading feedback correction. A shallow, feedback-suppressed PBL is
            what traps pollutants near the surface.
          </p>
        </div>
        <StationPicker />
      </header>

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}

      {data && (() => {
        const now = data.hourly[0];
        const chartData = data.hourly.map((h) => ({
          time: h.time,
          pbl_baseline: h.meteorology.pbl_height_baseline_m,
          pbl_coupled: h.meteorology.pbl_height_coupled_m,
          inversion: h.meteorology.inversion_strength,
        }));

        return (
          <>
            <section className="grid grid-2" style={{ marginBottom: 20 }}>
              <div className="card">
                <p className="eyebrow">CURRENT INVERSION STRENGTH</p>
                <h2 style={{ margin: "4px 0 10px", fontSize: 30 }}>
                  {now.meteorology.inversion_strength}
                  <span style={{ fontSize: 15, color: "var(--text-muted)" }}> / 100</span>
                </h2>
                <InversionGauge value={now.meteorology.inversion_strength} />
              </div>
              <div className="card">
                <p className="eyebrow">BOUNDARY LAYER HEIGHT (CORRECTED)</p>
                <h2 style={{ margin: "4px 0 2px", fontSize: 30 }}>
                  {now.meteorology.pbl_height_coupled_m} m
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                  Raw meteorological forecast: {now.meteorology.pbl_height_baseline_m} m &middot;{" "}
                  {now.meteorology.is_daylight ? "daytime (feedback active)" : "night (radiative inversion)"}
                </p>
              </div>
            </section>

            <section className="card chart-card" style={{ marginBottom: 16 }}>
              <h3>Boundary-layer height: baseline vs. aerosol-corrected</h3>
              <p className="chart-note">
                Meters above ground. During sunlit hours, heavy PM2.5 loading attenuates
                incoming radiation and suppresses convective PBL growth -- the "coupled"
                line separates from baseline whenever that feedback is active.
              </p>
              <TimeSeriesChart
                data={chartData}
                series={[
                  { key: "pbl_baseline", label: "Baseline (met. forecast)", color: "var(--series-1)", dash: true },
                  { key: "pbl_coupled", label: "Coupled (aerosol-corrected)", color: "var(--series-2)" },
                ]}
                unit="m"
              />
            </section>

            <section className="card chart-card">
              <h3>Inversion strength index (0-100)</h3>
              <p className="chart-note">
                Derived from the corrected PBL height relative to a well-mixed 1800 m
                daytime reference. Higher = pollutants more tightly trapped near the surface.
              </p>
              <TimeSeriesChart
                data={chartData}
                series={[{ key: "inversion", label: "Inversion strength", color: "var(--seq-500)" }]}
              />
            </section>
          </>
        );
      })()}
    </>
  );
}
