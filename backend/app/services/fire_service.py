"""
Regional stubble-burning signal for the Punjab/Haryana crop-residue belt.

Live source: NASA FIRMS (Fire Information for Resource Management System)
active-fire detections, when a free MAP_KEY is configured (get one at
https://firms.modaps.eosdis.gov/api/area/). Set the FIRMS_MAP_KEY
environment variable to enable it.

Fallback: without a key (the default out-of-the-box state), we use a
deterministic seasonal model calibrated to the well-documented real-world
pattern -- Punjab/Haryana paddy-residue burning is negligible outside
Oct-Nov and ramps up through October to a peak in early-to-mid November
after the paddy harvest, then drops off. This is clearly labelled in the
API response as "seasonal_model" so it is never mistaken for a live feed.
"""

from __future__ import annotations

import hashlib
import math
from datetime import date, datetime, timedelta

import httpx

from ..config import FIRMS_AREA_URL, FIRMS_BBOX, FIRMS_MAP_KEY

_TIMEOUT = httpx.Timeout(15.0, connect=10.0)


async def get_fire_activity(target_date: date | None = None) -> dict:
    """
    Fire activity summary for the stubble belt on `target_date` (default:
    today). Returns fire_count (detections) and mean_frp (fire radiative
    power, MW -- a standard intensity proxy for biomass-burning emissions).
    """
    target_date = target_date or datetime.now().date()

    if FIRMS_MAP_KEY:
        live = await _fetch_firms_live()
        if live is not None:
            return live

    return _seasonal_model(target_date)


async def forecast_fire_activity(hours: int, start: datetime | None = None) -> list[dict]:
    """
    Per-hour fire-activity series for the forecast horizon. FIRMS only
    reports observed (past) detections, so even on the live path we persist
    the most recent observed intensity forward -- crop-residue fires are
    day-scale phenomena that don't swing hour to hour the way weather does.
    """
    start = start or datetime.now()
    day_cache: dict[date, dict] = {}
    series = []
    for h in range(hours):
        ts = start + timedelta(hours=h)
        d = ts.date()
        if d not in day_cache:
            day_cache[d] = await get_fire_activity(d)
        series.append({"time": ts.isoformat(timespec="minutes"), **day_cache[d]})
    return series


async def _fetch_firms_live() -> dict | None:
    url = f"{FIRMS_AREA_URL}/{FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/{FIRMS_BBOX}/1"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            text = resp.text
    except httpx.HTTPError:
        return None

    lines = [ln for ln in text.strip().splitlines() if ln.strip()]
    if len(lines) < 2:
        return None
    header = lines[0].split(",")
    try:
        frp_idx = header.index("frp")
    except ValueError:
        frp_idx = None

    frps = []
    for row in lines[1:]:
        cells = row.split(",")
        if frp_idx is not None and frp_idx < len(cells):
            try:
                frps.append(float(cells[frp_idx]))
            except ValueError:
                pass

    return {
        "source": "firms_live",
        "is_live": True,
        "fire_count": len(lines) - 1,
        "mean_frp_mw": round(sum(frps) / len(frps), 1) if frps else 0.0,
    }


def _seasonal_model(target_date: date) -> dict:
    """
    Deterministic bell-curve seasonal model, peaking ~Nov 5, active roughly
    Oct 1 - Nov 30, near zero the rest of the year. A per-day pseudo-random
    jitter (seeded by the date, so results are reproducible) stands in for
    day-to-day weather-driven burning variability.
    """
    peak_day = date(target_date.year, 11, 5)
    days_from_peak = (target_date - peak_day).days
    # Gaussian-ish season shape, ~23-day standard deviation either side.
    season_factor = math.exp(-(days_from_peak**2) / (2 * 23**2))

    seed = int(hashlib.sha256(target_date.isoformat().encode()).hexdigest()[:8], 16)
    jitter = 0.75 + 0.5 * ((seed % 1000) / 1000.0)  # 0.75x - 1.25x

    peak_fire_count = 5500  # order-of-magnitude of real peak-day VIIRS detections across the belt
    peak_mean_frp = 18.0  # MW, typical stubble-fire FRP

    fire_count = round(peak_fire_count * season_factor * jitter)
    mean_frp = round(peak_mean_frp * (0.6 + 0.4 * season_factor) * jitter, 1) if fire_count > 0 else 0.0

    return {
        "source": "seasonal_model",
        "is_live": False,
        "fire_count": fire_count,
        "mean_frp_mw": mean_frp,
    }
