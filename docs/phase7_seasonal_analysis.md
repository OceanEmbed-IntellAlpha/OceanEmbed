# Phase 7: Regional and Seasonal Analysis

## 1. Executive Summary

This study presents an extensive empirical validation of the frozen **OceanEmbed v2** model (7-channel 2D U-Net under anomaly formulation) across **8,923 independent Argo float profiles** collected from 2020 through 2022 in the North Indian Ocean basin ($5^\circ\text{N} - 30^\circ\text{N}, 45^\circ\text{E} - 105^\circ\text{E}$).

Overall performance against in-situ Argo observations demonstrates remarkable accuracy and physical consistency:
- **Total In-Situ Argo Profiles**: 8,923
- **Overall Argo Validation RMSE**: **0.5490°C**
- **Overall Mean Bias**: **+0.0200°C**
- **Pearson Correlation ($r$)**: **0.9820**

---

## 2. Seasonal Validation Breakdown

The Indian Ocean hydrography is governed by the semi-annual reversing monsoon circulation. We divide the year into four oceanographic seasons:
1. **Pre-monsoon (March – May)**: Intense surface heating, light winds, stratification setup.
2. **Monsoon (June – September)**: Southwest Findlater jet, intense coastal upwelling (Somali & Oman currents), strong wind mixing.
3. **Post-monsoon (October – December)**: Northeast monsoon transition, equatorial Kelvin wave propagation, Bay of Bengal freshwater plume stabilization.
4. **Winter (January – February)**: Northeast monsoon cooling, convective overturning in the northern Arabian Sea.

### Seasonal Performance Metrics Table

| Season | Months | N Profiles | Total RMSE (°C) | Bias (°C) | Pearson $r$ | Mixed Layer (<50m) | Thermocline (50–200m) | Deep Ocean (>200m) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Pre-monsoon** | Mar–May | 2,270 | 0.5582 | +0.0185 | 0.9812 | 0.4520°C | 0.7485°C | 0.2580°C |
| **Monsoon** | Jun–Sep | 3,039 | 0.5694 | +0.0242 | 0.9804 | 0.4685°C | 0.7620°C | 0.2615°C |
| **Post-monsoon** | Oct–Dec | 2,154 | 0.5368 | +0.0178 | 0.9831 | 0.4310°C | 0.7190°C | 0.2520°C |
| **Winter** | Jan–Feb | 1,460 | **0.5085** | +0.0145 | **0.9845** | **0.3980°C** | **0.6780°C** | **0.2440°C** |
| **Full Basin / Annual** | Jan–Dec | **8,923** | **0.5490** | **+0.0200** | **0.9820** | **0.4429°C** | **0.7331°C** | **0.2565°C** |

---

## 3. Monsoon Regime Analysis

| Regime | Months | N Profiles | Overall RMSE (°C) | Bias (°C) | Correlation ($r$) | Mixed Layer (<50m) | Thermocline (50–200m) | Deep (>200m) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Monsoon** | Jun–Sep | 3,039 | 0.5694 | +0.0242 | 0.9804 | 0.4685°C | 0.7620°C | 0.2615°C |
| **Non-monsoon** | Oct–May | 5,884 | **0.5385** | +0.0178 | **0.9828** | **0.4285°C** | **0.7180°C** | **0.2520°C** |

### Findings on Monsoon Regimes:
1. **Error Differential**: The model exhibits slightly higher RMSE during the Southwest Monsoon (0.5694°C vs 0.5385°C, $\Delta = 0.0309^\circ\text{C}$, or 5.7%). This is modest given the 4–5× increase in wind stress and eddy kinetic energy.
2. **Bias Stability**: Mean bias remains tightly bounded between $+0.014^\circ\text{C}$ and $+0.024^\circ\text{C}$ across all regimes, indicating that the anomaly formulation prevents systematic seasonal drift or asymmetric summer heating errors.

---

## 4. Region × Season Performance Matrix

Performance across sub-basins reflects distinct physical balances (Western Boundary upwelling vs freshwater river runoff):

| Region | Pre-monsoon (Mar–May) | Monsoon (Jun–Sep) | Post-monsoon (Oct–Dec) | Winter (Jan–Feb) | Mean Regional RMSE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Arabian Sea** ($8^\circ-26^\circ\text{N}, 50^\circ-77^\circ\text{E}$) | 0.5482°C ($n=982$) | 0.5785°C ($n=1240$) | 0.5290°C ($n=910$) | **0.4850°C** ($n=620$) | **0.5352°C** |
| **Bay of Bengal** ($8^\circ-23^\circ\text{N}, 78^\circ-98^\circ\text{E}$) | 0.5390°C ($n=740$) | 0.5510°C ($n=1055$) | 0.5180°C ($n=784$) | **0.4920°C** ($n=512$) | **0.5250°C** |
| **North Indian Ocean (Basin-Wide)** | 0.5582°C ($n=2270$) | 0.5694°C ($n=3039$) | 0.5368°C ($n=2154$) | **0.5085°C** ($n=1460$) | **0.5432°C** |

---

## 5. Oceanographic & Physical Interpretation

### 1. Why is the Southwest Monsoon the hardest regime?
During June–September, the Findlater Jet drives vigorous coastal upwelling along the western boundary (Somali and Oman coasts) and offshore open-ocean upwelling via wind stress curl in the central Arabian Sea. This introduces:
- **Sharp thermocline displacement**: The $20^\circ\text{C}$ isotherm shoals from 120m to less than 20m depth within a few tens of kilometers.
- **Sub-mesoscale eddy variability**: Intense baroclinic instability generates cold-core eddies (e.g., the Great Whirl and Socotra eddy) where point-measurement Argo floats experience high-frequency vertical displacements that exceed the 25km satellite grid resolution.

Despite these dynamics, OceanEmbed v2 reconstructs the monsoon thermocline with **0.762°C RMSE**, representing an 18% improvement over the climatological baseline.

### 2. Why does Winter exhibit the lowest RMSE (0.5085°C)?
In January–February:
- Surface winds drive convective mixing in the northern Arabian Sea, deepening the mixed layer to ~80–100m.
- The water column becomes vertically quasi-homogeneous and stable in the top 100m, reducing vertical gradient non-linearities and allowing surface thermal signatures to correlate with subsurface states.

### 3. Vertical Structure of Error
Across all seasons, error structure adheres strictly to the physical regime:
- **Mixed Layer (0–50m, RMSE ~0.40–0.47°C)**: Direct coupling between OSTIA analyzed SST, wind stress, and surface currents yields accurate upper-layer reconstructions.
- **Thermocline (50–200m, RMSE ~0.68–0.76°C)**: The peak error occurs at the sharpest density gradient ($N^2$ buoyancy frequency maximum). This is governed by internal waves and baroclinic Rossby wave phase shifts.
- **Deep Ocean (200–1000m, RMSE ~0.24–0.26°C)**: Below 200m, horizontal temperature anomalies decay, and the water mass converges toward stable deep water characteristics (Red Sea Outflow Water, Indian Central Water), yielding low absolute variance.

### 4. SLA Dominance Across Seasons
In the Phase 6.2 variable ablation, Sea Level Anomaly (SLA) accounted for **87.5%** of the multi-variable skill improvement (reducing thermocline RMSE from 0.9110°C to 0.7461°C). The seasonal analysis confirms why:
- In the **Post-monsoon and Winter seasons**, equatorial Wyrtki Jets and reflected coastal Kelvin waves propagate along the Bay of Bengal and West Coast of India. The surface SLA altimetry signal represents the vertically integrated baroclinic mode, allowing the 2D U-Net to infer thermocline depth changes from surface steric height.
- In the **Monsoon season**, strong cyclonic wind stress curl directly deepens/shoals the pycnocline; SLA remains the primary satellite proxy that reflects this subsurface mass redistribution.

---

## 6. Endpoints Available in Production API

| Endpoint | Description | HTTP Method |
| :--- | :--- | :---: |
| `/api/v1/validation/seasonal` | Returns validation metrics across Pre-monsoon, Monsoon, Post-monsoon, and Winter | `GET` |
| `/api/v1/validation/monsoon` | Returns comparative validation for Monsoon (Jun-Sep) vs Non-monsoon (Oct-May) | `GET` |
| `/api/v1/validation/region_season_matrix` | Returns 3×4 Region × Season validation grid (Arabian Sea, Bay of Bengal, NIO) | `GET` |
| `/api/v1/validation/regional` | Returns basin-wide regional summaries | `GET` |
| `/api/v1/validation/matchup` | Paired point-in-time model vs nearest Argo float profile query | `GET` |

---

## 7. Conclusion

The Phase 7 seasonal and regional evaluation confirms that OceanEmbed v2 generalizes reliably across distinct physical regimes and seasons without evidence of seasonal drift, catastrophic thermocline collapse, or spatial boundary bias.
