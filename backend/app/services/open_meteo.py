"""
Live meteorology and baseline chemistry-transport data from Open-Meteo.

Open-Meteo is used as the primary live data source. If the upstream service
temporarily rate-limits or becomes unavailable, a deterministic fallback
dataset is generated so the deployed demo can continue serving forecasts.
"""

from __future__ import annotations

import asyncio
import math
from datetime import datetime, timedelta

import httpx

from ..config import (
    AIR_QUALITY_HOURLY_VARS,
    FORECAST_HOURS,
    OPEN_METEO_AIR_QUALITY_URL,
    OPEN_METEO_WEATHER_URL,
    WEATHER_HOURLY_VARS,
)

_TIMEOUT = httpx.Timeout(15.0, connect=10.0)

_MAX_RETRIES = 2
_RETRY_DELAY = 3.0


class UpstreamDataError(RuntimeError):
    """Raised when Open-Meteo can't be reached or returns unusable data."""


async def fetch_weather(
    lat: float,
    lon: float,
    hours: int = FORECAST_HOURS,
) -> dict:
    """Hourly meteorology for `hours` hours ahead."""

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(WEATHER_HOURLY_VARS),
        "forecast_days": max(1, (hours // 24) + 1),
        "timezone": "Asia/Kolkata",
        "wind_speed_unit": "ms",
    }

    try:
        return await _get_hourly(
            OPEN_METEO_WEATHER_URL,
            params,
            hours,
        )
    except UpstreamDataError:
        return _fallback_weather(hours)


async def fetch_air_quality(
    lat: float,
    lon: float,
    hours: int = FORECAST_HOURS,
) -> dict:
    """Hourly CAMS chemistry forecast for `hours` hours ahead."""

    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(AIR_QUALITY_HOURLY_VARS),
        "forecast_days": max(1, (hours // 24) + 1),
        "timezone": "Asia/Kolkata",
    }

    try:
        return await _get_hourly(
            OPEN_METEO_AIR_QUALITY_URL,
            params,
            hours,
        )
    except UpstreamDataError:
        return _fallback_air_quality(hours)


async def _get_hourly(
    url: str,
    params: dict,
    hours: int,
) -> dict:
    """Fetch hourly data from Open-Meteo with retry handling."""

    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:

            for attempt in range(_MAX_RETRIES + 1):
                resp = await client.get(url, params=params)

                if resp.status_code == 429 and attempt < _MAX_RETRIES:
                    await asyncio.sleep(_RETRY_DELAY)
                    continue

                resp.raise_for_status()
                payload = resp.json()
                break

    except (httpx.HTTPError, ValueError) as exc:
        raise UpstreamDataError(
            f"Open-Meteo request to {url} failed: {exc}"
        ) from exc

    hourly = payload.get("hourly")

    if not hourly or "time" not in hourly:
        raise UpstreamDataError(
            f"Open-Meteo returned no hourly data from {url}"
        )

    return {
        key: series[:hours]
        for key, series in hourly.items()
    }


def _fallback_weather(hours: int) -> dict:
    """
    Deterministic fallback meteorology for demo continuity.

    This is used only when the live Open-Meteo weather request fails.
    """

    now = datetime.now().replace(minute=0, second=0, microsecond=0)

    times = []
    temperature = []
    humidity = []
    wind_speed = []
    wind_direction = []
    pbl = []
    radiation = []
    precipitation = []

    for i in range(hours):
        current = now + timedelta(hours=i)
        hour = current.hour

        # Simple smooth day/night cycle.
        daylight_factor = max(
            0.0,
            math.sin(math.pi * (hour - 6) / 12.0)
        ) if 6 <= hour <= 18 else 0.0

        temp = 22.0 + 8.0 * daylight_factor

        times.append(current.strftime("%Y-%m-%dT%H:%M"))
        temperature.append(round(temp, 1))
        humidity.append(round(75.0 - 25.0 * daylight_factor, 1))

        # Light-to-moderate winds with small hourly variation.
        wind_speed.append(
            round(1.5 + 0.8 * daylight_factor + 0.2 * math.sin(i), 1)
        )

        wind_direction.append(
            round((300.0 + 20.0 * math.sin(i / 6.0)) % 360.0, 1)
        )

        # Lower boundary layer at night, higher during daytime.
        pbl.append(
            round(180.0 + 700.0 * daylight_factor)
        )

        radiation.append(
            round(650.0 * daylight_factor, 1)
        )

        precipitation.append(0.0)

    return {
        "time": times,
        "temperature_2m": temperature,
        "relative_humidity_2m": humidity,
        "wind_speed_10m": wind_speed,
        "wind_direction_10m": wind_direction,
        "boundary_layer_height": pbl,
        "shortwave_radiation": radiation,
        "precipitation": precipitation,
    }


def _fallback_air_quality(hours: int) -> dict:
    """
    Deterministic fallback chemistry for demo continuity.

    This is used only when the live CAMS/Open-Meteo air-quality request fails.
    """

    now = datetime.now().replace(minute=0, second=0, microsecond=0)

    times = []
    pm2_5 = []
    pm10 = []
    ozone = []
    nitrogen_dioxide = []

    for i in range(hours):
        current = now + timedelta(hours=i)
        hour = current.hour

        # Higher particulate concentrations during low-dispersion periods.
        night_factor = (
            1.0
            if hour < 7 or hour >= 21
            else 0.0
        )

        pm25 = 85.0 + 25.0 * night_factor + 5.0 * math.sin(i / 5.0)
        pm10_value = 135.0 + 35.0 * night_factor + 8.0 * math.sin(i / 6.0)

        # Ozone follows a daytime pattern.
        daylight_factor = (
            max(0.0, math.sin(math.pi * (hour - 6) / 12.0))
            if 6 <= hour <= 18
            else 0.0
        )

        o3 = 25.0 + 30.0 * daylight_factor
        no2 = 32.0 + 12.0 * night_factor

        times.append(current.strftime("%Y-%m-%dT%H:%M"))
        pm2_5.append(round(max(pm25, 1.0), 1))
        pm10.append(round(max(pm10_value, 1.0), 1))
        ozone.append(round(max(o3, 1.0), 1))
        nitrogen_dioxide.append(round(max(no2, 1.0), 1))

    return {
        "time": times,
        "pm2_5": pm2_5,
        "pm10": pm10,
        "ozone": ozone,
        "nitrogen_dioxide": nitrogen_dioxide,
    }