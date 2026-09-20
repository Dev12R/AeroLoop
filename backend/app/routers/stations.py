from fastapi import APIRouter

from ..config import DEFAULT_STATION, STATIONS

router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("")
def list_stations():
    return {
        "default": DEFAULT_STATION,
        "stations": [{"id": sid, **info} for sid, info in STATIONS.items()],
    }
