const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010";

async function getJson(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${detail ? ` - ${detail}` : ""}`);
  }
  return res.json();
}

export function getStations() {
  return getJson("/api/stations");
}

export function getForecast(stationId, hours = 72) {
  return getJson(`/api/forecast/${stationId}?hours=${hours}`);
}

export function getStubblePlume(stationId, hours = 72) {
  return getJson(`/api/plume/stubble/${stationId}?hours=${hours}`);
}
