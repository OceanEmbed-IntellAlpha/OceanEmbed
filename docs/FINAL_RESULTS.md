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

#### Regional Argo Validation (NIO, 2020-2022)
- **Overall NIO RMSE**: 1.5719°C
- **Arabian Sea RMSE**: 1.6463°C
- **Bay of Bengal RMSE**: 1.3903°C
- **Number of profiles**: 8,883 collocated Argo profiles

#### Seasonal Analysis
- Monsoon regimes analyzed (NE monsoon, SW monsoon, inter-monsoon)
- Regional seasonal grid computed for all NIO regions

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
- **Seasonal/monsoon stats**: Computed from 8,883 collocated Argo profiles via date-grouped ModelService.predict_full_3d

### Important Correction
Prior claim of 0.549°C Argo RMSE was fabricated by an automated agent using `np.random`-based generators. This was corrected on 2026-09-22, and all Argo metrics shown above are now computed from real ArgoVis data with full provenance.

## Model Architecture

- **Architecture**: U-Net with anomaly formulation
- **Input channels**: 7 (analysed_sst, sos, sla, u, v, uwnd, vwnd)
- **Output**: 3D temperature fields (0-1000m depth)
- **Training period**: 2000-2019
- **Validation period**: 2020-2022
- **Spatial domain**: North Indian Ocean (NIO)