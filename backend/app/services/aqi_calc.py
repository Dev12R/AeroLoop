"""
India CPCB National AQI: per-pollutant sub-index breakpoint tables and the
standard "dominant pollutant" combination rule.

Breakpoints are the official CPCB (Central Pollution Control Board) tables.
NO2 and O3 breakpoints are defined for 24-hr and 8-hr averages respectively;
we apply them directly to the hourly forecast values, which is the same
simplification most public real-time AQI displays make.
"""

from __future__ import annotations

# Each table: list of (conc_lo, conc_hi, aqi_lo, aqi_hi), ascending, µg/m3.
BREAKPOINTS = {
    "pm2_5": [
        (0, 30, 0, 50),
        (30, 60, 50, 100),
        (60, 90, 100, 200),
        (90, 120, 200, 300),
        (120, 250, 300, 400),
        (250, 380, 400, 500),
    ],
    "pm10": [
        (0, 50, 0, 50),
        (50, 100, 50, 100),
        (100, 250, 100, 200),
        (250, 350, 200, 300),
        (350, 430, 300, 400),
        (430, 510, 400, 500),
    ],
    "nitrogen_dioxide": [
        (0, 40, 0, 50),
        (40, 80, 50, 100),
        (80, 180, 100, 200),
        (180, 280, 200, 300),
        (280, 400, 300, 400),
        (400, 500, 400, 500),
    ],
    "ozone": [
        (0, 50, 0, 50),
        (50, 100, 50, 100),
        (100, 168, 100, 200),
        (168, 208, 200, 300),
        (208, 748, 300, 400),
        (748, 1000, 400, 500),
    ],
}

CATEGORIES = [
    (0, 50, "Good", "#4CAF50"),
    (50, 100, "Satisfactory", "#8BC34A"),
    (100, 200, "Moderate", "#FDD835"),
    (200, 300, "Poor", "#FB8C00"),
    (300, 400, "Very Poor", "#E53935"),
    (400, 10_000, "Severe", "#7B1E3B"),
]


def sub_index(pollutant: str, concentration: float) -> float:
    table = BREAKPOINTS.get(pollutant)
    if table is None or concentration is None:
        return 0.0
    concentration = max(0.0, concentration)
    for lo, hi, aqi_lo, aqi_hi in table:
        if concentration <= hi:
            if hi == lo:
                return aqi_lo
            frac = (concentration - lo) / (hi - lo)
            return aqi_lo + frac * (aqi_hi - aqi_lo)
    # Above the top breakpoint: extrapolate off the last band.
    lo, hi, aqi_lo, aqi_hi = table[-1]
    frac = (concentration - lo) / (hi - lo)
    return aqi_lo + frac * (aqi_hi - aqi_lo)


def category_for(aqi: float) -> dict:
    for lo, hi, label, color in CATEGORIES:
        if aqi <= hi:
            return {"label": label, "color": color}
    lo, hi, label, color = CATEGORIES[-1]
    return {"label": label, "color": color}


def combined_aqi(pollutant_concentrations: dict) -> dict:
    """
    CPCB combination rule: overall AQI is the MAX sub-index across
    pollutants, reported together with which pollutant is "dominant".
    """
    sub_indices = {
        p: round(sub_index(p, c), 1) for p, c in pollutant_concentrations.items()
    }
    if not sub_indices:
        return {"aqi": 0, "dominant_pollutant": None, "sub_indices": {}, **category_for(0)}

    dominant = max(sub_indices, key=sub_indices.get)
    aqi = sub_indices[dominant]
    return {
        "aqi": round(aqi),
        "dominant_pollutant": dominant,
        "sub_indices": sub_indices,
        **category_for(aqi),
    }
