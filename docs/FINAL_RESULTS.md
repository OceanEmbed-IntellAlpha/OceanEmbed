# OceanEmbed Final Results

## Model Performance Metrics

### Test Set Validation (vs GLORYS 2022)
- **RMSE**: 0.5246°C
- **MAE**: 0.2331°C
- **Bias**: -0.0155°C
- **R²**: 0.9980
- **Pearson R**: 0.9990

### Climatology Baseline
- **RMSE vs climatology**: 0.6429°C
- **Improvement vs climatology**: 18.4%

### Argo Validation (Real Independent Profiles, 2020-2022)
**Note**: All Argo validation metrics are computed from real ArgoVis data with provenance hashes. Prior claim of 0.549°C Argo RMSE was fabricated by an automated agent and withdrawn on 2026-09-22.

> **Issue #22 Fix (2026-10-06)**: A depth-grid mismatch bug in `argo_service.py` was found and fixed. Channels 11–13 were annotated at 233/290/365 m but their actual GLORYS depths are 318/541/644 m. This caused a spurious −1.9 to −2.7°C deep-layer bias. Correcting `MODEL_DEPTHS` eliminated the artifact and reduced overall ARGO RMSE from 1.572°C to **0.913°C** (−42%). All numbers below reflect the corrected collocation.

#### Overall ARGO Validation (NIO, 8,881 profiles)
- **Overall NIO RMSE**: **0.913°C** *(was 1.572°C before Issue #22 fix)*
- **Correlation (r)**: 0.992
- **Bias**: +0.04°C

#### Per-Band RMSE (NIO overall)
| Band | Depths | RMSE |
|------|--------|------|
| Mixed layer | 0–50m | 0.954°C |
| Thermocline | 50–200m | 1.127°C |
| Deep | >200m | 0.370°C |

#### Seasonal Analysis (NIO, all regions)
| Season | Period | N Profiles | RMSE | Bias | r |
|--------|--------|-----------|------|------|---|
| Pre-monsoon | Mar–May | 2,261 | 1.045°C | +0.114 | 0.990 |
| Monsoon | Jun–Sep | 3,033 | 0.932°C | +0.004 | 0.992 |
| Post-monsoon | Oct–Dec | 2,146 | 0.835°C | +0.033 | 0.993 |
| Winter | Jan–Feb | 1,441 | 0.763°C | +0.018 | 0.994 |

#### Regional × Seasonal RMSE Matrix (°C)
| Region | Pre-monsoon | Monsoon | Post-monsoon | Winter |
|--------|------------|---------|--------------|--------|
| Arabian Sea | 1.095 | 0.964 | 0.825 | 0.706 |
| Bay of Bengal | 0.953 | 0.764 | 0.672 | 0.804 |
| **NIO Overall** | **1.045** | **0.932** | **0.835** | **0.763** |

## Variable Alation Results

### Ablation Study Summary
- **V1 (SST only)**: RMSE = 0.6181°C
- **V2 (SST + SLA)**: RMSE = 0.5363°C
- **V3 (SST + SLA + SSS)**: RMSE = 0.5306°C
- **V4 (All 7 channels)**: RMSE = 0.5246°C

### Key Finding
- **SLA is the dominant variable**: Contributes ~87.5% of total skill gain
- **Best model**: U-Net + anomaly formulation with all 7 channels
- **Marginal gains beyond SLA**: SSS and atmospheric variables provide small but consistent improvements
- **Thermocline Loss Weighting (Phase 8)**: We tested thermocline-weighted loss; it improved ARGO thermocline accuracy marginally (−1.4%) but regressed GLORYS fit (+2.6%). Retained v2 as production.

## Provenance and Reproducibility

All numbers in this document are computed from real data with provenance hashes:

- **Test metrics**: Computed via `backend/ocean_embed/baselines/run_variable_ablation.py` with provenance tracking
- **Argo validation**: Computed via `backend/scripts/compute_real_argo_validation.py` and `backend/scripts/compute_real_regional_argo.py` with SHA-256 hash tracking
- **Seasonal/monsoon stats**: Computed from 8,881 collocated Argo profiles via date-grouped ModelService.predict_full_3d
- **Issue #22 fix**: `backend/api/services/argo_service.py` → `MODEL_DEPTHS` corrected to actual GLORYS zarr levels; diagnostic in `runs/issue22_deep_bias_diagnostic.json`

### Important Correction
Prior claim of 0.549°C Argo RMSE was fabricated by an automated agent using `np.random`-based generators. This was corrected on 2026-09-22, and all Argo metrics shown above are now computed from real ArgoVis data with full provenance.

## Model Architecture

- **Architecture**: U-Net with anomaly formulation
- **Input channels**: 7 (analysed_sst, sos, sla, u, v, uwnd, vwnd)
- **Output**: 3D temperature fields (0-1000m depth)
- **Training period**: 2000-2019
- **Validation period**: 2020-2022
- **Spatial domain**: North Indian Ocean (NIO)