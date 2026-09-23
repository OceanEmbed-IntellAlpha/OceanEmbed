# Phase 6 Findings: Architecture, Loss, and Variable Ablations

This document synthesizes the experimental results from **Phase 6** of the OceanEmbed project, covering:
1. **Phase 6.1:** Loss ablation and decoder architecture investigation.
2. **Phase 6.2:** Input variable ablation (SST, SLA, SSS, Wind, Currents).
3. Selection and freezing of **OceanEmbed v2** (`runs/_final_v2/model_v2.pt`).

---

## 1. The 4-Model Variable Ablation Suite (Phase 6.2)

All models were evaluated on the 2022 test split (365 daily fields over the North Indian Ocean at 15 native standard depth levels).

| Variant | Input Variables | # Vars | Test RMSE (°C) | Test MAE (°C) | Test R² | Improvement vs Clim | Δ vs All-7 (v2) |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Climatology** | None *(DOY Lookup Table)* | 0 | 0.6429 | 0.2719 | 0.9970 | 0.0% | +0.1183 |
| **V1** | `SST` only | 1 | 0.6181 | 0.2619 | 0.9972 | -3.9% (-0.0248 °C) | +0.0935 |
| **V2** | `SST + SLA` | 2 | 0.5363 | 0.2388 | 0.9979 | -16.6% (-0.1066 °C) | +0.0117 |
| **V3** | `SST + SLA + SSS` | 3 | 0.5306 | 0.2336 | 0.9980 | -17.5% (-0.1123 °C) | +0.0060 |
| **V4 (v2)** | `All 7 variables` | 7 | **0.5246** | **0.2331** | **0.9980** | **-18.4% (-0.1183 °C)** | **0.0000** |

---

## 2. Per-Depth-Band Breakdown

| Depth Band | V1 (SST) | V2 (SST+SLA) | V3 (SST+SLA+SSS) | V4 (All 7 — v2) | Climatology |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Mixed Layer (0–50 m)** | 0.4670 °C | 0.4599 °C | 0.4493 °C | **0.4429 °C** | 0.4909 °C |
| **Thermocline (50–200 m)** | 0.9110 °C | 0.7461 °C | 0.7415 °C | **0.7331 °C** | 0.9466 °C |
| **Deep (200–1000 m)** | 0.2613 °C | 0.2562 °C | **0.2560 °C** | 0.2565 °C | 0.2612 °C |

---

## 3. The SLA-Dominance Finding

The single most consequential insight from Phase 6.2 is that **Sea Level Anomaly (SLA) accounts for 87.5% of the total skill gain** achievable by combining multiple satellite observations:

$$\Delta \text{RMSE}_{\text{SLA}} = 0.6181 - 0.5363 = 0.0818\ ^\circ\text{C} \quad (87.5\%\ \text{of the total}\ 0.0935\ ^\circ\text{C}\ \text{drop from V1 to V4})$$

- **SST Alone is Insufficient:** Sea Surface Temperature only informs the top skin layer ($0–20\text{ m}$). By $77.85\text{ m}$ depth, the SST-only model errors explode to $0.973\ ^\circ\text{C}$ and peak at $1.108\ ^\circ\text{C}$ at $92.33\text{ m}$.
- **SLA Restores the Entire Thermocline:** Introducing SLA drops the thermocline band error from $0.9110\ ^\circ\text{C} \to 0.7461\ ^\circ\text{C}$ (a **$0.1649\ ^\circ\text{C}$ / 18.1% improvement**).

---

## 4. Physical Oceanographic Interpretation: SLA $\longleftrightarrow$ Thermocline Depth

Why is SLA so dominant?

1. **Integrated Steric Height & Baroclinic Modes:**  
   Sea level variations measured by satellite radar altimetry represent the vertically integrated density anomaly of the ocean column:
   $$\eta(x,y) = -\frac{1}{\rho_0} \int_{-H}^0 \rho'(x,y,z)\,dz$$
   In the tropical and subtropical Indian Ocean, density anomalies are dominated by thermal expansion in the upper $300\text{ m}$.
2. **Two-Layer Dynamic Height Proxy:**  
   Under a reduced-gravity two-layer ocean approximation, the sea surface elevation $\eta$ is directly proportional to the downward displacement of the main thermocline $h'$:
   $$h'(x,y) \approx -\frac{g}{g'} \eta(x,y)$$
   where $g' = g \frac{\Delta \rho}{\rho_0}$ is reduced gravity. A positive SLA anomaly of $+10\text{ cm}$ corresponds to a deep depression of the thermocline by $+20\text{ to }30\text{ m}$, preventing cold subsurface water from rising.
3. **Eddy and Wave Propagation:**  
   Mesoscale eddies (cyclonic cold-core vs. anticyclonic warm-core) and planetary Rossby/Kelvin waves modulate thermocline depth horizontally. Altimetry (SLA) directly maps these coherent features, enabling the spatial convolutions in the U-Net to correctly displace the thermocline across the entire 3D domain.

---

## 5. Comprehensive Comparison Across All Phases

| Generation / Model | Architecture | Loss Formulation | Test RMSE (°C) | Test MAE (°C) | Test R² | Δ vs Clim |
|:---|:---|:---|:---:|:---:|:---:|:---:|
| **Climatology Baseline** | Lookup table | — | 0.6429 | 0.2719 | 0.9970 | 0.0% |
| **OceanEmbed v0** | Fourier MLP | Absolute temp (Overfitting) | ~5.08 | — | — | +690% |
| **OceanEmbed v1** | Fourier MLP | Anomaly + Thermocline/Smoothness loss | 0.6047 | 0.2853 | 0.9973 | -5.9% |
| **OceanEmbed (Phase 6.1)** | Fourier MLP | Anomaly + MSE-only | 0.5935 | 0.2776 | 0.9974 | -7.7% |
| **Ridge Regression** | Pixel Linear | Anomaly | 0.5856 | 0.2595 | 0.9975 | -8.9% |
| **U-Net Baseline (Phase 5)** | 2D U-Net | Anomaly + MSE-only (All-7) | 0.5312 | 0.2362 | 0.9980 | -17.4% |
| **OceanEmbed v2 (Phase 6.2)** | **2D U-Net** | **Anomaly + MSE-only (All-7, 14 ep)** | **0.5246** | **0.2331** | **0.9980** | **-18.4%** |

### Summary of Architectural Insights:
1. **Anomaly formulation** is mandatory (prevents absolute seasonal lookup failure).
2. **Joint 2D convolutional depth output** (U-Net) outperforms point-wise Fourier coordinate querying by preserving cross-depth physical stratification.
3. **Removing auxiliary losses** improves generalization; simple MSE on anomalies avoids artificial gradient distortion.
4. **All-7 multi-modal inputs** anchored by **SLA** provide the optimal foundation for 3D ocean temperature reconstruction.
