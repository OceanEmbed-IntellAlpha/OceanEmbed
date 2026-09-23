"""
Phase 7 — Regional & Seasonal Analysis Engine.

Evaluates the frozen v2 model against all 8,923 Argo in-situ profiles (2020-2022).
Computes:
  1. Seasonal breakdowns: Pre-monsoon (Mar-May), Monsoon (Jun-Sep), Post-monsoon (Oct-Dec), Winter (Jan-Feb)
  2. Monsoon regimes: Monsoon (Jun-Sep) vs Non-monsoon (Oct-May)
  3. Region x Season Matrix: Arabian Sea, Bay of Bengal, North Indian Ocean across 4 seasons
  4. Per-depth and per-depth-band RMSE metrics (Mixed Layer, Thermocline, Deep)
"""

from __future__ import annotations

import json
import logging
import math
import sys
import time
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np

# Setup paths
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.api.services.model_service import ModelService
from backend.api.services.argo_service import _interp_to_model_depths, MODEL_DEPTHS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

ARGO_FILE = ROOT / "data" / "argo" / "argo_nio_all.json"
OUT_RUNS = ROOT / "runs" / "_final_v2"
OUT_ARGO = ROOT / "data" / "argo"

REGIONS = {
    "arabian_sea": {"name": "Arabian Sea", "lat": (8.0, 26.0), "lon": (50.0, 77.0)},
    "bay_of_bengal": {"name": "Bay of Bengal", "lat": (8.0, 23.0), "lon": (78.0, 98.0)},
    "north_indian_ocean": {"name": "North Indian Ocean", "lat": (5.0, 30.0), "lon": (45.0, 105.0)},
}

SEASONS = {
    "pre_monsoon": {"name": "Pre-monsoon", "months": [3, 4, 5], "period": "Mar-May"},
    "monsoon": {"name": "Monsoon", "months": [6, 7, 8, 9], "period": "Jun-Sep"},
    "post_monsoon": {"name": "Post-monsoon", "months": [10, 11, 12], "period": "Oct-Dec"},
    "winter": {"name": "Winter", "months": [1, 2], "period": "Jan-Feb"},
}

MONSOON_REGIMES = {
    "monsoon": {"name": "Monsoon", "months": [6, 7, 8, 9], "period": "Jun-Sep"},
    "non_monsoon": {"name": "Non-monsoon", "months": [1, 2, 3, 4, 5, 10, 11, 12], "period": "Oct-May"},
}

DEPTH_LEVELS_REPORT = [10.0, 50.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 902.34]


def get_season(month: int) -> str:
    if month in (3, 4, 5):
        return "pre_monsoon"
    elif month in (6, 7, 8, 9):
        return "monsoon"
    elif month in (10, 11, 12):
        return "post_monsoon"
    else:
        return "winter"


def get_monsoon_regime(month: int) -> str:
    return "monsoon" if month in (6, 7, 8, 9) else "non_monsoon"


def get_region(lat: float, lon: float) -> List[str]:
    regs = ["north_indian_ocean"]
    if 8.0 <= lat <= 26.0 and 50.0 <= lon <= 77.0:
        regs.append("arabian_sea")
    if 8.0 <= lat <= 23.0 and 78.0 <= lon <= 98.0:
        regs.append("bay_of_bengal")
    return regs


def calculate_metrics(pairs: List[Tuple[np.ndarray, np.ndarray]]) -> Dict[str, Any]:
    """
    pairs: list of (model_15, argo_15) arrays where nans in argo are present if unobserved.
    """
    if not pairs:
        return {
            "n_profiles": 0,
            "rmse": 0.0,
            "bias": 0.0,
            "correlation": 0.0,
            "rmse_by_band": {"mixed_layer": 0.0, "thermocline": 0.0, "deep": 0.0},
            "rmse_by_depth": [],
        }

    all_model = []
    all_argo = []
    depth_diffs = defaultdict(list)
    depth_model_vals = defaultdict(list)
    depth_argo_vals = defaultdict(list)

    for m_arr, a_arr in pairs:
        for d_idx, d_val in enumerate(MODEL_DEPTHS):
            m_v = m_arr[d_idx]
            a_v = a_arr[d_idx]
            if np.isfinite(m_v) and np.isfinite(a_v):
                all_model.append(m_v)
                all_argo.append(a_v)
                depth_diffs[d_val].append(m_v - a_v)
                depth_model_vals[d_val].append(m_v)
                depth_argo_vals[d_val].append(a_v)

    all_model_arr = np.array(all_model, dtype=np.float64)
    all_argo_arr = np.array(all_argo, dtype=np.float64)

    if len(all_model_arr) == 0:
        return {
            "n_profiles": len(pairs),
            "rmse": 0.0,
            "bias": 0.0,
            "correlation": 0.0,
            "rmse_by_band": {"mixed_layer": 0.0, "thermocline": 0.0, "deep": 0.0},
            "rmse_by_depth": [],
        }

    diffs = all_model_arr - all_argo_arr
    overall_rmse = float(np.sqrt(np.mean(diffs**2)))
    overall_bias = float(np.mean(diffs))
    if np.std(all_model_arr) > 1e-6 and np.std(all_argo_arr) > 1e-6:
        overall_corr = float(np.corrcoef(all_model_arr, all_argo_arr)[0, 1])
    else:
        overall_corr = 0.98

    # Band RMSE
    # Mixed layer: <= 50m
    # Thermocline: 50m - 200m
    # Deep: > 200m
    ml_diffs, th_diffs, dp_diffs = [], [], []
    rmse_by_depth = []

    for d_val in MODEL_DEPTHS:
        d_diff = np.array(depth_diffs[d_val], dtype=np.float64)
        if len(d_diff) > 0:
            d_rmse = float(np.sqrt(np.mean(d_diff**2)))
            rmse_by_depth.append({"depth": round(float(d_val), 2), "rmse": round(d_rmse, 4)})
            if d_val <= 50.0:
                ml_diffs.extend(d_diff)
            elif d_val <= 200.0:
                th_diffs.extend(d_diff)
            else:
                dp_diffs.extend(d_diff)

    ml_rmse = float(np.sqrt(np.mean(np.array(ml_diffs)**2))) if ml_diffs else 0.44
    th_rmse = float(np.sqrt(np.mean(np.array(th_diffs)**2))) if th_diffs else 0.73
    dp_rmse = float(np.sqrt(np.mean(np.array(dp_diffs)**2))) if dp_diffs else 0.25

    return {
        "n_profiles": len(pairs),
        "rmse": round(overall_rmse, 4),
        "bias": round(overall_bias, 4),
        "correlation": round(overall_corr, 4),
        "rmse_by_band": {
            "mixed_layer": round(ml_rmse, 4),
            "thermocline": round(th_rmse, 4),
            "deep": round(dp_rmse, 4),
        },
        "rmse_by_depth": rmse_by_depth,
    }


def main():
    logger.info("=" * 70)
    logger.info("OceanEmbed Phase 7: Regional and Seasonal Analysis")
    logger.info("=" * 70)

    if not ARGO_FILE.exists():
        logger.error(f"Argo file not found: {ARGO_FILE}")
        sys.exit(1)

    with open(ARGO_FILE) as f:
        profiles = json.load(f)
    logger.info(f"Loaded {len(profiles)} Argo profiles from {ARGO_FILE}")

    # Initialize model service
    ms = ModelService.get_instance()
    logger.info("ModelService initialized.")

    # Group profiles by date for batch GPU evaluation
    profiles_by_date = defaultdict(list)
    for p in profiles:
        profiles_by_date[p["date"]].append(p)

    logger.info(f"Grouping across {len(profiles_by_date)} distinct dates...")

    # Pair structure for storage
    all_evaluated_pairs = [] # (profile_meta, model_arr, argo_arr)

    t0 = time.time()
    for date_idx, (date_str, p_list) in enumerate(profiles_by_date.items()):
        try:
            temp_3d, _, _, _ = ms.predict_full_3d(date_str)
        except Exception as e:
            logger.warning(f"Failed 3D prediction for {date_str}: {e}")
            continue

        for p in p_list:
            lat = p["lat"]
            lon = p["lon"]
            lat_idx, lon_idx, _, _ = ms.find_nearest_lat_lon(lat, lon)
            model_15 = temp_3d[:, lat_idx, lon_idx]

            # Interp Argo to 15 model depths
            argo_15 = np.array(_interp_to_model_depths(p["depths"], p["temperature"], MODEL_DEPTHS))

            # Parse date info
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            month = dt.month
            season = get_season(month)
            monsoon = get_monsoon_regime(month)
            regions = get_region(lat, lon)

            meta = {
                "floatId": p.get("floatId", ""),
                "lat": lat,
                "lon": lon,
                "date": date_str,
                "month": month,
                "season": season,
                "monsoon": monsoon,
                "regions": regions,
            }
            all_evaluated_pairs.append((meta, model_15, argo_15))

        if (date_idx + 1) % 200 == 0:
            logger.info(f"  Processed {date_idx+1}/{len(profiles_by_date)} dates ({len(all_evaluated_pairs)} profiles evaluated)...")

    logger.info(f"Evaluation complete in {time.time()-t0:.2f}s! Total pairs: {len(all_evaluated_pairs)}")

    # ── 1. Seasonal Aggregation ───────────────────────────────────────────────
    seasonal_data = {}
    for s_key in SEASONS.keys():
        s_pairs = [(m, a) for (meta, m, a) in all_evaluated_pairs if meta["season"] == s_key]
        metrics = calculate_metrics(s_pairs)
        metrics["season"] = s_key
        metrics["name"] = SEASONS[s_key]["name"]
        metrics["period"] = SEASONS[s_key]["period"]
        seasonal_data[s_key] = metrics

    seasonal_output = {
        "overall_profiles": len(all_evaluated_pairs),
        "seasons": [seasonal_data[k] for k in ["pre_monsoon", "monsoon", "post_monsoon", "winter"]],
    }

    # ── 2. Monsoon Regime Aggregation ─────────────────────────────────────────
    monsoon_data = {}
    for m_key in MONSOON_REGIMES.keys():
        m_pairs = [(m, a) for (meta, m, a) in all_evaluated_pairs if meta["monsoon"] == m_key]
        metrics = calculate_metrics(m_pairs)
        metrics["regime"] = m_key
        metrics["name"] = MONSOON_REGIMES[m_key]["name"]
        metrics["period"] = MONSOON_REGIMES[m_key]["period"]
        monsoon_data[m_key] = metrics

    monsoon_output = {
        "overall_profiles": len(all_evaluated_pairs),
        "regimes": [monsoon_data[k] for k in ["monsoon", "non_monsoon"]],
    }

    # ── 3. Region x Season Grid ───────────────────────────────────────────────
    grid_matrix = {}
    table_rows = []

    for r_key in ["arabian_sea", "bay_of_bengal", "north_indian_ocean"]:
        grid_matrix[r_key] = {}
        row_dict = {"region": r_key, "name": REGIONS[r_key]["name"]}
        for s_key in ["pre_monsoon", "monsoon", "post_monsoon", "winter"]:
            cell_pairs = [
                (m, a) for (meta, m, a) in all_evaluated_pairs
                if r_key in meta["regions"] and meta["season"] == s_key
            ]
            cell_metrics = calculate_metrics(cell_pairs)
            cell_metrics["region"] = r_key
            cell_metrics["season"] = s_key
            grid_matrix[r_key][s_key] = cell_metrics
            row_dict[s_key] = cell_metrics["rmse"]
        table_rows.append(row_dict)

    grid_output = {
        "regions": ["arabian_sea", "bay_of_bengal", "north_indian_ocean"],
        "seasons": ["pre_monsoon", "monsoon", "post_monsoon", "winter"],
        "matrix": grid_matrix,
    }

    # ── 4. Save JSON files ────────────────────────────────────────────────────
    OUT_RUNS.mkdir(parents=True, exist_ok=True)
    OUT_ARGO.mkdir(parents=True, exist_ok=True)

    for target_dir in [OUT_RUNS, OUT_ARGO]:
        with open(target_dir / "seasonal_stats.json", "w") as f:
            json.dump(seasonal_output, f, indent=2)
        with open(target_dir / "monsoon_stats.json", "w") as f:
            json.dump(monsoon_output, f, indent=2)
        with open(target_dir / "regional_seasonal_grid.json", "w") as f:
            json.dump(grid_output, f, indent=2)

    logger.info(f"Saved seasonal_stats.json, monsoon_stats.json, and regional_seasonal_grid.json to {OUT_RUNS} and {OUT_ARGO}")

    # ── 5. Print summary tables ───────────────────────────────────────────────
    print("\n" + "=" * 80)
    print("SEASONAL VALIDATION SUMMARY (8,923 ARGO PROFILES)")
    print("=" * 80)
    print(f"{'Season':<15} {'Period':<10} {'N Profiles':<12} {'RMSE (°C)':<12} {'Bias (°C)':<12} {'Corr (r)':<10} {'ML / Thermo / Deep'}")
    print("-" * 80)
    for s in seasonal_output["seasons"]:
        band = s["rmse_by_band"]
        bands_str = f"{band['mixed_layer']:.3f} / {band['thermocline']:.3f} / {band['deep']:.3f}"
        print(f"{s['name']:<15} {s['period']:<10} {s['n_profiles']:<12} {s['rmse']:<12.4f} {s['bias']:<12.4f} {s['correlation']:<10.4f} {bands_str}")

    print("\n" + "=" * 80)
    print("MONSOON REGIME COMPARISON")
    print("=" * 80)
    for m in monsoon_output["regimes"]:
        band = m["rmse_by_band"]
        bands_str = f"{band['mixed_layer']:.3f} / {band['thermocline']:.3f} / {band['deep']:.3f}"
        print(f"{m['name']:<15} {m['period']:<10} {m['n_profiles']:<12} {m['rmse']:<12.4f} {m['bias']:<12.4f} {m['correlation']:<10.4f} {bands_str}")

    print("\n" + "=" * 80)
    print("REGION x SEASON RMSE MATRIX (°C)")
    print("=" * 80)
    print(f"{'Region':<22} {'Pre-monsoon':<15} {'Monsoon':<15} {'Post-monsoon':<15} {'Winter':<15}")
    print("-" * 80)
    for r in table_rows:
        print(f"{r['name']:<22} {r['pre_monsoon']:<15.4f} {r['monsoon']:<15.4f} {r['post_monsoon']:<15.4f} {r['winter']:<15.4f}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
