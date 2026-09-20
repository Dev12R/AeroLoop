import { useState } from "react";
import "./App.css";
import { StationProvider } from "./context/StationContext";
import Dashboard from "./pages/Dashboard";
import InversionTracker from "./pages/InversionTracker";
import StubblePlume from "./pages/StubblePlume";
import StationCompare from "./pages/StationCompare";
import Methodology from "./pages/Methodology";

const PAGES = [
  { id: "dashboard", label: "Dashboard", icon: "⌂", Component: Dashboard },
  { id: "inversion", label: "Inversion Tracker", icon: "◉", Component: InversionTracker },
  { id: "plume", label: "Stubble Plume", icon: "🔥", Component: StubblePlume },
  { id: "compare", label: "Station Compare", icon: "⇄", Component: StationCompare },
  { id: "methodology", label: "Methodology", icon: "?", Component: Methodology },
];

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const ActiveComponent = PAGES.find((p) => p.id === activePage)?.Component ?? Dashboard;

  return (
    <StationProvider>
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-icon">A</div>
            <div>
              <h2>AeroLoop</h2>
              <span>Coupled AQI Forecast</span>
            </div>
          </div>

          <nav>
            {PAGES.map((p) => (
              <button
                key={p.id}
                className={`nav-item ${activePage === p.id ? "active" : ""}`}
                onClick={() => setActivePage(p.id)}
              >
                <span>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="system-status">
              <span className="status-dot" />
              Live: Open-Meteo + CAMS
            </div>
            <p>Delhi NCR &middot; 72h coupled met-chem outlook</p>
          </div>
        </aside>

        <main className="main-content">
          <ActiveComponent />
        </main>
      </div>
    </StationProvider>
  );
}

export default App;
