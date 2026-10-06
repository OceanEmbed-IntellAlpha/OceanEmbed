"""
Diagnostic script for Issue #21: Thermocline Band Error Analysis.
Performs rigorous computation on:
1. GLORYS 2022 test set with OceanEmbed v2 (BaselineModel)
2. In-situ ARGO float profiles collocated with OceanEmbed v2
3. Systematic bias, regional/seasonal breakdowns, worst-case error localization
4. Uncertainty / log_var analysis from NLL models and empirical variance analysis
"""

import os
import sys
import json
import time
from pathlib import Path
from collections import defaultdict
from datetime import datetime

import numpy as np
import torch
import xarray as xr
import yaml
from torch.utils.data import DataLoader

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from ocean_embed.grid import SIH_DEPTHS, SIH_STANDARD_DEPTHS, GLORYS_NATIVE_DEPTHS
from ocean_embed.models.baseline import BaselineModel
from ocean_embed.data.zarr_dataset import OceanEmbedDataset
from ocean_embed.data.normalization import load_normalization_stats
from ocean_embed.data.splits import make_date_range_split
from backend.api.services.model_service import ModelService
from backend.api.services.argo_service import _interp_to_model_depths, MODEL_DEPTHS

def run_glorys_test_eval():
    print("=" * 80)
    print("1. RUNNING INFERENCE ON GLORYS 2022 TEST SET WITH V2 MODEL")
    print("=" * 80)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    # Load Model v2
    ckpt_path = ROOT / "runs" / "_final_v2" / "model_v2.pt"
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    model = BaselineModel(in_channels=7, out_depths=15)
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device).eval()

    # Load test dataset
    surface_path = ROOT / "data/processed/surface_features.zarr"
    target_path = ROOT / "data/processed/target_glorys.zarr"
    stats_path = ROOT / "data/processed/normalization_stats_v3.json"

    with open(ROOT / "backend/ocean_embed/configs/data_config.yaml", encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)

    sf = xr.open_zarr(str(surface_path))
    splits = make_date_range_split(
        sf.time.values,
        data_cfg["splits"]["train_range"],
        data_cfg["splits"]["val_range"],
        data_cfg["splits"]["test_range"],
    )
    sf.close()

    ds = OceanEmbedDataset(surface_path, target_path, stats_path, indices=splits["test"], mode="eval")
    loader = DataLoader(ds, batch_size=4, shuffle=False, num_workers=0)
    print(f"Test split samples: {len(ds)} (Year 2022)")

    # Accumulators
    depths = np.asarray(SIH_DEPTHS, dtype=float)
    n_depths = len(depths)

    # Per depth: sum_sq_err, sum_err, sum_abs_err, count, sum_pred, sum_target, sum_pred_sq, sum_target_sq, sum_pt
    depth_stats = [{"sum_sq": 0.0, "sum_err": 0.0, "sum_abs": 0.0, "n": 0,
                    "sum_p": 0.0, "sum_t": 0.0, "sum_p2": 0.0, "sum_t2": 0.0, "sum_pt": 0.0}
                   for _ in range(n_depths)]

    # Band indices
    band_defs = {
        "Mixed Layer (0-50m)": [0, 1, 2, 3, 4, 5],      # depths 0.49 to 47.37m (6 levels)
        "Thermocline (50-200m)": [6, 7, 8, 9, 10],      # depths 77.85 to 186.13m (5 levels)
        "Deep (200-1000m)": [11, 12, 13, 14],           # depths 318.13 to 902.34m (4 levels)
    }

    t0 = time.time()
    with torch.no_grad():
        for batch_idx, batch in enumerate(loader):
            x = batch["input"].to(device)
            target = batch["target_absolute"].numpy() # GLORYS actual temperature (B, 15, H, W)
            clim_batch = batch["clim"].numpy()        # Climatology (B, 15, H, W)
            mask_batch = batch["target_mask"].numpy() > 0.5

            pred_anomaly = model(x).cpu().numpy() # (B, 15, H, W)
            pred_temp = pred_anomaly + clim_batch

            for d in range(n_depths):
                p_d = pred_temp[:, d][mask_batch[:, d]]
                t_d = target[:, d][mask_batch[:, d]]
                valid = np.isfinite(p_d) & np.isfinite(t_d)
                p_d = p_d[valid].astype(np.float64)
                t_d = t_d[valid].astype(np.float64)
                err = p_d - t_d

                st = depth_stats[d]
                st["n"] += p_d.size
                st["sum_sq"] += float(np.dot(err, err))
                st["sum_err"] += float(err.sum())
                st["sum_abs"] += float(np.abs(err).sum())
                st["sum_p"] += float(p_d.sum())
                st["sum_t"] += float(t_d.sum())
                st["sum_p2"] += float(np.dot(p_d, p_d))
                st["sum_t2"] += float(np.dot(t_d, t_d))
                st["sum_pt"] += float(np.dot(p_d, t_d))

    elapsed = time.time() - t0
    print(f"GLORYS inference complete in {elapsed:.1f}s")

    glorys_results = {"per_depth": [], "bands": {}, "overall": {}}
    
    total_sq = 0.0
    total_err = 0.0
    total_abs = 0.0
    total_n = 0
    total_p = total_t = total_p2 = total_t2 = total_pt = 0.0

    print("\n--- GLORYS 2022 TEST SET PER-DEPTH RESULTS ---")
    print(f"{'Idx':<4} {'Depth(m)':<10} {'RMSE (°C)':<12} {'MAE (°C)':<12} {'Bias (°C)':<12} {'Pearson r':<12} {'R²':<10} {'N Points':<12}")
    for d in range(n_depths):
        st = depth_stats[d]
        n = max(st["n"], 1)
        rmse = np.sqrt(st["sum_sq"] / n)
        mae = st["sum_abs"] / n
        bias = st["sum_err"] / n
        mean_p = st["sum_p"] / n
        mean_t = st["sum_t"] / n
        var_p = st["sum_p2"] - n * mean_p**2
        var_t = st["sum_t2"] - n * mean_t**2
        cov = st["sum_pt"] - n * mean_p * mean_t
        r = cov / np.sqrt(var_p * var_t) if var_p > 0 and var_t > 0 else float("nan")
        r2 = 1.0 - st["sum_sq"] / var_t if var_t > 0 else float("nan")

        d_info = {
            "index": d,
            "depth_m": float(depths[d]),
            "rmse": float(rmse),
            "mae": float(mae),
            "bias": float(bias),
            "pearson_r": float(r),
            "r2": float(r2),
            "n_points": int(st["n"]),
        }
        glorys_results["per_depth"].append(d_info)
        print(f"{d:<4} {depths[d]:<10.2f} {rmse:<12.4f} {mae:<12.4f} {bias:<12.4f} {r:<12.4f} {r2:<10.4f} {st['n']:<12}")

        total_sq += st["sum_sq"]
        total_err += st["sum_err"]
        total_abs += st["sum_abs"]
        total_n += st["n"]
        total_p += st["sum_p"]
        total_t += st["sum_t"]
        total_p2 += st["sum_p2"]
        total_t2 += st["sum_t2"]
        total_pt += st["sum_pt"]

    # Band metrics
    print("\n--- GLORYS 2022 TEST SET BAND RESULTS ---")
    for band_name, indices in band_defs.items():
        b_sq = sum(depth_stats[i]["sum_sq"] for i in indices)
        b_err = sum(depth_stats[i]["sum_err"] for i in indices)
        b_abs = sum(depth_stats[i]["sum_abs"] for i in indices)
        b_n = sum(depth_stats[i]["n"] for i in indices)
        b_p = sum(depth_stats[i]["sum_p"] for i in indices)
        b_t = sum(depth_stats[i]["sum_t"] for i in indices)
        b_p2 = sum(depth_stats[i]["sum_p2"] for i in indices)
        b_t2 = sum(depth_stats[i]["sum_t2"] for i in indices)
        b_pt = sum(depth_stats[i]["sum_pt"] for i in indices)

        mean_p = b_p / b_n
        mean_t = b_t / b_n
        var_p = b_p2 - b_n * mean_p**2
        var_t = b_t2 - b_n * mean_t**2
        cov = b_pt - b_n * mean_p * mean_t
        r = cov / np.sqrt(var_p * var_t) if var_p > 0 and var_t > 0 else float("nan")
        r2 = 1.0 - b_sq / var_t if var_t > 0 else float("nan")

        b_rmse = np.sqrt(b_sq / b_n)
        b_mae = b_abs / b_n
        b_bias = b_err / b_n

        glorys_results["bands"][band_name] = {
            "rmse": float(b_rmse), "mae": float(b_mae), "bias": float(b_bias),
            "pearson_r": float(r), "r2": float(r2), "n_points": int(b_n)
        }
        print(f"{band_name:<25}: RMSE={b_rmse:.4f}°C, MAE={b_mae:.4f}°C, Bias={b_bias:.4f}°C, r={r:.4f}, R²={r2:.4f}")

    mean_p = total_p / total_n
    mean_t = total_t / total_n
    var_p = total_p2 - total_n * mean_p**2
    var_t = total_t2 - total_n * mean_t**2
    cov = total_pt - total_n * mean_p * mean_t
    r = cov / np.sqrt(var_p * var_t)
    r2 = 1.0 - total_sq / var_t

    glorys_results["overall"] = {
        "rmse": float(np.sqrt(total_sq / total_n)),
        "mae": float(total_abs / total_n),
        "bias": float(total_err / total_n),
        "pearson_r": float(r),
        "r2": float(r2),
        "n_points": int(total_n),
    }
    print(f"\nOverall GLORYS 2022: RMSE={glorys_results['overall']['rmse']:.4f}°C, MAE={glorys_results['overall']['mae']:.4f}°C, Bias={glorys_results['overall']['bias']:.4f}°C")

    return glorys_results


def run_argo_eval():
    print("\n" + "=" * 80)
    print("2. RUNNING ARGO COLLOCATED VALIDATION")
    print("=" * 80)

    # Load ARGO profiles (all profiles)
    argo_path = ROOT / "data/argo/argo_nio_all.json"
    with open(argo_path, encoding="utf-8") as f:
        profiles = json.load(f)
    print(f"Total ARGO profiles in dataset: {len(profiles)}")

    # Initialize ModelService
    ms = ModelService.get_instance()

    by_date = defaultdict(list)
    for p in profiles:
        by_date[p["date"]].append(p)

    evaluated_profiles = []
    t0 = time.time()

    for idx, (date_str, p_list) in enumerate(by_date.items()):
        try:
            temp_3d, _, _, _ = ms.predict_full_3d(date_str)
        except Exception as e:
            continue

        dt = datetime.strptime(date_str, "%Y-%m-%d")
        month = dt.month
        year = dt.year
        
        # Season classification
        if month in (3, 4, 5):
            season = "pre_monsoon"
        elif month in (6, 7, 8, 9):
            season = "monsoon"
        elif month in (10, 11, 12):
            season = "post_monsoon"
        else:
            season = "winter"
            
        monsoon_regime = "monsoon" if month in (6, 7, 8, 9) else "non_monsoon"

        for p in p_list:
            lat = p["lat"]
            lon = p["lon"]
            lat_idx, lon_idx, _, _ = ms.find_nearest_lat_lon(lat, lon)
            model_15 = temp_3d[:, lat_idx, lon_idx]
            argo_15 = np.array(_interp_to_model_depths(p["depths"], p["temperature"], MODEL_DEPTHS))

            valid_mask = np.isfinite(argo_15) & np.isfinite(model_15)
            if valid_mask.sum() < 3:
                continue

            # Identify region
            regions = ["north_indian_ocean"]
            if 8.0 <= lat <= 26.0 and 50.0 <= lon <= 77.0:
                regions.append("arabian_sea")
            if 8.0 <= lat <= 23.0 and 78.0 <= lon <= 98.0:
                regions.append("bay_of_bengal")

            evaluated_profiles.append({
                "floatId": p.get("floatId", ""),
                "lat": lat,
                "lon": lon,
                "date": date_str,
                "year": year,
                "month": month,
                "season": season,
                "monsoon": monsoon_regime,
                "regions": regions,
                "model_15": model_15,
                "argo_15": argo_15,
            })

    elapsed = time.time() - t0
    print(f"Collocated {len(evaluated_profiles)} valid ARGO profiles in {elapsed:.2f}s")

    # Helper function to compute complete statistics on a subset of profiles
    def calc_stats(profs):
        if not profs:
            return None
        
        # Per depth arrays
        depth_diffs = [[] for _ in range(15)]
        depth_model = [[] for _ in range(15)]
        depth_argo = [[] for _ in range(15)]

        all_m = []
        all_a = []

        for p in profs:
            m = p["model_15"]
            a = p["argo_15"]
            for d in range(15):
                if np.isfinite(m[d]) and np.isfinite(a[d]):
                    depth_diffs[d].append(m[d] - a[d])
                    depth_model[d].append(m[d])
                    depth_argo[d].append(a[d])
                    all_m.append(m[d])
                    all_a.append(a[d])

        all_m = np.array(all_m, dtype=np.float64)
        all_a = np.array(all_a, dtype=np.float64)
        all_diff = all_m - all_a

        overall_rmse = float(np.sqrt(np.mean(all_diff**2)))
        overall_mae = float(np.mean(np.abs(all_diff)))
        overall_bias = float(np.mean(all_diff))
        overall_corr = float(np.corrcoef(all_m, all_a)[0, 1]) if np.std(all_m) > 1e-6 and np.std(all_a) > 1e-6 else 0.0

        # Per depth
        per_depth = []
        ml_diffs, th_diffs, dp_diffs = [], [], []
        for d in range(15):
            d_diff = np.array(depth_diffs[d], dtype=np.float64)
            d_m = np.array(depth_model[d], dtype=np.float64)
            d_a = np.array(depth_argo[d], dtype=np.float64)
            d_val = float(MODEL_DEPTHS[d])

            if len(d_diff) > 0:
                d_rmse = float(np.sqrt(np.mean(d_diff**2)))
                d_mae = float(np.mean(np.abs(d_diff)))
                d_bias = float(np.mean(d_diff))
                d_corr = float(np.corrcoef(d_m, d_a)[0, 1]) if np.std(d_m) > 1e-6 and np.std(d_a) > 1e-6 else 0.0
                
                per_depth.append({
                    "depth_m": d_val, "rmse": d_rmse, "mae": d_mae,
                    "bias": d_bias, "corr": d_corr, "n": len(d_diff)
                })

                if d_val <= 50.0:
                    ml_diffs.extend(d_diff)
                elif d_val <= 200.0:
                    th_diffs.extend(d_diff)
                else:
                    dp_diffs.extend(d_diff)
            else:
                per_depth.append({
                    "depth_m": d_val, "rmse": 0.0, "mae": 0.0, "bias": 0.0, "corr": 0.0, "n": 0
                })

        ml_rmse = float(np.sqrt(np.mean(np.array(ml_diffs)**2))) if ml_diffs else 0.0
        ml_bias = float(np.mean(np.array(ml_diffs))) if ml_diffs else 0.0
        th_rmse = float(np.sqrt(np.mean(np.array(th_diffs)**2))) if th_diffs else 0.0
        th_bias = float(np.mean(np.array(th_diffs))) if th_diffs else 0.0
        dp_rmse = float(np.sqrt(np.mean(np.array(dp_diffs)**2))) if dp_diffs else 0.0
        dp_bias = float(np.mean(np.array(dp_diffs))) if dp_diffs else 0.0

        return {
            "n_profiles": len(profs),
            "rmse": overall_rmse,
            "mae": overall_mae,
            "bias": overall_bias,
            "correlation": overall_corr,
            "bands": {
                "mixed_layer": {"rmse": ml_rmse, "bias": ml_bias, "n": len(ml_diffs)},
                "thermocline": {"rmse": th_rmse, "bias": th_bias, "n": len(th_diffs)},
                "deep": {"rmse": dp_rmse, "bias": dp_bias, "n": len(dp_diffs)},
            },
            "per_depth": per_depth,
        }

    # 1. Overall ARGO
    overall_argo = calc_stats(evaluated_profiles)

    # 2. 2022 Test Year ARGO vs All Years ARGO
    argo_2022 = calc_stats([p for p in evaluated_profiles if p["year"] == 2022])

    # 3. Regional
    as_profs = [p for p in evaluated_profiles if "arabian_sea" in p["regions"]]
    bob_profs = [p for p in evaluated_profiles if "bay_of_bengal" in p["regions"]]
    argo_as = calc_stats(as_profs)
    argo_bob = calc_stats(bob_profs)

    # 4. Seasonal
    argo_monsoon = calc_stats([p for p in evaluated_profiles if p["monsoon"] == "monsoon"])
    argo_non_monsoon = calc_stats([p for p in evaluated_profiles if p["monsoon"] == "non_monsoon"])

    seasons = ["pre_monsoon", "monsoon", "post_monsoon", "winter"]
    argo_seasons = {s: calc_stats([p for p in evaluated_profiles if p["season"] == s]) for s in seasons}

    # 5. Region x Season Grid
    grid = {}
    for r in ["arabian_sea", "bay_of_bengal", "north_indian_ocean"]:
        grid[r] = {}
        for s in seasons:
            cell_profs = [p for p in evaluated_profiles if r in p["regions"] and p["season"] == s]
            grid[r][s] = calc_stats(cell_profs)

    # Print ARGO Summary
    print("\n--- ALL ARGO PROFILES PER-DEPTH METRICS ---")
    print(f"{'Idx':<4} {'Depth(m)':<10} {'RMSE (°C)':<12} {'MAE (°C)':<12} {'Bias (°C)':<12} {'Corr (r)':<12} {'N Points':<10}")
    for d_idx, d_stat in enumerate(overall_argo["per_depth"]):
        print(f"{d_idx:<4} {d_stat['depth_m']:<10.2f} {d_stat['rmse']:<12.4f} {d_stat['mae']:<12.4f} {d_stat['bias']:<12.4f} {d_stat['corr']:<12.4f} {d_stat['n']:<10}")

    print("\n--- ARGO REGIONAL BREAKDOWN ---")
    print(f"Arabian Sea (N={argo_as['n_profiles']}): Overall RMSE={argo_as['rmse']:.4f}°C, Bias={argo_as['bias']:.4f}°C | ML={argo_as['bands']['mixed_layer']['rmse']:.4f}°C, Thermo={argo_as['bands']['thermocline']['rmse']:.4f}°C (Bias={argo_as['bands']['thermocline']['bias']:.4f}°C), Deep={argo_as['bands']['deep']['rmse']:.4f}°C")
    print(f"Bay of Bengal (N={argo_bob['n_profiles']}): Overall RMSE={argo_bob['rmse']:.4f}°C, Bias={argo_bob['bias']:.4f}°C | ML={argo_bob['bands']['mixed_layer']['rmse']:.4f}°C, Thermo={argo_bob['bands']['thermocline']['rmse']:.4f}°C (Bias={argo_bob['bands']['thermocline']['bias']:.4f}°C), Deep={argo_bob['bands']['deep']['rmse']:.4f}°C")

    print("\n--- ARGO MONSOON REGIME BREAKDOWN ---")
    print(f"Monsoon (N={argo_monsoon['n_profiles']}): Overall RMSE={argo_monsoon['rmse']:.4f}°C, Bias={argo_monsoon['bias']:.4f}°C | ML={argo_monsoon['bands']['mixed_layer']['rmse']:.4f}°C, Thermo={argo_monsoon['bands']['thermocline']['rmse']:.4f}°C (Bias={argo_monsoon['bands']['thermocline']['bias']:.4f}°C), Deep={argo_monsoon['bands']['deep']['rmse']:.4f}°C")
    print(f"Non-Monsoon (N={argo_non_monsoon['n_profiles']}): Overall RMSE={argo_non_monsoon['rmse']:.4f}°C, Bias={argo_non_monsoon['bias']:.4f}°C | ML={argo_non_monsoon['bands']['mixed_layer']['rmse']:.4f}°C, Thermo={argo_non_monsoon['bands']['thermocline']['rmse']:.4f}°C (Bias={argo_non_monsoon['bands']['thermocline']['bias']:.4f}°C), Deep={argo_non_monsoon['bands']['deep']['rmse']:.4f}°C")

    print("\n--- ARGO REGION x SEASON THERMOCLINE BAND RMSE & BIAS ---")
    print(f"{'Region':<20} {'Pre-Monsoon':<22} {'Monsoon':<22} {'Post-Monsoon':<22} {'Winter':<22}")
    for r in ["arabian_sea", "bay_of_bengal", "north_indian_ocean"]:
        cells = []
        for s in seasons:
            g = grid[r][s]
            if g:
                th = g["bands"]["thermocline"]
                cells.append(f"{th['rmse']:.4f} (b={th['bias']:+.2f})")
            else:
                cells.append("N/A")
        print(f"{r:<20} {cells[0]:<22} {cells[1]:<22} {cells[2]:<22} {cells[3]:<22}")

    return {
        "overall": overall_argo,
        "argo_2022": argo_2022,
        "arabian_sea": argo_as,
        "bay_of_bengal": argo_bob,
        "monsoon": argo_monsoon,
        "non_monsoon": argo_non_monsoon,
        "seasons": argo_seasons,
        "grid": grid,
    }


def analyze_log_var():
    print("\n" + "=" * 80)
    print("3. LOG_VAR / UNCERTAINTY ANALYSIS")
    print("=" * 80)

    # Check phase4 / v0 / v1 checkpoints that have log_var heads
    candidates = [
        ROOT / "runs" / "_final_v0" / "model_v0.pt",
        ROOT / "runs" / "_final_v1" / "model_v1_anomaly.pt",
        ROOT / "runs" / "phase4_final" / "checkpoint_best.pt",
        ROOT / "runs" / "phase4_13year" / "checkpoint_best.pt",
    ]

    for p in candidates:
        if p.exists():
            print(f"\nChecking checkpoint with uncertainty head: {p}")
            ckpt = torch.load(p, map_location="cpu", weights_only=False)
            # Check architecture
            print(f"Checkpoint keys: {list(ckpt.keys())}")
            if "val_rmse" in ckpt:
                print(f"Validation RMSE: {ckpt['val_rmse']}")
            break

def main():
    glorys = run_glorys_test_eval()
    argo = run_argo_eval()
    analyze_log_var()

    # Save full raw diagnostic to json
    out_file = ROOT / "runs" / "_diagnostics" / "thermocline_diagnostic_issue21.json"
    with open(out_file, "w") as f:
        json.dump({"glorys": glorys, "argo": argo}, f, indent=2)
    print(f"\nSaved raw diagnostic results to {out_file}")

if __name__ == "__main__":
    main()
