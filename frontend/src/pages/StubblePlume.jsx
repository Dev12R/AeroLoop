import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useStationContext } from "../context/StationContext";
import { useFetch } from "../hooks/useFetch";
import { getStubblePlume } from "../api/client";
import StationPicker from "../components/StationPicker";
import TimeSeriesChart from "../components/TimeSeriesChart";
import { Loading, ErrorBox } from "../components/StatusStates";

const STUBBLE_BELT = { lat: 30.5, lon: 75.5, name: "Punjab-Haryana stubble belt" };

function emojiIcon(emoji, size = 28) {
  return L.divIcon({
    html: `<div style="font-size:${size}px;line-height:1;transform:translate(-50%,-50%)">${emoji}</div>`,
    className: "",
    iconSize: [0, 0],
  });
}

function windArrowIcon(directionDeg) {
  // wind_direction is "blowing FROM"; rotate the arrow to point where it's blowing TO.
  const rotation = directionDeg + 180;
  return L.divIcon({
    html: `<div style="font-size:26px;transform:translate(-50%,-50%) rotate(${rotation}deg)">➤</div>`,
    className: "",
    iconSize: [0, 0],
  });
}

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function StubblePlume() {
  const { stationId, stations } = useStationContext();
  const { data, error, loading } = useFetch(() => getStubblePlume(stationId, 72), [stationId]);
  const station = stations.find((s) => s.id === stationId);

  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">REGIONAL TRANSPORT</p>
          <h1>Stubble-Burning Plume Tracker</h1>
          <p className="subtitle">
            Fire activity in the Punjab/Haryana crop-residue belt, cross-referenced
            against the forecast wind field to estimate how much of a station's PM2.5
            is transported smoke rather than local emissions.
          </p>
        </div>
        <StationPicker />
      </header>

      {loading && <Loading />}
      {error && <ErrorBox message={error} />}

      {data && station && (() => {
        const current = data.timeline[0];
        const chartData = data.timeline.map((t) => ({
          time: t.time,
          attributed_pm2_5: t.attributed_pm2_5,
          fraction_pct: Math.round(t.attributed_fraction * 1000) / 10,
        }));

        return (
          <>
            <section className="grid grid-3" style={{ marginBottom: 16 }}>
              <div className="card">
                <p className="eyebrow">FIRE ACTIVITY</p>
                <h2 style={{ margin: "4px 0 2px", fontSize: 26 }}>
                  {current.fire_count.toLocaleString()}
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                  active detections &middot; mean FRP {current.mean_frp_mw} MW &middot;{" "}
                  {data.fire_source === "firms_live" ? "NASA FIRMS live" : "seasonal model (no FIRMS key set)"}
                </p>
              </div>
              <div className="card">
                <p className="eyebrow">WIND ALIGNMENT NOW</p>
                <h2 style={{ margin: "4px 0 2px", fontSize: 26 }}>
                  {Math.round(current.wind_alignment_score * 100)}%
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                  {current.wind_speed_ms} m/s from {Math.round(current.wind_direction_deg)}&deg; &middot;{" "}
                  {station.name} is {data.distance_to_stubble_belt_km} km from the belt
                </p>
              </div>
              <div className="card">
                <p className="eyebrow">CURRENT ATTRIBUTED CONTRIBUTION</p>
                <h2 style={{ margin: "4px 0 2px", fontSize: 26 }}>
                  {current.attributed_pm2_5} µg/m³
                </h2>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                  &asymp; {Math.round(current.attributed_fraction * 100)}% of forecast PM2.5
                </p>
              </div>
            </section>

            <section className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 12px" }}>Plume corridor</h3>
              <div className="plume-map-wrap">
                <MapContainer
                  center={[(station.lat + STUBBLE_BELT.lat) / 2, (station.lon + STUBBLE_BELT.lon) / 2]}
                  zoom={7}
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[station.lat, station.lon]} icon={emojiIcon("📍")}>
                    <Popup>
                      <strong>{station.name}</strong>
                      <br />
                      Current AQI contribution from transport: {current.attributed_pm2_5} µg/m³
                    </Popup>
                  </Marker>
                  <Marker position={[STUBBLE_BELT.lat, STUBBLE_BELT.lon]} icon={emojiIcon("🔥")}>
                    <Popup>
                      <strong>{STUBBLE_BELT.name}</strong>
                      <br />
                      {current.fire_count.toLocaleString()} active fire detections
                    </Popup>
                  </Marker>
                  <Marker position={[station.lat, station.lon]} icon={windArrowIcon(current.wind_direction_deg)} />
                  <Polyline
                    positions={[
                      [STUBBLE_BELT.lat, STUBBLE_BELT.lon],
                      [station.lat, station.lon],
                    ]}
                    pathOptions={{
                      color: current.wind_alignment_score > 0.3 ? "#eb6834" : "#c3c2b7",
                      weight: current.wind_alignment_score > 0.3 ? 3 : 1.5,
                      dashArray: current.wind_alignment_score > 0.3 ? undefined : "6 6",
                    }}
                  />
                </MapContainer>
              </div>
            </section>

            <section className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 10px" }}>72-hour impact window</h3>
              {data.impact_window ? (
                <div className="impact-window">
                  <div className="field">
                    Window opens
                    <strong>{formatTime(data.impact_window.start)}</strong>
                  </div>
                  <div className="field">
                    Peak contribution
                    <strong>{formatTime(data.impact_window.peak)}</strong>
                  </div>
                  <div className="field">
                    Window closes
                    <strong>{formatTime(data.impact_window.end)}</strong>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                  No significant transport window detected in the next 72 hours under the
                  current forecast wind regime for {station.name}.
                </p>
              )}
            </section>

            <section className="card chart-card">
              <h3>Attributed stubble-burning PM2.5, 72h</h3>
              <p className="chart-note">
                Estimated µg/m³ of {station.name}'s forecast PM2.5 attributable to transported
                stubble-burning smoke (wind-alignment &times; fire intensity &times; advection efficiency).
              </p>
              <TimeSeriesChart
                data={chartData}
                series={[{ key: "attributed_pm2_5", label: "Attributed PM2.5", color: "var(--series-3)" }]}
                unit="µg/m³"
              />
            </section>
          </>
        );
      })()}
    </>
  );
}
