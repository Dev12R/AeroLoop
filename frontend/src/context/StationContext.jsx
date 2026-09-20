import { createContext, useContext, useEffect, useState } from "react";
import { getStations } from "../api/client";

const StationContext = createContext(null);

export function StationProvider({ children }) {
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStations()
      .then((data) => {
        setStations(data.stations);
        setStationId(data.default);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <StationContext.Provider value={{ stations, stationId, setStationId, error }}>
      {children}
    </StationContext.Provider>
  );
}

export function useStationContext() {
  const ctx = useContext(StationContext);
  if (!ctx) throw new Error("useStationContext must be used within a StationProvider");
  return ctx;
}
