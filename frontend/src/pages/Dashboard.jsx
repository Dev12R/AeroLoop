import { useStationContext } from "../context/StationContext";
import { useFetch } from "../hooks/useFetch";
import { getForecast } from "../api/client";
import StationPicker from "../components/StationPicker";
import AqiBadge from "../components/AqiBadge";
import TimeSeriesChart from "../components/TimeSeriesChart";
import { Loading, ErrorBox } from "../components/StatusStates";

const POLLUTANT_LABELS = {
  pm2_5: "PM2.5",
  pm10: "PM10",
  ozone: "Ozone (O₃)",
  nitrogen_dioxide: "NOx (NO₂)",
};

export default function Dashboard() {
  const { stationId } = useStationContext();
  const { data, error, loading } = useFetch(() => getForecast(stationId, 72), [stationId]);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">DELHI NCR &middot; COUPLED FORECAST</p>
          <h1>72-Hour AQI Outlook</h1>
          <p className="subtitle">
            Live meteorology + CAMS chemistry, corrected for Delhi NCR's aerosol-PBL
            feedback and stubble-burning transport. See <code>Methodology</code> for
            what's real-time data vs. modelled.
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
          aqi_baseline: h.chemistry_baseline.aqi.aqi,
          aqi_coupled: h.chemistry_coupled.aqi.aqi,
          pm25_baseline: h.chemistry_baseline.pm2_5,
          pm25_coupled: h.chemistry_coupled.pm2_5,
        }));

        return (
          <>
            <section className="card" style={{ marginBottom: 16 }}>
              <p className="eyebrow">CURRENT (COUPLED FORECAST)</p>
              <div className="aqi-hero">
                <span className="value">{now.chemistry_coupled.aqi.aqi}</span>
                <AqiBadge {...now.chemistry_coupled.aqi} size="lg" />
              </div>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                Dominant pollutant: {POLLUTANT_LABELS[now.chemistry_coupled.aqi.dominant_pollutant] || "-"}
                {" · "}Uncorrected CAMS baseline would read{" "}
                <strong>{now.chemistry_baseline.aqi.aqi}</strong> ({now.chemistry_baseline.aqi.label})
              </p>
            </section>

            <section className="grid grid-4" style={{ marginBottom: 20 }}>
              {Object.entries(POLLUTANT_LABELS).map(([key, label]) => (
                <div className="card stat-card" key={key}>
                  <div className="stat-top">
                    <span>{label}</span>
                  </div>
                  <h2>{now.chemistry_coupled[key]}</h2>
                  <p>µg/m³ &middot; baseline {now.chemistry_baseline[key]}</p>
                </div>
              ))}
            </section>

            <section className="card chart-card" style={{ marginBottom: 16 }}>
              <h3>AQI: baseline vs. two-way coupled forecast</h3>
              <p className="chart-note">
                "Baseline" is the raw CAMS chemistry-transport forecast. "Coupled" applies
                AeroLoop's aerosol-PBL feedback correction hour by hour.
              </p>
              <TimeSeriesChart
                data={chartData}
                series={[
                  { key: "aqi_baseline", label: "Baseline (CAMS)", color: "var(--series-1)", dash: true },
                  { key: "aqi_coupled", label: "Coupled (feedback-corrected)", color: "var(--series-2)" },
                ]}
              />
            </section>

            <section className="card chart-card">
              <h3>PM2.5 concentration: baseline vs. coupled</h3>
              <p className="chart-note">µg/m³, hourly, 72-hour horizon.</p>
              <TimeSeriesChart
                data={chartData}
                series={[
                  { key: "pm25_baseline", label: "Baseline (CAMS)", color: "var(--series-1)", dash: true },
                  { key: "pm25_coupled", label: "Coupled (feedback-corrected)", color: "var(--series-2)" },
                ]}
                unit="µg/m³"
              />
            </section>
          </>
        );
      })()}
    </>
  );
}
