# Phase 7: corrected real Argo validation

## Correction record

The prior regional value of **0.5490°C** was fabricated by the former
`ingest_argo.py` regional-stats routine, which added random variation to
hardcoded values. It is withdrawn. This document uses the real collocation
outputs generated on 2026-09-22 from `data/argo/argo_nio_all.json` and
`runs/_final_v2/model_v2.pt`.

The corrected regional file is `data/argo/regional_stats.json`. Its provenance
records source/checkpoint SHA-256 hashes, the exact method, 8,883 valid
collocations, zero skipped dates, and confirms that no random scaling was used.

## Corrected basin-wide result

- Input profiles: 8,923 (2020–2022)
- Valid collocations: 8,883
- North Indian Ocean RMSE: **1.5719°C**
- MAE: **1.1186°C**
- Bias (model − Argo): **−0.2984°C**
- Pearson correlation: **0.9796**
- RMSE by depth band: mixed layer **1.1790°C**, thermocline **1.2650°C**,
  deep **2.2382°C**

## Corrected regional validation

The bounds below follow the corrected regional computation: Arabian Sea
(5–25°N, 45–75°E), Bay of Bengal (5–25°N, 80–100°E), and the full North
Indian Ocean (5–30°N, 45–105°E). Regions may overlap only through the
basin-wide aggregate.

| Region | Valid profiles | Valid depth measurements | RMSE (°C) | MAE (°C) | Bias (°C) | Pearson r | ML RMSE | Thermocline RMSE | Deep RMSE |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Arabian Sea | 5,943 | 80,101 | 1.6463 | 1.1620 | -0.3378 | 0.9732 | 1.3529 | 1.1925 | 2.3955 |
| Bay of Bengal | 2,779 | 38,854 | 1.3903 | 1.0240 | -0.2092 | 0.9885 | 0.7131 | 1.4078 | 1.8262 |
| North Indian Ocean | 8,883 | 120,988 | 1.5719 | 1.1186 | -0.2984 | 0.9796 | 1.1790 | 1.2650 | 2.2382 |

## Corrected seasonal validation

These numbers are from `data/argo/seasonal_stats.json`, recomputed from the
same 8,883 collocations. Its historical provenance text says
`predict_profile`; the implementation actually uses equivalent date-grouped
`predict_full_3d` inference and nearest-cell extraction. That wording should
be corrected on its next regeneration.

| Season | Valid profiles | RMSE (°C) | Bias (°C) | Pearson r | ML RMSE | Thermocline RMSE | Deep RMSE |
| :--- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pre-monsoon | 2,261 | 1.6346 | -0.2326 | 0.9790 | 1.3494 | 1.2780 | 2.2774 |
| Monsoon | 3,033 | 1.6134 | -0.3182 | 0.9794 | 1.2777 | 1.2717 | 2.2962 |
| Post-monsoon | 2,146 | 1.5785 | -0.2702 | 0.9786 | 1.1029 | 1.3155 | 2.2555 |
| Winter | 1,443 | 1.3616 | -0.4012 | 0.9831 | 0.6843 | 1.1483 | 2.0257 |

No comparison to the withdrawn 0.5490°C result should be made.
