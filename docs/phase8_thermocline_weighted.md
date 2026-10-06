# Phase 8: Smooth Thermocline-Weighted MSE Loss (Option A)

> **Experiment ID**: `phase8-weighted-mse`  
> **Status**: **REJECTED FOR PRODUCTION / KEPT AS RESEARCH LAB EXPERIMENT**  
> **Production Model**: Retained `runs/_final_v2/model_v2.pt` (BaselineModel U-Net, 7.85M params)  
> **Date**: October 2026  
> **Hardware**: CUDA · 15 epochs (~27 min training)

---

## 1. Executive Summary & Decision

Following the Issue #21 diagnostic which revealed the thermocline (50–200 m) as the primary error band (peak error near 100 m with a sharp bias sign reversal at 100 $\rightarrow$ 125 m), we conducted a controlled experiment (**Option A**) applying a smooth Gaussian depth-weighted MSE loss without architectural changes.

### Experiment Framing
- **Hypothesis**: Upweighting loss near 100 m will reduce thermocline RMSE.
- **Variant**: Depth-weighted MSE loss with weight profile:
  $$w(d) = 1.0 + 2.0 \cdot \exp\left(-\frac{(d - 100.0)^2}{2 \cdot 40.0^2}\right)$$

### Results Summary
| Metric / Domain | Baseline (v2) | Phase 8 (Weighted MSE) | Relative Change ($\Delta$) | Verdict |
| :--- | :--- | :--- | :--- | :--- |
| **GLORYS Overall RMSE** | `0.8072 °C` | `0.8197 °C` | **+1.55%** | ❌ Regressed |
| **GLORYS Thermocline RMSE** | `1.1573 °C` | `1.1869 °C` | **+2.56%** | ❌ Regressed |
| **ARGO In-Situ Overall RMSE** | `0.9148 °C` | `0.9024 °C` | **−1.37%** | ✅ Improved |
| **ARGO In-Situ Thermocline RMSE** | `1.1408 °C` | `1.1131 °C` | **−2.43%** | ✅ Improved |
| **ARGO Bay of Bengal Thermocline** | `1.2286 °C` | `1.1751 °C` | **−4.36%** | ✅ Best gain |

### Interpretation
GLORYS reanalysis smooths the thermocline; ARGO in-situ floats preserve the sharp physical gradient. The weighted loss matches real in-situ (ARGO) thermoclines better but overfits the smoothed (GLORYS) target field.

### Decision: **REJECTED FOR PRODUCTION**
- v2 remains the production standard.
- Phase 8 is kept as a permanent documented experiment in the Research Lab.

---

## 2. Formulation & Methodology

### Loss Profile
To avoid step-function boundary artifacts at depth interfaces, a smooth Gaussian weighting profile was applied across the discrete standard depth levels:

$$w(d) = 1.0 + 2.0 \cdot \exp\left(-\frac{(d - 100.0)^2}{2 \cdot 40.0^2}\right)$$

### Discrete Level Weight Breakdown
| Depth Level ($d$) | Loss Weight ($w$) | Multiplier |
|---|---|---|
| 0.49 m | 1.0906 | ~1.1× |
| 5.08 m | 1.1197 | ~1.1× |
| 9.57 m | 1.1553 | ~1.2× |
| 18.50 m | 1.2509 | ~1.3× |
| 29.40 m | 1.4220 | ~1.4× |
| 47.37 m | 1.8416 | ~1.8× |
| 77.85 m | 2.7157 | ~2.7× |
| **92.33 m** | **2.9636** | **~3.0× (Peak)** |
| 130.67 m | 2.4906 | ~2.5× |
| 155.85 m | 1.7546 | ~1.8× |
| 186.13 m | 1.1969 | ~1.2× |
| 318.13 m – 902.34 m | 1.0000 | 1.0× (Base) |

---

## 3. GLORYS 2022 Test Set Comparison

Evaluated over the 365 daily test snapshots of 2022 ($101 \times 241$ grid):

### Per-Depth RMSE & Bias
| Depth (m) | v2 RMSE (°C) | v2 Bias (°C) | P8 RMSE (°C) | P8 Bias (°C) | $\Delta$ RMSE | $\Delta$ RMSE (%) |
|---|---|---|---|---|---|---|
| **0.00** | 0.5945 | +0.0288 | 0.5864 | +0.0010 | −0.0081 | −1.4% |
| **5.00** | 0.5894 | +0.0265 | 0.5838 | −0.0020 | −0.0056 | −1.0% |
| **10.00** | 0.5903 | +0.0445 | 0.5814 | +0.0105 | −0.0089 | −1.5% |
| **20.00** | 0.6250 | +0.0398 | 0.6179 | +0.0023 | −0.0071 | −1.1% |
| **30.00** | 0.6832 | +0.0411 | 0.6776 | +0.0071 | −0.0056 | −0.8% |
| **50.00** | 0.7993 | +0.0115 | 0.8096 | −0.0333 | +0.0103 | +1.3% |
| **75.00** | 1.1731 | −0.1693 | 1.2194 | −0.2164 | +0.0463 | +3.9% |
| **100.00** | 1.3207 | −0.2365 | 1.3664 | −0.2734 | +0.0457 | +3.5% |
| **125.00** | 1.2453 | −0.1611 | 1.2753 | −0.1819 | +0.0300 | +2.4% |
| **150.00** | 1.1013 | −0.0996 | 1.1115 | −0.1018 | +0.0102 | +0.9% |
| **200.00** | 0.8947 | −0.0741 | 0.9014 | −0.0771 | +0.0068 | +0.8% |
| **300.00** | 0.5060 | −0.0446 | 0.5102 | −0.0286 | +0.0041 | +0.8% |
| **500.00** | 0.3667 | −0.0058 | 0.3688 | +0.0019 | +0.0021 | +0.6% |
| **700.00** | 0.3784 | −0.0252 | 0.3809 | −0.0198 | +0.0025 | +0.6% |
| **1000.00** | 0.3912 | +0.0124 | 0.3923 | +0.0111 | +0.0011 | +0.3% |

### Band Aggregates
| Band | v2 RMSE (°C) | v2 Bias (°C) | P8 RMSE (°C) | P8 Bias (°C) | $\Delta$ RMSE |
|---|---|---|---|---|---|
| **Mixed Layer (0–50 m)** | 0.6483 | +0.0322 | **0.6447** | **−0.0020** | **−0.0036 °C** (−0.6%) |
| **Thermocline (50–200 m)** | 1.1573 | −0.1487 | 1.1869 | −0.1709 | +0.0296 °C (+2.6%) |
| **Deep (200–1000 m)** | 0.4150 | −0.0161 | 0.4176 | −0.0090 | +0.0026 °C (+0.6%) |
| **Overall** | **0.8072** | **−0.0367** | **0.8197** | **−0.0572** | **+0.0125 °C (+1.55%)** |

---

## 4. In-Situ ARGO Collocated Validation ($N = 8,881$)

Evaluated across all 8,881 collocated ARGO profiles in the North Indian Ocean using the corrected standard depth grid:

### Regional & Seasonal Breakdown
| Subset | Profiles ($N$) | v2 Overall RMSE | P8 Overall RMSE | v2 Thermocline RMSE | P8 Thermocline RMSE | $\Delta$ Thermocline (%) |
|---|---|---|---|---|---|---|
| **All NIO Profiles** | 8,881 | 0.9148 °C | **0.9024 °C** | 1.1408 °C | **1.1131 °C** | **−2.43%** |
| **2022 Test Year** | 2,644 | 0.9464 °C | **0.9339 °C** | 1.1153 °C | **1.0825 °C** | **−2.94%** |
| **Arabian Sea** | 5,699 | 0.9313 °C | **0.9208 °C** | 1.0533 °C | **1.0308 °C** | **−2.14%** |
| **Bay of Bengal** | 2,485 | 0.8107 °C | **0.7850 °C** | 1.2286 °C | **1.1751 °C** | **−4.36%** |
| **Monsoon (Jun–Sep)** | 3,033 | 0.9316 °C | **0.9193 °C** | 1.1607 °C | **1.1296 °C** | **−2.68%** |
| **Non-Monsoon (Oct–May)** | 5,848 | 0.9061 °C | **0.8935 °C** | 1.1305 °C | **1.1045 °C** | **−2.30%** |

---

## 5. Summary & Archived Artifacts

- **Production Checkpoint**: `runs/_final_v2/model_v2.pt` (Retained as production standard)
- **Phase 8 Checkpoint**: `runs/phase8_thermocline_weighted/checkpoint_best.pt` (Archived research artifact)
- **Phase 8 Evaluation JSON**: `runs/phase8_thermocline_weighted/eval_results.json`
