"""
Live meteorology and baseline chemistry-transport data from Open-Meteo.

Weather forecast: ECMWF/ICON blended model, includes real modelled boundary
layer height (PBL height) -- this is the actual meteorological half of the
coupling problem, not a placeholder.

Air-quality forecast: backed by Copernicus CAMS, a genuine operational
coupled meteorology-chemistry system (same physics family as WRF-Chem, run
at global/regional scale). We treat it as our chemistry baseline and layer
Delhi-NCR-specific two-way feedback correction on top in coupling_engine.py.

Both endpoints are free and require no API key.
"""

from __future__ import annotations

import httpx

from ..config import (
    AIR_QUALITY_HOURLY_VARS,
    FORECAST_HOURS,
    OPEN_METEO_AIR_QUALITY_URL,
    OPEN_METEO_WEATHER_URL,
    WEATHER_HOURLY_VARS,
)

_TIMEOUT = httpx.Timeout(15.0, connect=10.0)


class UpstreamDataError(RuntimeError):
    """Raised when Open-Meteo can't be reached or returns an unusable payload."""


async def fetch_weather(lat: float, lon: float, hours: int = FORECAST_HOURS) -> dict:
    """Hourly meteorology for `hours` hours ahead, keyed by variable name."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(WEATHER_HOURLY_VARS),
        "forecast_days": max(1, (hours // 24) + 1),
        "timezone": "Asia/Kolkata",
        "wind_speed_unit": "ms",
    }
    return await _get_hourly(OPEN_METEO_WEATHER_URL, params, hours)


async def fetch_air_quality(lat: float, lon: float, hours: int = FORECAST_HOURS) -> dict:
    """Hourly CAMS chemistry forecast for `hours` hours ahead."""
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(AIR_QUALITY_HOURLY_VARS),
        "forecast_days": max(1, (hours // 24) + 1),
        "timezone": "Asia/Kolkata",
    }
    return await _get_hourly(OPEN_METEO_AIR_QUALITY_URL, params, hours)


async def _get_hourly(url: str, params: dict, hours: int) -> dict:
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            payload = resp.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise UpstreamDataError(f"Open-Meteo request to {url} failed: {exc}") from exc

    hourly = payload.get("hourly")
    if not hourly or "time" not in hourly:
        raise UpstreamDataError(f"Open-Meteo returned no hourly data from {url}")

    # Trim every series to the requested horizon so weather (up to 16 days)
    # and air-quality (up to ~5 days) responses line up hour-for-hour.
    trimmed = {key: series[:hours] for key, series in hourly.items()}
    return trimmed
