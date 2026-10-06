"""
evaluate_phase8_vs_v2.py — Compare Phase 8 (Option A WeightedMSE) against Baseline v2
Evaluates:
1. GLORYS 2022 Test Set (per-depth RMSE, bias, band metrics)
2. ARGO In-Situ Float Profiles (collocated profiles in 2022 and all years)
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

from ocean_embed.grid import SIH_DEPTHS, GLORYS_NATIVE_DEPTHS
from ocean_embed.models.baseline import BaselineModel
from ocean_embed.data.zarr_dataset import OceanEmbedDataset
from ocean_embed.data.splits import make_date_range_split
from backend.api.services.argo_service import _interp_to_model_depths, MODEL_DEPTHS

def run_glorys_eval(ckpt_path, device, loader, n_depths, depths, band_defs):
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    state = ckpt.get("model_state_dict", ckpt)
    model = BaselineModel(in_channels=7, out_depths=15)
    model.load_state_dict(state)
    model.to(device).eval()

    depth_stats = [{"sum_sq": 0.0, "sum_err": 0.0, "sum_abs": 0.0, "n": 0} for _ in range(n_depths)]

    with torch.no_grad():
        for batch in loader:
            x = batch["input"].to(device)
            target = batch["target_absolute"].numpy()
            clim_batch = batch["clim"].numpy()
            mask_batch = batch["target_mask"].numpy() > 0.5

            pred_anomaly = model(x).cpu().numpy()
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

    total_sq = sum(st["sum_sq"] for st in depth_stats)
    total_err = sum(st["sum_err"] for st in depth_stats)
    total_abs = sum(st["sum_abs"] for st in depth_stats)
    total_n = sum(st["n"] for st in depth_stats)

    res = {
        "overall": {
            "rmse": float(np.sqrt(total_sq / total_n)),
            "mae": float(total_abs / total_n),
            "bias": float(total_err / total_n),
        },
        "depths": [],
        "bands": {}
    }

    for d in range(n_depths):
        st = depth_stats[d]
        n = max(st["n"], 1)
        res["depths"].append({
            "depth": float(depths[d]),
            "rmse": float(np.sqrt(st["sum_sq"] / n)),
            "mae": float(st["sum_abs"] / n),
            "bias": float(st["sum_err"] / n),
            "n": int(st["n"])
        })

    for band_name, idxs in band_defs.items():
        b_sq = sum(depth_stats[i]["sum_sq"] for i in idxs)
        b_err = sum(depth_stats[i]["sum_err"] for i in idxs)
        b_abs = sum(depth_stats[i]["sum_abs"] for i in idxs)
        b_n = sum(depth_stats[i]["n"] for i in idxs)
        res["bands"][band_name] = {
            "rmse": float(np.sqrt(b_sq / b_n)),
            "mae": float(b_abs / b_n),
            "bias": float(b_err / b_n),
            "n": int(b_n)
        }

    return res

from backend.api.services.model_service import ModelService

def run_argo_eval(ckpt_path, profiles):
    ms = ModelService.get_instance()
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    state = ckpt.get("model_state_dict", ckpt)
    ms.model.load_state_dict(state)
    ms.model.eval()

    by_date = defaultdict(list)
    for p in profiles:
        by_date[p["date"]].append(p)

    evaluated_profs = []
    for date_str, p_list in by_date.items():
        try:
            temp_3d, _, _, _ = ms.predict_full_3d(date_str)
        except Exception:
            continue

        dt = datetime.strptime(date_str, "%Y-%m-%d")
        month = dt.month
        year = dt.year
        season = "monsoon" if month in (6, 7, 8, 9) else "non_monsoon"

        for p in p_list:
            plat, plon = p["lat"], p["lon"]
            lat_i, lon_i, _, _ = ms.find_nearest_lat_lon(plat, plon)
            m_15 = temp_3d[:, lat_i, lon_i]
            a_15 = np.array(_interp_to_model_depths(p["depths"], p["temperature"], MODEL_DEPTHS))

            val = np.isfinite(m_15) & np.isfinite(a_15)
            if val.sum() < 3:
                continue

            regions = ["NIO"]
            if 8.0 <= plat <= 26.0 and 50.0 <= plon <= 77.0:
                regions.append("Arabian Sea")
            if 8.0 <= plat <= 23.0 and 78.0 <= plon <= 98.0:
                regions.append("Bay of Bengal")

            evaluated_profs.append({
                "year": year,
                "season": season,
                "regions": regions,
                "m_15": m_15,
                "a_15": a_15,
            })

    def calc_stats(profs):
        if not profs:
            return None
        all_diffs = []
        ml_diffs, th_diffs, dp_diffs = [], [], []
        depth_diffs = [[] for _ in range(15)]

        for p in profs:
            m, a = p["m_15"], p["a_15"]
            for d in range(15):
                if np.isfinite(m[d]) and np.isfinite(a[d]):
                    diff = m[d] - a[d]
                    depth_diffs[d].append(diff)
                    all_diffs.append(diff)
                    depth_val = float(MODEL_DEPTHS[d])
                    if depth_val <= 50.0:
                        ml_diffs.append(diff)
                    elif depth_val <= 200.0:
                        th_diffs.append(diff)
                    else:
                        dp_diffs.append(diff)

        def r_b(arr):
            if not arr:
                return 0.0, 0.0
            a = np.array(arr, dtype=np.float64)
            return float(np.sqrt(np.mean(a**2))), float(np.mean(a))

        ov_r, ov_b = r_b(all_diffs)
        ml_r, ml_b = r_b(ml_diffs)
        th_r, th_b = r_b(th_diffs)
        dp_r, dp_b = r_b(dp_diffs)

        per_d = []
        for d in range(15):
            r, b = r_b(depth_diffs[d])
            per_d.append({"depth": float(MODEL_DEPTHS[d]), "rmse": r, "bias": b, "n": len(depth_diffs[d])})

        return {
            "n": len(profs),
            "overall": {"rmse": ov_r, "bias": ov_b},
            "bands": {
                "mixed_layer": {"rmse": ml_r, "bias": ml_b},
                "thermocline": {"rmse": th_r, "bias": th_b},
                "deep": {"rmse": dp_r, "bias": dp_b},
            },
            "per_depth": per_d
        }

    return {
        "all": calc_stats(evaluated_profs),
        "2022": calc_stats([p for p in evaluated_profs if p["year"] == 2022]),
        "arabian_sea": calc_stats([p for p in evaluated_profs if "Arabian Sea" in p["regions"]]),
        "bay_of_bengal": calc_stats([p for p in evaluated_profs if "Bay of Bengal" in p["regions"]]),
        "monsoon": calc_stats([p for p in evaluated_profs if p["season"] == "monsoon"]),
        "non_monsoon": calc_stats([p for p in evaluated_profs if p["season"] == "non_monsoon"]),
    }

def main():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")

    surface_path = ROOT / "data/processed/surface_features.zarr"
    target_path = ROOT / "data/processed/target_glorys.zarr"
    stats_path = ROOT / "data/processed/normalization_stats_v3.json"

    with open(ROOT / "backend/ocean_embed/configs/data_config.yaml", encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)

    with open(stats_path, encoding="utf-8") as f:
        stats_dict = json.load(f)

    sf = xr.open_zarr(str(surface_path))
    splits = make_date_range_split(
        sf.time.values,
        data_cfg["splits"]["train_range"],
        data_cfg["splits"]["val_range"],
        data_cfg["splits"]["test_range"],
    )
    
    ds = OceanEmbedDataset(surface_path, target_path, stats_path, indices=splits["test"], mode="eval")
    loader = DataLoader(ds, batch_size=4, shuffle=False, num_workers=0)
    depths = np.asarray(SIH_DEPTHS, dtype=float)
    n_depths = len(depths)

    band_defs = {
        "Mixed Layer (0-50m)": [0, 1, 2, 3, 4, 5],
        "Thermocline (50-200m)": [6, 7, 8, 9, 10],
        "Deep (200-1000m)": [11, 12, 13, 14],
    }

    print("\n" + "="*80)
    print("1. EVALUATING GLORYS 2022 TEST SET")
    print("="*80)
    v2_ckpt = ROOT / "runs/_final_v2/model_v2.pt"
    p8_ckpt = ROOT / "runs/phase8_thermocline_weighted/checkpoint_best.pt"

    print("Evaluating v2 checkpoint...")
    v2_glorys = run_glorys_eval(v2_ckpt, device, loader, n_depths, depths, band_defs)
    print("Evaluating Phase 8 (Option A) checkpoint...")
    p8_glorys = run_glorys_eval(p8_ckpt, device, loader, n_depths, depths, band_defs)

    print("\n--- GLORYS 2022 TEST SET: PER-DEPTH COMPARISON ---")
    print(f"{'Depth (m)':<10} | {'v2 RMSE':<10} {'v2 Bias':<10} | {'P8 RMSE':<10} {'P8 Bias':<10} | {'d_RMSE':<12} {'d_Bias':<10}")
    print("-" * 75)
    for i in range(n_depths):
        d_val = depths[i]
        v2_d = v2_glorys["depths"][i]
        p8_d = p8_glorys["depths"][i]
        d_rmse = p8_d["rmse"] - v2_d["rmse"]
        d_bias = p8_d["bias"] - v2_d["bias"]
        pct = (d_rmse / v2_d["rmse"]) * 100
        print(f"{d_val:<10.2f} | {v2_d['rmse']:>8.4f}C {v2_d['bias']:>8.4f}C | {p8_d['rmse']:>8.4f}C {p8_d['bias']:>8.4f}C | {d_rmse:>+8.4f}C ({pct:>+5.1f}%) | {d_bias:>+8.4f}C")

    print("\n--- GLORYS 2022 TEST SET: BAND COMPARISON ---")
    for bname in band_defs:
        v2_b = v2_glorys["bands"][bname]
        p8_b = p8_glorys["bands"][bname]
        d_rmse = p8_b["rmse"] - v2_b["rmse"]
        pct = (d_rmse / v2_b["rmse"]) * 100
        print(f"{bname:<25}: v2={v2_b['rmse']:.4f}C (bias={v2_b['bias']:+.4f}) -> P8={p8_b['rmse']:.4f}C (bias={p8_b['bias']:+.4f}) | diff={d_rmse:+.4f}C ({pct:+.1f}%)")

    d_ov = p8_glorys["overall"]["rmse"] - v2_glorys["overall"]["rmse"]
    print(f"{'Overall':<25}: v2={v2_glorys['overall']['rmse']:.4f}C (bias={v2_glorys['overall']['bias']:+.4f}) -> P8={p8_glorys['overall']['rmse']:.4f}C (bias={p8_glorys['overall']['bias']:+.4f}) | diff={d_ov:+.4f}C")

    # Run ARGO validation
    print("\n" + "="*80)
    print("2. EVALUATING ARGO IN-SITU VALIDATION")
    print("="*80)
    argo_path = ROOT / "data/argo/argo_nio_all.json"
    with open(argo_path, encoding="utf-8") as f:
        profiles = json.load(f)

    print("Evaluating ARGO profiles for v2...")
    v2_argo = run_argo_eval(v2_ckpt, profiles)
    print("Evaluating ARGO profiles for Phase 8...")
    p8_argo = run_argo_eval(p8_ckpt, profiles)

    print("\n--- ARGO VALIDATION: PER-DEPTH COMPARISON (ALL PROFILES) ---")
    print(f"{'Depth (m)':<10} | {'v2 RMSE':<10} {'v2 Bias':<10} | {'P8 RMSE':<10} {'P8 Bias':<10} | {'d_RMSE':<12} {'d_Bias':<10}")
    print("-" * 75)
    for i in range(15):
        v2_d = v2_argo["all"]["per_depth"][i]
        p8_d = p8_argo["all"]["per_depth"][i]
        d_val = v2_d["depth"]
        d_rmse = p8_d["rmse"] - v2_d["rmse"]
        d_bias = p8_d["bias"] - v2_d["bias"]
        pct = (d_rmse / v2_d["rmse"]) * 100 if v2_d["rmse"] > 0 else 0
        print(f"{d_val:<10.2f} | {v2_d['rmse']:>8.4f}C {v2_d['bias']:>8.4f}C | {p8_d['rmse']:>8.4f}C {p8_d['bias']:>8.4f}C | {d_rmse:>+8.4f}C ({pct:>+5.1f}%) | {d_bias:>+8.4f}C")

    print("\n--- ARGO VALIDATION: BAND BREAKDOWNS ---")
    for subset_name, title in [
        ("all", "All NIO Profiles"),
        ("2022", "2022 Test Year Profiles"),
        ("arabian_sea", "Arabian Sea"),
        ("bay_of_bengal", "Bay of Bengal"),
        ("monsoon", "Monsoon (Jun-Sep)"),
        ("non_monsoon", "Non-Monsoon (Oct-May)"),
    ]:
        v2_sub = v2_argo[subset_name]
        p8_sub = p8_argo[subset_name]
        if not v2_sub or not p8_sub:
            continue
        print(f"\n[{title}] (N={v2_sub['n']})")
        for b in ["mixed_layer", "thermocline", "deep"]:
            v2_b = v2_sub["bands"][b]
            p8_b = p8_sub["bands"][b]
            d_rmse = p8_b["rmse"] - v2_b["rmse"]
            pct = (d_rmse / v2_b["rmse"]) * 100 if v2_b["rmse"] > 0 else 0
            print(f"  {b:<15}: v2={v2_b['rmse']:.4f}C (bias={v2_b['bias']:+.4f}) -> P8={p8_b['rmse']:.4f}C (bias={p8_b['bias']:+.4f}) | diff={d_rmse:+.4f}C ({pct:+.1f}%)")
        d_all = p8_sub["overall"]["rmse"] - v2_sub["overall"]["rmse"]
        print(f"  {'overall':<15}: v2={v2_sub['overall']['rmse']:.4f}C (bias={v2_sub['overall']['bias']:+.4f}) -> P8={p8_sub['overall']['rmse']:.4f}C (bias={p8_sub['overall']['bias']:+.4f}) | diff={d_all:+.4f}C")

    sf.close()

    results_json = {
        "glorys": {"v2": v2_glorys, "phase8": p8_glorys},
        "argo": {"v2": v2_argo, "phase8": p8_argo}
    }
    with open(ROOT / "runs/phase8_thermocline_weighted/eval_results.json", "w", encoding="utf-8") as f:
        json.dump(results_json, f, indent=2)
    print("\nSaved full evaluation results to runs/phase8_thermocline_weighted/eval_results.json")

if __name__ == "__main__":
    main()
