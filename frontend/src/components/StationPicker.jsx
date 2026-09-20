import { useStationContext } from "../context/StationContext";

export default function StationPicker() {
  const { stations, stationId, setStationId } = useStationContext();
  if (!stations.length) return null;
  return (
    <div className="station-picker">
      {stations.map((s) => (
        <button
          key={s.id}
          className={`station-chip ${s.id === stationId ? "active" : ""}`}
          onClick={() => setStationId(s.id)}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}
