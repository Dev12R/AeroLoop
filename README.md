# AeroLoop

**Air Pollution-Weather Coupled Forecasting System (Delhi NCR Focus)**

A 72-hour AQI outlook for Delhi NCR that models the two-way feedback between
atmospheric inversion / boundary-layer height and PM2.5/PM10/O3/NOx, plus
explicit stubble-burning plume attribution. See
[`docs/METHODOLOGY.md`](docs/METHODOLOGY.md) for exactly what's live data vs.
modelled, and why.

- **Meteorology**: live from Open-Meteo (ECMWF/ICON), including real modelled
  boundary-layer height.
- **Baseline chemistry**: live from Open-Meteo's air-quality API, backed by
  Copernicus CAMS (a real coupled meteorology-chemistry system).
- **The coupling layer** (this project's contribution): an hour-by-hour
  aerosol-PBL feedback correction + wind/fire-based stubble-plume attribution,
  built on top of that real baseline. See `backend/app/services/coupling_engine.py`.
- Both API sources are free and need no key. Only NASA FIRMS (optional, for
  live fire detections instead of the seasonal fallback model) needs a key.

## Run it

New to this project or just received these files from someone else? Use
[`GETTING_STARTED.md`](GETTING_STARTED.md) instead — it walks through setup
from zero assumptions. The quick version, for anyone already comfortable with
Python/Node environments:

### Backend (FastAPI)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

Docs at http://127.0.0.1:8010/docs once it's running.

Optional: set `FIRMS_MAP_KEY` (free, from
https://firms.modaps.eosdis.gov/api/area/) as an environment variable before
starting the server to pull live NASA FIRMS fire detections instead of the
seasonal fallback model.

### Frontend (React + Vite)

```powershell
cd frontend
npm install
npm run dev
```

Opens at http://localhost:5173 (or the port Vite prints). It expects the
backend at `http://127.0.0.1:8010` by default; override with a `VITE_API_BASE_URL`
env var (e.g. in a `.env.local` file in `frontend/`) if you run the backend
elsewhere.

## Project layout

```
backend/
  app/
    config.py            station coords, coupling coefficients, API keys
    main.py               FastAPI app + routes
    routers/               forecast / plume / stations endpoints
    services/
      open_meteo.py        live weather + CAMS chemistry fetch
      fire_service.py       NASA FIRMS + seasonal fallback
      aqi_calc.py            CPCB National AQI breakpoints
      coupling_engine.py     the two-way feedback model (core logic)
      geo_utils.py           bearing/distance helpers
frontend/
  src/
    pages/                  Dashboard, InversionTracker, StubblePlume, StationCompare, Methodology
    components/             charts, badges, station picker
    context/StationContext.jsx   shared selected-station state
    api/client.js            backend API calls
docs/
  METHODOLOGY.md            the honest writeup: what's real, what's modelled, what WRF-Chem adds
```

## Status

Working prototype. Not a production deployment -- CORS is wide open, there's
no persistence/caching layer, and the coupling coefficients in `config.py` are
physically motivated defaults, not calibrated against ground-truth CPCB
observations. See `docs/METHODOLOGY.md` for the full scope and caveats.
