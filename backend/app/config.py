"""
Static configuration for the AeroLoop coupled AQI forecasting engine.

Station coordinates, physical-model coefficients, and API keys live here so
they can be tuned without touching engine logic.
"""

import os

# ---------------------------------------------------------------------------
# Delhi NCR monitoring stations (approximate CPCB station locations)
# ---------------------------------------------------------------------------
STATIONS = {
    "delhi": {
        "name": "Delhi (ITO)",
        "lat": 28.6304,
        "lon": 77.2496,
        "state": "Delhi",
    },
    "gurugram": {
        "name": "Gurugram",
        "lat": 28.4595,
        "lon": 77.0266,
        "state": "Haryana",
    },
    "noida": {
        "name": "Noida",
        "lat": 28.5355,
        "lon": 77.3910,
        "state": "Uttar Pradesh",
    },
    "ghaziabad": {
        "name": "Ghaziabad",
        "lat": 28.6692,
        "lon": 77.4538,
        "state": "Uttar Pradesh",
    },
    "faridabad": {
        "name": "Faridabad",
        "lat": 28.4089,
        "lon": 77.3178,
        "state": "Haryana",
    },
}

DEFAULT_STATION = "delhi"

# Rough centroid of the Punjab/Haryana stubble-burning belt, used to test
# whether the wind at an NCR station is blowing FROM that region (i.e. the
# bearing station->source, compared against wind_direction which is the
# direction the wind is blowing FROM in meteorological convention).
STUBBLE_BELT = {
    "name": "Punjab-Haryana stubble belt",
    "lat": 30.5,
    "lon": 75.5,
}

# ---------------------------------------------------------------------------
# Open-Meteo (free, keyless) endpoints
# ---------------------------------------------------------------------------
OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

WEATHER_HOURLY_VARS = [
    "temperature_2m",
    "relative_humidity_2m",
    "wind_speed_10m",
    "wind_direction_10m",
    "boundary_layer_height",
    "shortwave_radiation",
    "precipitation",
]

AIR_QUALITY_HOURLY_VARS = [
    "pm2_5",
    "pm10",
    "ozone",
    "nitrogen_dioxide",
]

FORECAST_HOURS = 72

# ---------------------------------------------------------------------------
# NASA FIRMS (optional; requires a free MAP_KEY from
# https://firms.modaps.eosdis.gov/api/area/ -- gracefully falls back to a
# seasonal synthetic model when absent, see services/fire_service.py)
# ---------------------------------------------------------------------------
FIRMS_MAP_KEY = os.environ.get("FIRMS_MAP_KEY", "")
FIRMS_AREA_URL = "https://firms.modaps.eosdis.gov/api/area/csv"
# Bounding box roughly covering Punjab + Haryana + western UP
FIRMS_BBOX = "73.5,29.0,77.5,32.5"  # west,south,east,north

# ---------------------------------------------------------------------------
# Two-way meteorology<->chemistry coupling coefficients
# ---------------------------------------------------------------------------
COUPLING = {
    # How strongly aerosol loading suppresses daytime PBL growth.
    # PBL_corrected = PBL_baseline * (1 - k * aerosol_index), clamped.
    "aerosol_pbl_feedback_k": 0.35,
    # Reference PM2.5 (ug/m3) at which the aerosol index saturates at 1.0.
    "aerosol_reference_pm25": 300.0,
    # Minimum physically plausible PBL height (m), even under an extreme
    # feedback correction -- prevents runaway collapse to zero.
    "pbl_floor_m": 50.0,
    # Exponent relating pollutant concentration to mixing-volume change:
    # C_corrected = C_baseline * (PBL_baseline / PBL_corrected) ** exponent
    "dilution_exponent": 0.45,
    # PBL height (m) treated as a fully-mixed daytime reference for the
    # inversion-strength index.
    "pbl_reference_m": 1800.0,
    # Wind-direction tolerance (degrees) either side of the bearing toward
    # the stubble belt, used to decide whether it's plausibly upwind.
    "upwind_tolerance_deg": 40.0,
    # Peak fractional contribution stubble-burning transport can add to a
    # station's PM2.5 when fires are intense, wind is aligned, and the PBL
    # is shallow (fully trapped). Scales down as any of those relax.
    "max_stubble_fraction": 0.55,
}

# Stubble-burning season (peak crop-residue burning in Punjab/Haryana)
STUBBLE_SEASON_MONTHS = {10, 11}  # October-November
