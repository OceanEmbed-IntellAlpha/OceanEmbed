"""
diagnose_issue22_deep_bias.py — Fast, High-Performance Diagnostic for Issue #22.

Investigates the deep-layer bias (-1.93 to -2.74 C at 233-365m vs ARGO):
- H1: ARGO collocation depth mismatch (Hardcoded 15 depths vs Actual GLORYS target 15 depths)
- H2: Direct GLORYS target vs ARGO in-situ bias (Independent of model)
- H3: Model capacity on Training split (2010-2020) vs Test split (2022)
"""

import json
import math
import random
import sys
import time
from collections import defaultdict
from pathlib import Path

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

from ocean_embed.models.baseline import BaselineModel
from ocean_embed.data.zarr_dataset import OceanEmbedDataset
from ocean_embed.data.splits import make_date_range_split
from backend.api.services.model_service import ModelService
from backend.api.services.argo_service import MODEL_DEPTHS as HARDCODED_ARGO_DEPTHS, _interp_to_model_depths

ACTUAL_TARGET_DEPTHS = [
    0.494025, 5.078224, 9.572997, 18.49556, 29.44473,
    47.37369, 77.85385, 92.32607, 130.6663, 155.8507,
    186.1256, 318.1274, 541.0889, 643.5704, 902.3393
]

def run_diagnostic():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}", flush=True)

    # 1. Load ARGO profiles
    argo_path = ROOT / "data/argo/argo_nio_all.json"
    with open(argo_path, encoding="utf-8") as f:
        profiles = json.load(f)
    print(f"Loaded {len(profiles)} ARGO profiles.", flush=True)

    ms = ModelService.get_instance()

    # =========================================================================
    # H1: Collocation test (20 samples + full dataset)
    # =========================================================================
    print("\n" + "=" * 80, flush=True)
    print("1. TESTING H1: ARGO COLLOCATION & DEPTH GRID MISMATCH", flush=True)
    print("=" * 80, flush=True)
    print(f"Hardcoded argo_service.py MODEL_DEPTHS : {[round(float(d), 2) for d in HARDCODED_ARGO_DEPTHS]}", flush=True)
    print(f"Actual model target_glorys.zarr DEPTHS : {[round(float(d), 2) for d in ACTUAL_TARGET_DEPTHS]}", flush=True)

    # Pre-group profiles by date
    by_date = defaultdict(list)
    for p in profiles:
        by_date[p["date"]].append(p)

    curr_diffs = [[] for _ in range(15)]
    fixed_diffs = [[] for _ in range(15)]
    glorys_diffs = [[] for _ in range(15)]

    # Open target_glorys for H2 directly
    target_path = ROOT / "data/processed/target_glorys.zarr"
    surface_path = ROOT / "data/processed/surface_features.zarr"
    sf = xr.open_zarr(str(surface_path))
    ds_target = xr.open_zarr(str(target_path))

    times = [str(t)[:10] for t in sf.time.values]
    time_to_idx = {t: i for i, t in enumerate(times)}

    t0 = time.time()
    n_collocated = 0

    print("Running joint Model & GLORYS collocation on ARGO profiles...", flush=True)
    for idx, (date_str, p_list) in enumerate(by_date.items()):
        if date_str not in time_to_idx:
            continue
        t_idx = time_to_idx[date_str]

        try:
            temp_3d, _, _, _ = ms.predict_full_3d(date_str)
        except Exception:
            continue

        # Get GLORYS ground truth 3D map for this day
        # Slice [t_idx] first so we don't load the entire 15GB zarr!
        if "thetao" in ds_target:
            glorys_3d = ds_target["thetao"][t_idx].values
        else:
            anom = ds_target["temperature_anomaly"][t_idx].values
            clim = ds_target["temperature_clim"][t_idx % 365].values
            glorys_3d = anom + clim

        for p in p_list:
            plat, plon = p["lat"], p["lon"]
            lat_i, lon_i, _, _ = ms.find_nearest_lat_lon(plat, plon)
            m_15 = temp_3d[:, lat_i, lon_i]
            g_15 = glorys_3d[:, lat_i, lon_i]

            p_depths = np.array(p["depths"], dtype=float)
            p_temps = np.array(p["temperature"], dtype=float)

            # A. Current pipeline: hardcoded depths
            a_curr = np.array(_interp_to_model_depths(p["depths"], p["temperature"], HARDCODED_ARGO_DEPTHS))

            # B. Corrected pipeline: actual target depths
            a_fix = np.interp(ACTUAL_TARGET_DEPTHS, p_depths, p_temps, left=np.nan, right=np.nan)
            valid_range = (ACTUAL_TARGET_DEPTHS >= p_depths.min()) & (ACTUAL_TARGET_DEPTHS <= p_depths.max())
            a_fix[~valid_range] = np.nan

            for c in range(15):
                if np.isfinite(m_15[c]) and np.isfinite(a_curr[c]):
                    curr_diffs[c].append(m_15[c] - a_curr[c])
                if np.isfinite(m_15[c]) and np.isfinite(a_fix[c]):
                    fixed_diffs[c].append(m_15[c] - a_fix[c])
                if np.isfinite(g_15[c]) and np.isfinite(a_fix[c]):
                    glorys_diffs[c].append(g_15[c] - a_fix[c])

            n_collocated += 1

        if (idx + 1) % 500 == 0:
            print(f"  Processed {idx + 1}/{len(by_date)} dates ({n_collocated} profiles)...", flush=True)

    sf.close()
    ds_target.close()
    print(f"Completed ARGO collocation in {time.time() - t0:.1f}s", flush=True)

    # =========================================================================
    # H3: Model capacity on Training (2010–2020) and Test (2022) splits
    # =========================================================================
    print("\n" + "=" * 80, flush=True)
    print("3. TESTING H3: MODEL FIT ON TRAINING SPLIT VS TEST SPLIT", flush=True)
    print("=" * 80, flush=True)

    ckpt_path = ROOT / "runs/_final_v2/model_v2.pt"
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    state = ckpt.get("model_state_dict", ckpt)
    model = BaselineModel(in_channels=7, out_depths=15)
    model.load_state_dict(state)
    model.to(device).eval()

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

    def eval_model_split(indices, split_name, max_samples=100):
        ds = OceanEmbedDataset(surface_path, target_path, stats_path, indices=indices, mode="eval")
        if max_samples and len(ds) > max_samples:
            sub_idx = list(range(0, len(ds), len(ds) // max_samples))[:max_samples]
            ds = torch.utils.data.Subset(ds, sub_idx)
        loader = DataLoader(ds, batch_size=8, shuffle=False, num_workers=0)
        
        stats = [{"sum_err": 0.0, "sum_sq": 0.0, "n": 0} for _ in range(15)]
        with torch.no_grad():
            for batch in loader:
                x = batch["input"].to(device)
                target = batch["target_absolute"].numpy()
                clim = batch["clim"].numpy()
                mask = batch["target_mask"].numpy() > 0.5

                pred_anom = model(x).cpu().numpy()
                pred_temp = pred_anom + clim

                for c in range(15):
                    p_c = pred_temp[:, c][mask[:, c]]
                    t_c = target[:, c][mask[:, c]]
                    val = np.isfinite(p_c) & np.isfinite(t_c)
                    err = (p_c[val] - t_c[val]).astype(np.float64)
                    stats[c]["n"] += err.size
                    stats[c]["sum_err"] += float(np.sum(err))
                    stats[c]["sum_sq"] += float(np.dot(err, err))

        res = []
        for c in range(15):
            n = max(stats[c]["n"], 1)
            bias = stats[c]["sum_err"] / n
            rmse = np.sqrt(stats[c]["sum_sq"] / n)
            res.append({"bias": bias, "rmse": rmse})
        return res

    print("Evaluating v2 vs GLORYS on Training split (sampled 100 days across 2010-2020)...", flush=True)
    train_res = eval_model_split(splits["train"], "train", max_samples=100)
    print("Evaluating v2 vs GLORYS on Test split (2022 full 365 days)...", flush=True)
    test_res = eval_model_split(splits["test"], "test", max_samples=None)

    # =========================================================================
    # CONSOLIDATED RESULTS
    # =========================================================================
    print("\n" + "=" * 115, flush=True)
    print("FINAL CONSOLIDATED SUMMARY TABLE (ISSUE #22 DIAGNOSTIC)", flush=True)
    print("=" * 115, flush=True)
    print(f"{'Ch':<3} | {'Actual Depth':<12} | {'v2-vs-GLORYS (train)':<20} | {'v2-vs-GLORYS (test)':<19} | {'GLORYS-vs-ARGO':<18} | {'v2-vs-ARGO (manual)':<20} | {'v2-vs-ARGO (current)':<20}", flush=True)
    print("-" * 120, flush=True)

    rows = []
    for c in range(15):
        ac_d = ACTUAL_TARGET_DEPTHS[c]
        hc_d = HARDCODED_ARGO_DEPTHS[c]
        v2_tr_b = train_res[c]["bias"]
        v2_te_b = test_res[c]["bias"]
        g_argo_b = float(np.mean(glorys_diffs[c])) if len(glorys_diffs[c]) > 0 else 0.0
        v2_argo_fix_b = float(np.mean(fixed_diffs[c])) if len(fixed_diffs[c]) > 0 else 0.0
        v2_argo_curr_b = float(np.mean(curr_diffs[c])) if len(curr_diffs[c]) > 0 else 0.0

        v2_argo_fix_rmse = float(np.sqrt(np.mean(np.array(fixed_diffs[c])**2))) if len(fixed_diffs[c]) > 0 else 0.0
        v2_argo_curr_rmse = float(np.sqrt(np.mean(np.array(curr_diffs[c])**2))) if len(curr_diffs[c]) > 0 else 0.0

        print(f"{c:<3} | {ac_d:<12.2f} | {v2_tr_b:>+18.4f} C | {v2_te_b:>+17.4f} C | {g_argo_b:>+16.4f} C | {v2_argo_fix_b:>+18.4f} C | {v2_argo_curr_b:>+18.4f} C", flush=True)

        rows.append({
            "channel": c,
            "actual_depth_m": ac_d,
            "hardcoded_depth_m": hc_d,
            "v2_vs_glorys_train_bias": v2_tr_b,
            "v2_vs_glorys_test_bias": v2_te_b,
            "glorys_vs_argo_bias": g_argo_b,
            "v2_vs_argo_manual_fixed_bias": v2_argo_fix_b,
            "v2_vs_argo_current_bias": v2_argo_curr_b,
            "v2_vs_argo_manual_fixed_rmse": v2_argo_fix_rmse,
            "v2_vs_argo_current_rmse": v2_argo_curr_rmse,
        })

    with open(ROOT / "runs/issue22_deep_bias_diagnostic.json", "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)
    print("\nResults saved to runs/issue22_deep_bias_diagnostic.json", flush=True)

if __name__ == "__main__":
    run_diagnostic()
