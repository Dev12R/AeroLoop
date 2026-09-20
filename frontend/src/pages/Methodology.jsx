export default function Methodology() {
  return (
    <>
      <header className="page-header">
        <div>
          <p className="eyebrow">HOW THIS WORKS</p>
          <h1>Methodology &amp; Honest Limitations</h1>
        </div>
      </header>

      <div className="doc-page">
        <p>
          AeroLoop is a prototype coupled meteorology-chemistry forecasting system for
          Delhi NCR. It is built to demonstrate the <strong>two-way feedback loop</strong>{" "}
          the problem statement asks for -- inversion trapping pollutants, and pollutants
          in turn altering the boundary layer -- using real live data sources wherever
          possible, with a transparent, documented model filling the gaps a full
          regional WRF-Chem run would otherwise occupy.
        </p>

        <h2>Data sources (what's real)</h2>
        <ul>
          <li>
            <strong>Meteorology</strong> -- Open-Meteo's forecast API (ECMWF/ICON blend):
            temperature, wind speed/direction, shortwave radiation, and{" "}
            <strong>boundary-layer height</strong> are real modelled fields, hourly, out
            to several days. No API key required.
          </li>
          <li>
            <strong>Baseline chemistry</strong> -- Open-Meteo's air-quality API, backed by
            Copernicus <strong>CAMS</strong> (Copernicus Atmosphere Monitoring Service): a
            genuine operational coupled meteorology-chemistry system, same physics
            family as WRF-Chem, run at global/regional scale with real emission
            inventories including biomass burning. This is our chemistry baseline, not a
            synthetic stand-in.
          </li>
          <li>
            <strong>Stubble-burning fire activity</strong> -- NASA FIRMS active-fire
            detections when a free <code>FIRMS_MAP_KEY</code> is configured. Without one
            (the default), a deterministic seasonal model calibrated to the real
            Punjab/Haryana burning calendar (negligible outside Oct-Nov, peaking near
            Nov 5) stands in, clearly labelled <code>seasonal_model</code> in every API
            response so it's never mistaken for a live feed.
          </li>
        </ul>

        <h2>What AeroLoop adds on top</h2>
        <p>
          CAMS already couples meteorology and chemistry at its own resolution, but it
          doesn't resolve Delhi-NCR-scale aerosol-PBL feedback or explicitly attribute
          transported stubble smoke per station. AeroLoop's <code>coupling_engine.py</code>{" "}
          adds both, hour by hour across the 72-hour horizon:
        </p>
        <ol>
          <li>
            <strong>Chemistry &rarr; meteorology:</strong> during daylight hours, forecast
            PM2.5 attenuates a fraction of incoming solar radiation, which we translate
            into a proportional suppression of daytime convective boundary-layer growth
            (<code>aerosol_pbl_feedback_k</code>, tunable in <code>config.py</code>).
          </li>
          <li>
            <strong>Meteorology &rarr; chemistry:</strong> the resulting shallower boundary
            layer traps the same pollutant mass in a smaller volume, so PM2.5/PM10/NO2/O3
            are scaled back up by an inverse power of the PBL-height change (a standard
            well-mixed-box dilution relationship).
          </li>
          <li>
            <strong>Stubble-plume attribution:</strong> for each station and hour, we
            compare the forecast wind direction against the bearing to the
            Punjab/Haryana belt, weight by wind speed (advection efficiency) and fire
            intensity, and use that to estimate what fraction of the (already-coupled)
            PM2.5/PM10 is plausibly transported smoke rather than local emissions.
          </li>
        </ol>

        <div className="callout">
          AQI is computed from the coupled pollutant concentrations using the official
          CPCB (Central Pollution Control Board) National AQI breakpoint tables and the
          standard "dominant pollutant" combination rule.
        </div>

        <h2>What a full WRF-Chem deployment would add</h2>
        <p>
          This prototype is deliberately honest about the gap between a documented
          physical approximation and a production regional chemistry-transport model:
        </p>
        <ul>
          <li>
            Fine-grained (1-3 km) horizontal transport and terrain effects across the
            NCR, rather than a single wind-alignment heuristic per station.
          </li>
          <li>
            Full gas-phase photochemistry (real NOx-VOC-O3 chemistry, secondary aerosol
            formation) instead of a simplified dilution-based approximation for ozone.
          </li>
          <li>
            Near-real-time regional emission inventories (traffic, industry, construction
            dust) feeding the box model directly, rather than relying on CAMS's global
            inventory plus a bolt-on attribution layer.
          </li>
          <li>
            Ensemble runs for forecast uncertainty, and assimilation of live CPCB station
            observations to correct model drift hour by hour.
          </li>
        </ul>

        <div className="callout warn">
          Everything above is scoped for a hackathon prototype: reproducible, physically
          motivated, and clearly labelled where it substitutes for a full WRF-Chem run --
          not a claim that this <em>is</em> WRF-Chem.
        </div>
      </div>
    </>
  );
}
