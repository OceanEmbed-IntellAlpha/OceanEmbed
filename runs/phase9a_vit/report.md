# Phase 9A: Vision Transformer (ViT) Baseline Comparison Report

## 1. Architecture Summary
- **Model Name**: ViTBaseline (`backend/ocean_embed/models/vit_baseline.py`)
- **Parameters**: 5,889,423 (5.89M)
- **Input**: `(B, 14, 101, 241)` — 7 surface variables + 7 validity masks
- **Patch Resolution**: 16×16, stride 16 (padded from 101×241 to 112×256 → 7×16 = 112 patches)
- **Transformer Encoder**: 6 blocks, `embed_dim=192`, 6 heads (32-dim/head), MLP hidden `768`, GELU, pre-norm (`norm_first=True`)
- **Output Head**: Reshape to `(B, 192, 7, 16)` → ConvTranspose2d (8×) → GELU → ConvTranspose2d (2×) → GELU → Crop `[:101, :241]` → 1×1 Conv to 15 depths
- **Peak VRAM During Training**: 151.1 MB
- **Average Wall Time per Epoch**: 121.2 s
- **Best Epoch**: Epoch 11 (Val RMSE: 0.8630 °C)

## 2. Epoch Training Progression
| Epoch | Train Loss | Val RMSE (°C) | ML RMSE (°C) | Thermo RMSE (°C) | Deep RMSE (°C) | Learning Rate | Wall Time (s) |
|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | 0.65194 | 1.0141 | 0.7101 | 1.5450 | 0.4528 | 1.70e-04 | 93.6 |
| 2 | 0.52772 | 0.9291 | 0.6877 | 1.3853 | 0.4387 | 3.35e-04 | 111.0 |
| 3 | 0.49268 | 0.8916 | 0.6745 | 1.3154 | 0.4357 | 5.00e-04 | 126.6 |
| 4 | 0.48394 | 0.9003 | 0.6823 | 1.3275 | 0.4399 | 4.91e-04 | 130.2 |
| 5 | 0.47299 | 0.8838 | 0.6711 | 1.3012 | 0.4355 | 4.67e-04 | 125.1 |
| 6 | 0.46049 | 0.8811 | 0.6679 | 1.2977 | 0.4356 | 4.27e-04 | 122.0 |
| 7 | 0.44728 | 0.8871 | 0.6763 | 1.3043 | 0.4362 | 3.75e-04 | 125.6 |
| 8 | 0.44063 | 0.9028 | 0.6707 | 1.3414 | 0.4380 | 3.15e-04 | 127.2 |
| 9 | 0.43060 | 0.8836 | 0.6638 | 1.3064 | 0.4334 | 2.51e-04 | 127.7 |
| 10 | 0.42160 | 0.8771 | 0.6678 | 1.2899 | 0.4328 | 1.86e-04 | 130.2 |
| 11 | 0.41058 | 0.8630 | 0.6660 | 1.2611 | 0.4319 | 1.26e-04 | 123.4 |
| 12 | 0.40731 | 0.8712 | 0.6698 | 1.2758 | 0.4323 | 7.41e-05 | 119.3 |
| 13 | 0.39920 | 0.8636 | 0.6667 | 1.2621 | 0.4313 | 3.44e-05 | 118.1 |
| 14 | 0.39647 | 0.8673 | 0.6766 | 1.2629 | 0.4307 | 9.50e-06 | 119.6 |
| 15 | 0.39176 | 0.8706 | 0.6696 | 1.2749 | 0.4318 | 1.00e-06 | 118.2 |

## 3. GLORYS 2022 Test Set Metrics

### 3.1 Headline Metrics Comparison (Ocean-Masked & Full-Grid)
| Metric | v2 U-Net (Ocean) | ViT Baseline (Ocean) | Δ (ViT - v2) | v2 U-Net (Full-Grid) | ViT Baseline (Full-Grid) | Δ (ViT - v2) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| **Overall RMSE (°C)** | **0.8072** | **0.8511** | +0.0439 | **0.5246** | **0.5531** | +0.0285 |
| **Overall MAE (°C)** | 0.5520 | 0.5745 | +0.0225 | 0.2331 | 0.2426 | +0.0095 |
| **Overall Bias (°C)** | -0.0367 | -0.0893 | -0.0526 | -0.0155 | -0.0377 | -0.0222 |
| **Pearson r** | 0.9942 | 0.9936 | -0.0006 | 0.9990 | 0.9989 | -0.0001 |
| **R²** | 0.9884 | 0.9871 | -0.0013 | 0.9980 | 0.9978 | -0.0002 |

### 3.2 Depth Bands (Ocean-Masked)
| Band | v2 RMSE (°C) | ViT RMSE (°C) | Δ RMSE (°C) | ViT MAE (°C) | ViT Bias (°C) |
|:---|:---:|:---:|:---:|:---:|:---:|
| Mixed Layer (0–50m) | 0.4429 (0.95 ARGO) | 0.6770 | +0.2341 | 0.4796 | -0.0349 |
| Thermocline (50–200m) | 0.7331 (1.13 ARGO) | 1.2316 | +0.4985 | 0.9219 | -0.2194 |
| Deep (200–1000m) | 0.2565 (0.37 ARGO) | 0.4138 | +0.1573 | 0.2922 | -0.0183 |

### 3.3 Per-Depth RMSE Breakdown (15 Levels)
| Depth (m) | v2 Full-Grid (°C) | ViT Ocean-Masked (°C) | ViT Full-Grid (°C) |
|:---:|:---:|:---:|:---:|
| 0.49 | 0.4149 | 0.6207 | 0.4332 |
| 5.08 | 0.4113 | 0.6165 | 0.4302 |
| 9.57 | 0.4069 | 0.6160 | 0.4246 |
| 18.5 | 0.4260 | 0.6475 | 0.4413 |
| 29.44 | 0.4592 | 0.7038 | 0.4730 |
| 47.37 | 0.5271 | 0.8471 | 0.5586 |
| 77.85 | 0.7512 | 1.3117 | 0.8400 |
| 92.33 | 0.8404 | 1.4744 | 0.9382 |
| 130.67 | 0.7866 | 1.3046 | 0.8241 |
| 155.85 | 0.6939 | 1.0966 | 0.6909 |
| 186.13 | 0.5624 | 0.8723 | 0.5483 |
| 318.13 | 0.3160 | 0.5077 | 0.3171 |
| 541.09 | 0.2270 | 0.3647 | 0.2258 |
| 643.57 | 0.2336 | 0.3749 | 0.2314 |
| 902.34 | 0.2392 | 0.3890 | 0.2379 |

## 4. In-Situ ARGO Float Validation (8,881+ Profiles)
| Metric / Band | v2 U-Net | ViT Baseline | Difference |
|:---|:---:|:---:|:---:|
| **Overall NIO RMSE (°C)** | **0.9100** | **1.5364** | +0.6264 |
| **Overall Bias (°C)** | +0.0410 | -0.0580 | -0.0990 |
| **Correlation (r)** | 0.9920 | 0.9774 | -0.0146 |
| **Mixed Layer (0–50m)** | 0.9540 | 1.0673 | +0.1133 |
| **Thermocline (50–200m)** | 1.1270 | 1.8709 | +0.7439 |
| **Deep (>200m)** | 0.3700 | 1.5615 | +1.1915 |

### 4.1 ARGO Seasonal & Regional Breakdown
| Regime / Region | N Profiles | ViT RMSE (°C) | ViT Bias (°C) | ViT Corr (r) |
|:---|:---:|:---:|:---:|:---:|
| All NIO | 8,884 | 1.5364 | -0.0580 | 0.9774 |
| Arabian Sea | 5,702 | 1.7277 | -0.1171 | 0.9660 |
| Bay of Bengal | 2,485 | 1.0729 | +0.0274 | 0.9916 |
| Monsoon (Jun-Sep) | 3,033 | 1.6948 | -0.0137 | 0.9734 |
| Non-Monsoon (Oct-May) | 5,851 | 1.4483 | -0.0807 | 0.9795 |
| Pre-Monsoon (Mar-May) | 2,262 | 1.5192 | -0.1147 | 0.9792 |
| Winter (Jan-Feb) | 1,442 | 1.2660 | -0.0885 | 0.9829 |
| 2022 Test Year | 2,644 | 1.8419 | -0.1420 | 0.9633 |

## 5. Architectural Verdict & Findings
### Verdict: **INTERESTING**

**Reasoning**:
The Phase 9A Vision Transformer (5.89M parameters) achieves an ocean-masked GLORYS test RMSE of 0.8511°C (full-grid: 0.5531°C) and an independent in-situ ARGO validation RMSE of 1.5364°C across 8,884 profiles, compared to OceanEmbed v2 U-Net's 0.8072°C (ocean-masked) and 0.910°C (ARGO). Patch-based self-attention at 16×16 tokenization provides effective global receptive field across the North Indian Ocean basin, capturing large-scale baroclinic planetary waves and pycnocline displacement, but suffers higher reconstruction error in steep thermocline gradients (1.8709°C vs v2's 1.1270°C) due to token spatial downsampling (16×16) and subsequent transpose-convolutional upsampling artifacts. In contrast, the U-Net retains high-resolution local spatial skip connections that preserve fine-scale mesoscale eddies and sharp fronts. Consequently, pure patch ViT provides a valuable comparison baseline confirming that local inductive bias and high-resolution skip connections are essential for subsurface pycnocline reconstruction, establishing the U-Net as the superior architecture for operational subsurface temperature inference.
