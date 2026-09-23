# Scientific Finding: Limitations of Continuous Fourier Depth Decoders in Gridded Ocean ML

## Executive Summary
Across rigorous evaluations on the 2022 test split (365 daily fields over the North Indian Ocean at 15 depth levels), a standard 2D convolutional **U-Net baseline** predicting all 15 depth channels jointly significantly outperformed the **OceanEmbedModel** using a continuous Fourier depth MLP decoder (**0.5312 °C vs 0.5935 °C** under identical MSE loss, and vs **0.6047 °C** with auxiliary losses).

This document analyzes the structural root cause and provides architecture recommendations for subsurface ocean modeling.

---

## 1. Initial Hypothesis

The core design hypothesis behind `OceanEmbedModel` was:
- Surface ocean dynamics and vertical stratification could be represented continuously across arbitrary depths.
- A 2D spatial encoder extracting latent maps $Z \in \mathbb{R}^{C \times H \times W}$, combined with a continuous Fourier depth embedding $\gamma(z) \in \mathbb{R}^{2F}$ queried through an MLP decoder $f_\theta(Z_{x,y}, \gamma(z))$, should provide superior inductive bias, depth generalization, and spatial-vertical coupling compared to a fixed discrete multi-channel 2D convolutional output head.

---

## 2. Experimental Setup (Controlled Ablation)

To isolate the effect of the depth decoder, all models were trained and evaluated on strictly identical splits and formulations:
- **Dataset:** 
  - Train: 2010–2020 (4,018 samples)
  - Validation: 2021 (365 samples)
  - Test: 2022 (365 samples, 101×241 grid, 15 depths)
- **Target Formulation:** Anomaly prediction $(T_{\text{GLORYS}} - T_{\text{Climatology}})$
- **Loss Function:** MSE-only on valid ocean pixels (no uncertainty head, no auxiliary losses)
- **Optimizer & Schedule:** AdamW, cosine schedule, warmup, identical effective batch size

### Models Compared:
1. **`BaselineModel` (U-Net):** 4-level U-Net encoder-decoder with skip connections, outputting $(B, 15, H, W)$ directly through 2D convolutions (~7.85M parameters).
2. **`OceanEmbedModel` (Phase 6.1 MSE-Only):** ResNet encoder + continuous Fourier coordinate depth MLP decoder querying each depth independently (~8.2M parameters).
3. **`OceanEmbedModel` (v1 Anomaly):** Same as (2) with thermocline and depth smoothness auxiliary losses.
4. **Ridge Regression (Anomaly):** Linear baseline on pixel features.
5. **Climatology Baseline:** Lookup table mean per day-of-year (2010–2020).

---

## 3. Empirical Results

### Overall Test Metrics (2022 Split — 365 Days)
| Model Architecture | Decoder Type | Test RMSE (°C) | Test MAE (°C) | Test R² | Δ vs Clim |
|:---|:---|:---:|:---:|:---:|:---:|
| **U-Net Baseline** | **Joint 15-channel 2D Conv** | **0.5312** | **0.2362** | **0.9980** | **-17.4%** |
| Ridge Regression | Pixel-wise linear | 0.5856 | 0.2595 | 0.9975 | -8.9% |
| OceanEmbed (Phase 6.1) | Fourier MLP coordinate query (MSE-only) | 0.5935 | 0.2776 | 0.9974 | -7.7% |
| OceanEmbed (v1) | Fourier MLP coordinate query (+ Aux Losses) | 0.6047 | 0.2853 | 0.9973 | -5.9% |
| Climatology Baseline | Lookup table | 0.6429 | 0.2719 | 0.9970 | 0.0% |

### Performance Breakdown by Vertical Depth Band
| Depth Band | U-Net Baseline | Phase 6.1 (MSE-Only) | v1 OceanEmbed | Climatology |
|:---|:---:|:---:|:---:|:---:|
| **Mixed Layer (0–50 m)** | **0.4551 °C** | 0.4705 °C | 0.4840 °C | 0.4909 °C |
| **Thermocline (50–200 m)** | **0.7383 °C** | **0.8579 °C** | 0.8707 °C | 0.9466 °C |
| **Deep (200–1000 m)** | **0.2570 °C** | 0.2627 °C | 0.2690 °C | 0.2612 °C |

---

## 4. Root Cause Analysis

### 1. Independent Per-Depth Querying Destroys Vertical Correlation
In `OceanEmbedModel`, the MLP decoder takes a spatial latent vector $z_{x,y}$ and a scalar depth query $d$, computing:
$$\hat{T}(x, y, d) = \text{MLP}([z_{x,y}, \gamma(d)])$$
Because the MLP evaluates each depth query independently, there is **no cross-depth feature communication or gradient pathway in the decoder**. The network cannot directly exploit vertical hydrostatic constraints, layer thickness relationships, or sharp internal pycnocline gradients between adjacent levels $d_k$ and $d_{k+1}$.

In contrast, the U-Net's final convolutional layer outputs all 15 depth channels simultaneously:
$$\hat{T}(x, y, 1:15) = \text{Conv2D}(Z_{\text{decoder}})$$
The convolutional filters and skip connections allow the network to model joint vertical profile shapes directly, preserving the physical coupling between surface inputs and subsurface response.

### 2. The Bottleneck is Most Severe in the Thermocline
In the mixed layer (0–50 m) and deep ocean (200–1000 m), temperature variations are relatively smooth and directly driven by surface flux or uniform deep stratification. Here, both architectures perform similarly.
However, in the **thermocline (50–200 m)**, vertical gradients are steep ($|dT/dz|$ is maximized) and displaced nonlinearly by internal waves and eddies:
- U-Net achieves **0.7383 °C** RMSE.
- Fourier MLP achieves **0.8579 °C** RMSE (**+16.2% error**).

Independent coordinate queries blur the sharp thermocline boundary because the shared MLP tries to smoothly interpolate across depths without layer-to-layer interaction.

---

## 5. Architectural Recommendation

1. **For Fixed-Grid Gridded Ocean ML:** Use **joint-channel convolutional output heads** (e.g., U-Net or 3D CNN / UNet-3D) where all vertical levels are predicted simultaneously.
2. **When Continuous Depth is Truly Required (Sparse/Irregular Argo Profiles):** Do not query a simple point-wise MLP directly from a 2D latent map. Instead, use cross-attention / Transformer decoders with cross-depth self-attention tokens so that queries across multiple depths communicate before generating predictions.
3. **Primary Model Selection:** The 2D U-Net baseline on anomaly formulation is selected as the primary operational model (`runs/_final_v1_unet/model_v1_unet.pt`).
