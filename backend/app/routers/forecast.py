from fastapi import APIRouter, HTTPException, Query

from ..config import FORECAST_HOURS, STATIONS
from ..services import coupling_engine
from ..services.open_meteo import UpstreamDataError

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("/{station_id}")
async def get_forecast(
    station_id: str,
    hours: int = Query(FORECAST_HOURS, ge=1, le=120),
):
    if station_id not in STATIONS:
        raise HTTPException(status_code=404, detail=f"Unknown station '{station_id}'")
    try:
        return await coupling_engine.build_forecast(station_id, hours)
    except UpstreamDataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
