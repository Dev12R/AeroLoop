from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import forecast, plume, stations

app = FastAPI(
    title="AeroLoop",
    description=(
        "Coupled meteorology-chemistry AQI forecasting for Delhi NCR: a "
        "72-hour outlook that models the two-way feedback between "
        "atmospheric inversion, boundary-layer height, and PM2.5/PM10/O3/"
        "NOx, plus explicit stubble-burning plume attribution."
    ),
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # prototype scope; tighten before any real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stations.router)
app.include_router(forecast.router)
app.include_router(plume.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "aeroloop-backend"}
