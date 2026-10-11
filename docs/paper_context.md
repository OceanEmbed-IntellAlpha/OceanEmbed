# OceanEmbed Paper Context & Canonical Metrics Reference

This document serves as the standardized manuscript and publication context for the OceanEmbed project.

---

## 1. Canonical Abstract & Core Performance Summary

Our v2 model achieves **RMSE 0.8072 °C** on the ocean-masked 2022 GLORYS test split (56.3 million ocean points over 365 days). For reproducibility with earlier ablation studies, the full-grid RMSE (including land pixels with zero prediction error) is 0.5246 °C. We report **ocean-masked metrics** as the scientifically meaningful headline throughout this paper.

### Standardized Performance Benchmarks (2022 GLORYS Test Split)

| Evaluation Metric | Ocean-Masked (Headline) | Full-Grid (Legacy Footnote*) | Climatology Baseline (Ocean-Masked) | Relative Skill Improvement |
| :--- | :---: | :---: | :---: | :---: |
| **Overall RMSE** | **0.8072 °C** | 0.5246 °C | 0.9893 °C | **+18.40%** (−0.1821 °C) |
| **Overall MAE** | **0.5520 °C** | 0.2331 °C | 0.6440 °C | +14.28% |
| **Overall Bias** | **−0.0367 °C** | −0.0155 °C | −0.1672 °C | Near-zero systematic thermal drift |
| **Coefficient of Determination ($R^2$)** | **0.9884** | 0.9980 | 0.9826 | Captures 98.8% of spatial variance |
| **Pearson Correlation ($r$)** | **0.9942** | 0.9990 | 0.9915 | High profile-to-profile alignment |
| **Evaluated Sample Points ($N$)** | **56,277,525** | 133,266,975 | 56,277,525 | Ocean fraction = **42.23%** of grid |

*\*Footnote on Domains: In a 2D/3D rectangular gridded basin, land pixels evaluate to zero in both prediction and target tensors. Full-grid evaluations scale the root-mean-square error by the square root of the ocean area fraction ($\text{RMSE}_{\text{full}} = \text{RMSE}_{\text{ocean}} \times \sqrt{0.4223} = 0.5246\ ^\circ\text{C}$). The 18.40% skill improvement over climatology is invariant across both evaluation domains because the scale factor cancels identically.*

---

## 2. Independent In-Situ ARGO Validation (Physical Soundings)

OceanEmbed v2 was rigorously validated against **8,881 physical in-situ ARGO float profiles** throughout the North Indian Ocean ($2020$–$2022$):

- **Overall NIO Basin In-Situ RMSE:** **0.915 °C** (0.9148 °C, Correlation $r = 0.992$, Bias $= +0.042\ ^\circ\text{C}$)
- **Arabian Sea In-Situ RMSE (5,940 profiles):** **0.943 °C** (0.9431 °C)
- **Bay of Bengal In-Situ RMSE (2,780 profiles):** **0.844 °C** (0.8437 °C)
- **Mixed Layer Band ($0$–$50\text{ m}$):** $0.945\ ^\circ\text{C}$ RMSE
- **Thermocline Band ($50$–$200\text{ m}$):** $1.141\ ^\circ\text{C}$ RMSE
- **Deep Ocean Band ($200$–$1000\text{ m}$):** $0.376\ ^\circ\text{C}$ RMSE

---

## 3. Physical Oceanographic Findings

1. **SLA Dominance**: Altimetry (Sea Level Anomaly) accounts for **87.5% of total multi-sensor skill gain**, physically linking sea surface height displacements to vertical pycnocline/thermocline displacements via baroclinic mode dynamics ($h' \approx -\frac{g}{g'} \eta$).
2. **Reanalysis vs In-Situ Thermocline Dynamics**: In loss-weighting experiments (Phase 8), upweighting thermocline loss reduced in-situ ARGO thermocline error by up to $-4.36\%$ (Bay of Bengal), but slightly regressed GLORYS reanalysis fit (+2.6%), demonstrating the distinction between point in-situ observations and spatially smoothed reanalysis targets.
