# Model v2 — All-7 U-Net Anomaly Model

## Model Overview
- **Model Name:** OceanEmbed v2 (`runs/_final_v2/model_v2.pt`)
- **Architecture:** `BaselineModel` (2D U-Net CNN encoder-decoder with skip connections)
- **Parameters:** 7,851,215 (~7.85M parameters)
- **Input Channels:** 7 surface channels + NaN masks
  - `analysed_sst` (SST)
  - `sos` (SSS)
  - `sla` (SLA)
  - `u` (Current U)
  - `v` (Current V)
  - `uwnd` (Wind U)
  - `vwnd` (Wind V)
- **Output:** Joint 15-channel output tensor $(B, 15, H, W)$ for all native standard depth levels.

## Approach & Formulation
- **Formulation:** Anomaly prediction — model predicts $(\text{Target}_{GLORYS} - \text{Climatology}_{doy})$; climatology lookup table is added back at inference.
- **Loss:** Standard MSE-only loss on valid ocean pixels (no uncertainty head, no auxiliary terms).
- **Optimization:** AdamW optimizer, cosine annealing learning rate scheduler ($5 \times 10^{-4} \to 1 \times 10^{-6}$), batch size 2, gradient accumulation 4.
- **Training Duration:** ~40 minutes on NVIDIA RTX A2000 Laptop GPU (best epoch: 14).
- **Splits:**
  - Training: 2010–2020 (4,018 samples)
  - Validation: 2021 (365 samples)
  - Test: 2022 (365 samples)

## Test Results (2022 Test Split — 365 Days)
- **Test Overall RMSE:** **0.5246 °C**
- **Test Overall MAE:** **0.2331 °C**
- **Test Overall R²:** **0.9980**
- **Test Pearson r:** **0.9990**
- **Climatology Baseline RMSE:** 0.6429 °C
- **Improvement over Climatology:** **18.4%** (-0.1183 °C)
- **Improvement over v1 OceanEmbed (0.6047 °C):** **13.2%** (-0.0801 °C)

### Depth Band Performance
| Depth Band | v2 RMSE (°C) | v1 RMSE (°C) | Climatology (°C) | Δ vs Clim |
|:---|:---:|:---:|:---:|:---:|
| **Mixed Layer (0–50m)** | **0.4429** | 0.4840 | 0.4909 | -9.8% |
| **Thermocline (50–200m)** | **0.7331** | 0.8707 | 0.9466 | **-22.6%** |
| **Deep (200–1000m)** | **0.2565** | 0.2690 | 0.2612 | -1.8% |

### Input Variable Importance Ranking
From Phase 6.2 variable ablation:
1. **SLA (Sea Level Anomaly):** Accounts for 87.5% of total multi-variable gain ($0.6181 \to 0.5363\ ^\circ\text{C}$). Drives thermocline reconstruction ($0.9110 \to 0.7461\ ^\circ\text{C}$).
2. **SSS (Sea Surface Salinity):** Refines mixed layer and upper pycnocline ($0.5363 \to 0.5306\ ^\circ\text{C}$).
3. **Winds & Currents $(u, v, u_{wnd}, v_{wnd})$:** Surface shear and advection boundary layer refinements ($0.5306 \to 0.5246\ ^\circ\text{C}$).
4. **SST (Sea Surface Temperature):** Foundation layer; insufficient alone for subsurface stratification ($0.6181\ ^\circ\text{C}$).

## ARGO Independent Validation (In-Situ Profiles)

> **Issue #22 fix applied (2026-10-06):** argo_service.py MODEL_DEPTHS channels 11-13 were annotated 85-279 m shallower than their actual GLORYS zarr depths, producing a spurious -1.9 to -2.7 C deep-layer bias. After correction, the real ARGO RMSE is shown below.

- **N profiles:** 8,881 collocated (NIO, 2020-2022)
- **Overall RMSE:** **0.910 C** (pre-fix was 1.572 C -- measurement artifact, not model deficiency)
- **Overall Bias:** +0.041 C
- **Correlation (r):** 0.992

### Per-Band RMSE
| Band | Depths | RMSE (C) |
|------|--------|----------|
| Mixed layer | 0-50 m | 0.954 |
| Thermocline | 50-200 m | 1.127 |
| Deep | >200 m | 0.370 |

### Seasonal RMSE (NIO)
| Season | Period | N | RMSE | Bias |
|--------|--------|---|------|------|
| Pre-monsoon | Mar-May | 2,261 | 1.045 C | +0.114 C |
| Monsoon | Jun-Sep | 3,033 | 0.932 C | +0.004 C |
| Post-monsoon | Oct-Dec | 2,146 | 0.835 C | +0.033 C |
| Winter | Jan-Feb | 1,441 | 0.763 C | +0.018 C |

### Regional RMSE
| Region | Best Season | Best RMSE | Worst Season | Worst RMSE |
|--------|------------|-----------|--------------|------------|
| Arabian Sea | Winter | 0.706 C | Pre-monsoon | 1.095 C |
| Bay of Bengal | Post-monsoon | 0.672 C | Pre-monsoon | 0.953 C |
