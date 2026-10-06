# Phase 8: Smooth Thermocline-Weighted MSE Loss (Option A)

> **Experiment ID**: `phase8-weighted-mse`  
> **Status**: **REJECTED FOR PRODUCTION / KEPT AS RESEARCH ARTIFACT**  
> **Production Model**: Retained `runs/_final_v2/model_v2.pt` (BaselineModel U-Net, 7.85M params)  
> **Date**: October 2026  
> **Hardware**: CUDA · 15 epochs (~27 min training)

---

## 1. Executive Summary & Decision

Following the Issue #21 diagnostic which revealed the thermocline (50–200 m) as the primary error band (peak error near 100 m with a sharp bias sign reversal at 100 $\rightarrow$ 125 m), we conducted a controlled experiment (**Option A**) applying a smooth Gaussian depth-weighted MSE loss without architectural changes.

### Decision: **DO NOT PROMOTE TO PRODUCTION**
- **GLORYS Overall RMSE**: Regressed from `0.8072 °C` $\rightarrow$ `0.8197 °C` (+1.5%)
- **GLORYS Thermocline RMSE**: Regressed from `1.1573 °C` $\rightarrow$ `1.1869 °C` (+2.6%)
- **ARGO Thermocline RMSE**: Marginally improved from `1.2650 °C` $\rightarrow$ `1.2478 °C` (−1.4% overall NIO, −2.9% in Bay of Bengal)
- **Scientific Rationale**: GLORYS is a reanalysis product with internal spatial/temporal smoothing. ARGO represents point in-situ observations. When we upweight thermocline loss, the model learns sharper gradients that better match true in-situ profiles (improving ARGO accuracy), but this moves the model away from the smoother GLORYS reanalysis target field. Because GLORYS is our ground truth for full-grid spatial predictions and the ARGO gain is modest, **v2 remains the production standard**.

---

## 2. Formulation & Methodology

### Loss Profile
To avoid step-function boundary artifacts at depth interfaces, a smooth Gaussian weighting profile was applied across the 15 discrete standard depth levels:

$$w(d) = 1.0 + 2.0 \cdot \exp\left(-\frac{(d - 100.0)^2}{2 \cdot 40.0^2}\right)$$

### Level Weight Breakdown:
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
| **Overall** | **0.8072** | **−0.0367** | **0.8197** | **−0.0572** | **+0.0125 °C (+1.5%)** |

---

## 4. In-Situ ARGO Collocated Validation

Evaluated across all 8,883 collocated ARGO profiles in the North Indian Ocean:

### Regional & Seasonal Breakdown
| Subset | Profiles ($N$) | v2 Thermocline RMSE | P8 Thermocline RMSE | $\Delta$ RMSE | $\Delta$ RMSE (%) |
|---|---|---|---|---|---|
| **Bay of Bengal** | 2,484 | **1.3484 °C** | **1.3094 °C** | **−0.0390 °C** | **−2.9%** |
| **2022 Test Year** | 2,643 | **1.2575 °C** | **1.2326 °C** | **−0.0249 °C** | **−2.0%** |
| **Non-Monsoon (Oct–May)** | 5,850 | 1.2615 °C | 1.2435 °C | −0.0181 °C | −1.4% |
| **Monsoon (Jun–Sep)** | 3,033 | 1.2717 °C | 1.2561 °C | −0.0155 °C | −1.2% |
| **Arabian Sea** | 5,702 | 1.1668 °C | 1.1547 °C | −0.0121 °C | −1.0% |
| **All NIO** | 8,883 | **1.2650 °C** | **1.2478 °C** | **−0.0172 °C** | **−1.4%** |

### Per-Depth Profile vs ARGO (All Profiles)
| Depth (m) | v2 RMSE (°C) | v2 Bias (°C) | P8 RMSE (°C) | P8 Bias (°C) | $\Delta$ RMSE |
|---|---|---|---|---|---|
| 0.49 | 1.4071 | +0.1233 | 1.4136 | −0.0143 | +0.0065 °C |
| 5.08 | 0.8060 | −0.0732 | 0.8156 | −0.1552 | +0.0096 °C |
| 14.19 | 0.9408 | +0.0809 | 0.9403 | +0.0008 | −0.0005 °C |
| 26.84 | 1.2777 | +0.4340 | 1.2639 | +0.3544 | −0.0137 °C |
| 42.55 | 1.4838 | +0.8259 | 1.4640 | +0.7694 | −0.0198 °C |
| 59.81 | 1.4560 | +0.8680 | 1.4498 | +0.8631 | −0.0062 °C |
| 78.49 | 1.1893 | +0.2889 | 1.1902 | +0.3227 | +0.0009 °C |
| 99.45 | 1.5778 | +0.8533 | 1.5646 | +0.8715 | −0.0132 °C |
| **123.94** | **1.2436** | **−0.3381** | **1.2067** | **−0.3807** | **−0.0370 °C (−3.0%)** |
| **153.08** | **1.0712** | **−0.1399** | **1.0390** | **−0.1822** | **−0.0322 °C (−3.0%)** |
| **188.50** | **0.9354** | **+0.0137** | **0.9119** | **−0.0260** | **−0.0235 °C (−2.5%)** |
| 233.07 | 2.1180 | −1.9309 | 2.1262 | −1.9413 | +0.0083 °C |
| 290.24 | 2.9290 | −2.7373 | 2.9306 | −2.7393 | +0.0016 °C |
| 365.13 | 2.4753 | −2.3716 | 2.4758 | −2.3721 | +0.0006 °C |
| 902.34 | 0.3003 | −0.0819 | 0.3019 | −0.0852 | +0.0015 °C |

---

## 5. Issue Tracking & Next Steps

### Issue #22: Deep-Layer Systematic Bias (233–365 m)
- **Finding**: Both v2 and Phase 8 exhibit large negative biases vs ARGO at 233–365 m (−1.93 °C at 233 m, −2.74 °C at 290 m, −2.37 °C at 365 m).
- **Status**: Tracked separately under **Issue #22**. This is an independent systematic issue (likely related to ARGO float interpolation at the lower base of observational coverage or background water mass differences in the Red Sea / Persian Gulf outflow) and is intentionally not altered here.

### Production Artifacts Status
- **Production Checkpoint**: `runs/_final_v2/model_v2.pt` (Unchanged)
- **Phase 8 Checkpoint**: `runs/phase8_thermocline_weighted/checkpoint_best.pt` (Preserved as experiment artifact)
- **Phase 8 Evaluation JSON**: `runs/phase8_thermocline_weighted/eval_results.json`
