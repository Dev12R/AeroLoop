# AeroLoop Methodology

## Problem framing

Delhi NCR's winter AQI crises are driven by a genuine two-way feedback loop:
atmospheric inversion layers trap particulate matter near the ground, and the
resulting aerosol loading blocks sunlight, which alters temperature, wind, and
boundary-layer (PBL) height -- which changes how much the *next* hour of
pollution gets trapped. Standard AQI forecasts that treat meteorology and
chemistry as independent inputs miss this compounding effect. A full regional
WRF-Chem run resolves it properly, at the cost of HPC-cluster compute time,
custom emission inventories, and hours-to-days of run time per forecast --
infeasible to actually execute for a hackathon prototype.

AeroLoop's approach: use real operational coupled-model output as the
baseline, and add a transparent, documented physical correction on top that
specifically targets the two mechanisms the problem statement calls out --
aerosol-PBL feedback and stubble-burning transport -- at Delhi-NCR scale.

## Data sources

| Source | What it provides | Real-time? | Key needed? |
|---|---|---|---|
| Open-Meteo Forecast API (ECMWF/ICON) | temperature, wind speed/direction, shortwave radiation, **boundary-layer height** | Yes, live, hourly, 72h+ horizon | No |
| Open-Meteo Air Quality API (Copernicus CAMS) | PM2.5, PM10, O3, NO2 forecast | Yes, live, hourly, ~5-day horizon | No |
| NASA FIRMS (VIIRS active-fire) | Punjab/Haryana fire detections + FRP | Yes, if configured | Yes (free) |
| Seasonal fallback model | Deterministic Oct-Nov burning-season curve, calibrated to the real calendar shape | No -- clearly labelled `seasonal_model` in every response | No |

CAMS is itself a genuine coupled meteorology-chemistry system (same physics
family as WRF-Chem, run at global/regional scale with real biomass-burning
emissions in its inventory) -- it is not a placeholder. AeroLoop treats it as
the chemistry baseline and adds a station-level correction CAMS's resolution
doesn't resolve.

## The coupling algorithm (`backend/app/services/coupling_engine.py`)

Run independently per station, per forecast hour, in this order:

**1. Chemistry -> meteorology (aerosol-PBL feedback).**
During daylight hours (`shortwave_radiation > 50 W/m^2`), forecast PM2.5 is
normalised into an aerosol index (`pm2_5 / 300`, clamped to [0,1]) and used to
shrink the baseline PBL height:

```
feedback_multiplier = 1 - k * aerosol_index      (k = 0.35, config.py)
pbl_corrected = max(floor, pbl_baseline * feedback_multiplier)
```

This encodes the physical mechanism directly: heavier aerosol loading
attenuates incoming solar radiation, which suppresses the convective heating
that drives daytime PBL growth. At night, radiative cooling (not aerosol
loading) already governs the shallow nocturnal PBL, so the correction is not
applied then -- baseline and coupled values are identical overnight by design
(visible in the dashboard's line charts).

**2. Meteorology -> chemistry (dilution feedback).**
A shallower boundary layer traps the same emitted pollutant mass in a smaller
mixing volume. Concentrations are scaled up by an inverse power of the PBL
height ratio:

```
dilution_ratio = pbl_baseline / pbl_corrected     (>= 1)
pm2_5_coupled  = pm2_5_baseline * dilution_ratio ** 0.45
```

Ozone uses a dampened exponent (half the PM2.5/PM10/NO2 exponent) as a
simplification of the weaker, more complex ozone response to PBL trapping
(titration by fresh NOx at night vs. photochemical buildup by day) -- flagged
explicitly here rather than modelled in full, since that requires real
gas-phase photochemistry.

**3. Stubble-burning attribution.**
For each hour, wind direction is compared against the bearing from the
station to the Punjab/Haryana belt centroid (30.5N, 75.5E):

```
alignment_score       = max(0, 1 - angular_diff / 80)      # 1 = wind straight from the belt
transport_efficiency  = alignment_score * clamp(wind_speed_ms / 4, 0, 1)
fire_intensity_norm   = clamp(fire_count / 6000, 0, 1)
attributed_fraction   = 0.55 * transport_efficiency * fire_intensity_norm
```

`attributed_fraction` of the (already dilution-corrected) PM2.5/PM10 is
reported as the plausible transported-smoke contribution -- an attribution
decomposition of the existing CAMS forecast, not additive double-counting.

**4. Inversion strength index.**
```
inversion_strength = 100 * (1 - pbl_corrected / 1800)      # clamped [0,100]
```
1800 m stands in for a well-mixed daytime reference PBL; a fully collapsed
PBL (near the 50 m floor) scores close to 100.

**5. AQI.**
Both baseline and coupled pollutant sets are run through the official CPCB
National AQI breakpoint tables (`aqi_calc.py`) and the standard max-sub-index
"dominant pollutant" rule, so the dashboard can show exactly how much the
coupling correction moves the reported AQI category.

## Known simplifications (what a real WRF-Chem deployment adds)

- **Horizontal transport**: a single wind-alignment heuristic per station
  stands in for real 1-3 km grid advection and terrain-following flow across
  the NCR basin.
- **Photochemistry**: ozone's NOx-VOC-O3 chemistry and secondary aerosol
  formation are approximated by a dampened dilution exponent, not solved.
- **Emissions**: local traffic/industry/construction-dust emissions aren't
  modelled explicitly; CAMS's global inventory plus the stubble-attribution
  layer stand in for a real regional emissions inventory.
- **Calibration**: the coupling coefficients (`k = 0.35`, dilution exponent
  `0.45`, max stubble fraction `0.55`, etc., all in `config.py`) are physically
  motivated starting points, not fit against CPCB ground-truth observations.
  A production version would calibrate these against historical station data.
- **Uncertainty**: no ensemble spread; a single deterministic trajectory per
  hour.

These are deliberate, load-bearing scope cuts for a demoable prototype, and
every one is structured so it's a config change or an added module rather
than a rewrite -- e.g. swapping in real CPCB station observations to bias-
correct the box model, or replacing the wind-alignment heuristic with an
actual back-trajectory (HYSPLIT-style) calculation.
