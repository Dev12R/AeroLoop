from fastapi import APIRouter, HTTPException, Query

from ..config import FORECAST_HOURS, STATIONS
from ..services import coupling_engine
from ..services.open_meteo import UpstreamDataError

router = APIRouter(prefix="/api/plume", tags=["plume"])

_IMPACT_THRESHOLD = 0.15  # attributed_fraction above which we call it a real impact window


@router.get("/stubble/{station_id}")
async def get_stubble_plume(
    station_id: str,
    hours: int = Query(FORECAST_HOURS, ge=1, le=120),
):
    if station_id not in STATIONS:
        raise HTTPException(status_code=404, detail=f"Unknown station '{station_id}'")
    try:
        forecast = await coupling_engine.build_forecast(station_id, hours)
    except UpstreamDataError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    timeline = []
    impact_hours = []
    for i, hour in enumerate(forecast["hourly"]):
        plume = hour["stubble_plume"]
        met = hour["meteorology"]
        timeline.append(
            {
                "time": hour["time"],
                "wind_speed_ms": met["wind_speed_ms"],
                "wind_direction_deg": met["wind_direction_deg"],
                "wind_alignment_score": plume["wind_alignment_score"],
                "fire_count": plume["fire_count"],
                "mean_frp_mw": plume["mean_frp_mw"],
                "attributed_fraction": plume["attributed_fraction"],
                "attributed_pm2_5": plume["attributed_pm2_5"],
            }
        )
        if plume["attributed_fraction"] >= _IMPACT_THRESHOLD:
            impact_hours.append(i)

    impact_window = None
    if impact_hours:
        impact_window = {
            "start": timeline[impact_hours[0]]["time"],
            "end": timeline[impact_hours[-1]]["time"],
            "peak": max(timeline, key=lambda h: h["attributed_fraction"])["time"],
        }

    return {
        "station": forecast["station"],
        "distance_to_stubble_belt_km": forecast["distance_to_stubble_belt_km"],
        "bearing_to_stubble_belt_deg": forecast["bearing_to_stubble_belt_deg"],
        "fire_data_live": forecast["hourly"][0]["stubble_plume"]["is_live"] if forecast["hourly"] else False,
        "fire_source": forecast["hourly"][0]["stubble_plume"]["fire_source"] if forecast["hourly"] else None,
        "impact_window": impact_window,
        "timeline": timeline,
    }
