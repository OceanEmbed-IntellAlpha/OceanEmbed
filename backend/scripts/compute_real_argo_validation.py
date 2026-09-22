"""
Rigorous, Fully Computed In-Situ Validation of OceanEmbed v2 against 8,923 Argo Profiles.

Strict Requirements:
  - 100% computed from real data using ModelService inference on each profile's (lat, lon, date).
  - No synthetic scaling or hardcoded estimation.
  - Generates seasonal_stats.json, monsoon_stats.json, and regional_seasonal_grid.json with provenance metadata.
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

# Setup path
ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.api.services.model_service import ModelService
from backend.api.services.argo_service import _interp_to_model_depths, MODEL_DEPTHS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("argo_eval")

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


def get_regions(lat: float, lon: float) -> List[str]:
    regs = ["north_indian_ocean"]
    if 8.0 <= lat <= 26.0 and 50.0 <= lon <= 77.0:
        regs.append("arabian_sea")
    if 8.0 <= lat <= 23.0 and 78.0 <= lon <= 98.0:
        regs.append("bay_of_bengal")
    return regs


def compute_metrics(pairs: List[Tuple[np.ndarray, np.ndarray]]) -> Dict[str, Any]:
    """Compute exact RMSE, bias, Pearson correlation, and depth-band breakdown from paired arrays."""
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

    for m_arr, a_arr in pairs:
        for d_idx, d_val in enumerate(MODEL_DEPTHS):
            m_v = m_arr[d_idx]
            a_v = a_arr[d_idx]
            if np.isfinite(m_v) and np.isfinite(a_v):
                all_model.append(m_v)
                all_argo.append(a_v)
                depth_diffs[d_val].append(m_v - a_v)

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
        overall_corr = 0.0

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
        else:
            rmse_by_depth.append({"depth": round(float(d_val), 2), "rmse": 0.0})

    ml_rmse = float(np.sqrt(np.mean(np.array(ml_diffs)**2))) if ml_diffs else 0.0
    th_rmse = float(np.sqrt(np.mean(np.array(th_diffs)**2))) if th_diffs else 0.0
    dp_rmse = float(np.sqrt(np.mean(np.array(dp_diffs)**2))) if dp_diffs else 0.0

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
    logger.info("Executing 100% Real Model vs Argo Validation Across 8,923 Profiles")
    logger.info("=" * 70)

    with open(ARGO_FILE) as f:
        profiles = json.load(f)
    logger.info(f"Loaded {len(profiles)} Argo profiles.")

    # Initialize ModelService
    ms = ModelService.get_instance()
    logger.info("ModelService initialized on GPU/CPU.")

    # Group profiles by date for 3D domain prediction optimization
    by_date = defaultdict(list)
    for p in profiles:
        by_date[p["date"]].append(p)

    logger.info(f"Collocating and evaluating across {len(by_date)} distinct dates...")

    evaluated_profiles = []
    t0 = time.time()

    for idx, (date_str, p_list) in enumerate(by_date.items()):
        try:
            temp_3d, _, _, _ = ms.predict_full_3d(date_str)
        except Exception as e:
            logger.warning(f"Error predicting date {date_str}: {e}")
            continue

        dt = datetime.strptime(date_str, "%Y-%m-%d")
        month = dt.month
        season = get_season(month)
        monsoon = get_monsoon_regime(month)

        for p in p_list:
            lat = p["lat"]
            lon = p["lon"]
            lat_idx, lon_idx, _, _ = ms.find_nearest_lat_lon(lat, lon)
            model_15 = temp_3d[:, lat_idx, lon_idx]

            # Interp Argo to model depths with NaN for unobserved depth ranges
            argo_15 = np.array(_interp_to_model_depths(p["depths"], p["temperature"], MODEL_DEPTHS))

            # Discard profiles that have no overlapping valid points
            valid_mask = np.isfinite(argo_15) & np.isfinite(model_15)
            if valid_mask.sum() < 3:
                continue

            meta = {
                "floatId": p.get("floatId", ""),
                "lat": lat,
                "lon": lon,
                "date": date_str,
                "month": month,
                "season": season,
                "monsoon": monsoon,
                "regions": get_regions(lat, lon),
            }
            evaluated_profiles.append((meta, model_15, argo_15))

        if (idx + 1) % 250 == 0:
            logger.info(f"  Processed {idx+1}/{len(by_date)} dates ({len(evaluated_profiles)} valid matchups)...")

    elapsed = time.time() - t0
    logger.info(f"Completed collocation on {len(evaluated_profiles)} profiles in {elapsed:.2f}s ({1000*elapsed/len(evaluated_profiles):.2f}ms/profile)")

    now_iso = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    provenance_str = (
        f"computed from {len(evaluated_profiles)} collocated Argo profiles via "
        f"date-grouped ModelService.predict_full_3d and nearest-cell extraction on {now_iso}"
    )

    # 1. Overall Basin Metrics
    overall_pairs = [(m, a) for (_, m, a) in evaluated_profiles]
    overall_stats = compute_metrics(overall_pairs)

    # 2. Seasonal Breakdowns
    seasons_list = []
    for s_key in ["pre_monsoon", "monsoon", "post_monsoon", "winter"]:
        s_pairs = [(m, a) for (meta, m, a) in evaluated_profiles if meta["season"] == s_key]
        m_dict = compute_metrics(s_pairs)
        m_dict["season"] = s_key
        m_dict["name"] = SEASONS[s_key]["name"]
        m_dict["period"] = SEASONS[s_key]["period"]
        seasons_list.append(m_dict)

    seasonal_output = {
        "_provenance": provenance_str,
        "overall_profiles": len(evaluated_profiles),
        "overall_rmse": overall_stats["rmse"],
        "overall_bias": overall_stats["bias"],
        "overall_correlation": overall_stats["correlation"],
        "seasons": seasons_list,
    }

    # 3. Monsoon Regime Breakdowns
    regimes_list = []
    for m_key in ["monsoon", "non_monsoon"]:
        m_pairs = [(m, a) for (meta, m, a) in evaluated_profiles if meta["monsoon"] == m_key]
        m_dict = compute_metrics(m_pairs)
        m_dict["regime"] = m_key
        m_dict["name"] = MONSOON_REGIMES[m_key]["name"]
        m_dict["period"] = MONSOON_REGIMES[m_key]["period"]
        regimes_list.append(m_dict)

    monsoon_output = {
        "_provenance": provenance_str,
        "overall_profiles": len(evaluated_profiles),
        "regimes": regimes_list,
    }

    # 4. Region x Season Grid
    grid_matrix = {}
    table_rows = []

    for r_key in ["arabian_sea", "bay_of_bengal", "north_indian_ocean"]:
        grid_matrix[r_key] = {}
        row_dict = {"region": r_key, "name": REGIONS[r_key]["name"]}
        for s_key in ["pre_monsoon", "monsoon", "post_monsoon", "winter"]:
            cell_pairs = [
                (m, a) for (meta, m, a) in evaluated_profiles
                if r_key in meta["regions"] and meta["season"] == s_key
            ]
            cell_metrics = compute_metrics(cell_pairs)
            grid_matrix[r_key][s_key] = {
                "n_profiles": cell_metrics["n_profiles"],
                "rmse": cell_metrics["rmse"],
                "bias": cell_metrics["bias"],
                "correlation": cell_metrics["correlation"],
                "rmse_by_band": cell_metrics["rmse_by_band"],
            }
            row_dict[s_key] = cell_metrics["rmse"]
        table_rows.append(row_dict)

    grid_output = {
        "_provenance": provenance_str,
        "regions": ["arabian_sea", "bay_of_bengal", "north_indian_ocean"],
        "seasons": ["pre_monsoon", "monsoon", "post_monsoon", "winter"],
        "matrix": grid_matrix,
    }

    # Save to both target directories
    for target_dir in [OUT_RUNS, OUT_ARGO]:
        target_dir.mkdir(parents=True, exist_ok=True)
        with open(target_dir / "seasonal_stats.json", "w") as f:
            json.dump(seasonal_output, f, indent=2)
        with open(target_dir / "monsoon_stats.json", "w") as f:
            json.dump(monsoon_output, f, indent=2)
        with open(target_dir / "regional_seasonal_grid.json", "w") as f:
            json.dump(grid_output, f, indent=2)

    logger.info("JSON outputs successfully saved with provenance tags.")

    # Print Full Raw Results Table
    print("\n" + "=" * 95)
    print(f"ACTUAL COMPUTED VALIDATION RESULTS ({len(evaluated_profiles)} ARGO PROFILES)")
    print("=" * 95)
    print(f"{'Season':<15} {'Period':<10} {'N Profiles':<12} {'RMSE (°C)':<12} {'Bias (°C)':<12} {'Corr (r)':<10} {'ML / Thermo / Deep (°C)'}")
    print("-" * 95)
    for s in seasonal_output["seasons"]:
        band = s["rmse_by_band"]
        bands_str = f"{band['mixed_layer']:.4f} / {band['thermocline']:.4f} / {band['deep']:.4f}"
        print(f"{s['name']:<15} {s['period']:<10} {s['n_profiles']:<12} {s['rmse']:<12.4f} {s['bias']:<12.4f} {s['correlation']:<10.4f} {bands_str}")

    print("\n" + "=" * 95)
    print("MONSOON REGIME COMPARISON (ACTUAL COMPUTED)")
    print("=" * 95)
    for m in monsoon_output["regimes"]:
        band = m["rmse_by_band"]
        bands_str = f"{band['mixed_layer']:.4f} / {band['thermocline']:.4f} / {band['deep']:.4f}"
        print(f"{m['name']:<15} {m['period']:<10} {m['n_profiles']:<12} {m['rmse']:<12.4f} {m['bias']:<12.4f} {m['correlation']:<10.4f} {bands_str}")

    print("\n" + "=" * 95)
    print("REGION x SEASON RMSE MATRIX (ACTUAL COMPUTED, °C)")
    print("=" * 95)
    print(f"{'Region':<22} {'Pre-monsoon':<15} {'Monsoon':<15} {'Post-monsoon':<15} {'Winter':<15}")
    print("-" * 95)
    for r in table_rows:
        print(f"{r['name']:<22} {r['pre_monsoon']:<15.4f} {r['monsoon']:<15.4f} {r['post_monsoon']:<15.4f} {r['winter']:<15.4f}")
    print("=" * 95 + "\n")


if __name__ == "__main__":
    main()
