"""
spotcheck_issue22.py  —  Manual single-profile verification of Issue #22 fix.

For channels 11 (318.13 m), 12 (541.09 m), 13 (643.57 m):
  - Gets model T via ModelService.predict_full_3d
  - Interpolates ARGO profile to corrected depths via np.interp
  - Reports residuals (model − argo)

Pass criterion: |residual| <= 0.5°C for all three channels.
"""

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.api.services.model_service import ModelService
from backend.api.services.argo_service import MODEL_DEPTHS

SPOT_CHANNELS = {11: 318.1274, 12: 541.0889, 13: 643.5704}


def main():
    print("=" * 72)
    print("SPOT-CHECK — Issue #22 fix single-profile verification")
    print("=" * 72)

    # Confirm the depths in the live argo_service are the fixed values
    print(f"\nLive MODEL_DEPTHS (from argo_service.py):")
    for i, d in enumerate(MODEL_DEPTHS):
        tag = f"  <-- VERIFY ch {i}" if i in SPOT_CHANNELS else ""
        print(f"  ch {i:>2}: {d:>10.4f} m{tag}")

    # ── Load profiles, pick first with >700 m coverage ──────────────────────
    argo_path = ROOT / "data/argo/argo_nio_all.json"
    profiles = json.load(open(argo_path, encoding="utf-8"))
    print(f"\nTotal ARGO profiles loaded: {len(profiles)}")

    target = None
    for p in profiles:
        if max(p["depths"]) >= 700.0 and min(p["depths"]) <= 10.0:
            target = p
            break

    if target is None:
        # Fallback: pick profile with deepest max depth
        target = max(profiles, key=lambda p: max(p["depths"]))
        print(f"  (No profile to 700 m; using deepest: {max(target['depths']):.1f} m)")

    print(f"\nSelected ARGO profile:")
    print(f"  date        : {target['date']}")
    print(f"  lat / lon   : {target['lat']:.4f} / {target['lon']:.4f}")
    print(f"  n levels    : {len(target['depths'])}")
    print(f"  depth range : {min(target['depths']):.1f} – {max(target['depths']):.1f} m")

    p_depths = np.array(target["depths"], dtype=float)
    p_temps  = np.array(target["temperature"], dtype=float)

    # ── Model inference ──────────────────────────────────────────────────────
    print(f"\nRunning ModelService.predict_full_3d({target['date']!r}) ...", flush=True)
    ms = ModelService.get_instance()
    temp_3d, _, _, _ = ms.predict_full_3d(target["date"])
    lat_i, lon_i, _, _ = ms.find_nearest_lat_lon(target["lat"], target["lon"])
    model_col = temp_3d[:, lat_i, lon_i]  # shape (15,)
    print(f"  Grid cell: lat_i={lat_i}, lon_i={lon_i}")

    # ── Per-channel spot-check ───────────────────────────────────────────────
    print()
    print("-" * 72)
    hdr = f"{'Ch':>3}  {'Depth (m)':>10}  {'Model T':>12}  {'ARGO T':>12}  {'Residual':>10}  Pass?"
    print(hdr)
    print("-" * 72)

    results = {}
    all_pass = True
    for ch, depth in sorted(SPOT_CHANNELS.items()):
        model_t = float(model_col[ch])
        if depth < p_depths.min() or depth > p_depths.max():
            argo_t   = float("nan")
            residual = float("nan")
            verdict  = "OUT-OF-RANGE"
        else:
            argo_t   = float(np.interp(depth, p_depths, p_temps))
            residual = model_t - argo_t
            verdict  = "PASS [OK]" if abs(residual) <= 0.5 else "FAIL [!!]"
            if abs(residual) > 0.5:
                all_pass = False

        results[ch] = dict(depth=depth, model_t=model_t, argo_t=argo_t,
                           residual=residual, verdict=verdict)
        print(f"{ch:>3}  {depth:>10.4f}  {model_t:>12.4f}  {argo_t:>12.4f}  {residual:>+10.4f}  {verdict}")

    print("-" * 72)
    print(f"\n>>> All channels within ±0.5°C: {'YES ✓' if all_pass else 'NO ✗'}")

    # ── Aggregate stats from last run ────────────────────────────────────────
    print()
    print("=" * 72)
    print("AGGREGATE STATS — last full ARGO validation run")
    print("=" * 72)

    # seasonal_stats.json
    ss_path = ROOT / "runs/_final_v2/seasonal_stats.json"
    if ss_path.exists():
        ss = json.load(open(ss_path))
        seasons = ss.get("seasons", [])
        total_n = sum(s.get("n_profiles", 0) for s in seasons)
        if total_n > 0:
            wtd_rmse = sum(s["rmse"] * s["n_profiles"] for s in seasons) / total_n
            wtd_bias = sum(s["bias"] * s["n_profiles"] for s in seasons) / total_n
            print(f"\n  N profiles (from seasonal_stats) : {total_n}")
            print(f"  N-weighted overall RMSE          : {wtd_rmse:.4f} °C")
            print(f"  N-weighted overall bias          : {wtd_bias:+.4f} °C")
        else:
            print("  seasonal_stats.json has no seasons with n_profiles.")
            print("  raw keys:", list(ss.keys()))
    else:
        print("  runs/_final_v2/seasonal_stats.json not found — skipping aggregate.")

    # monsoon_stats.json per-depth for ch 11/12/13
    ms_path = ROOT / "runs/_final_v2/monsoon_stats.json"
    if ms_path.exists():
        ms_data = json.load(open(ms_path))
        regimes = ms_data.get("regimes", [])
        # Accumulate N-weighted RMSE+bias per depth across regimes
        depth_rmse_acc = {}
        depth_bias_acc = {}
        depth_n_acc    = {}
        for reg in regimes:
            rn = reg.get("n_profiles", 0)
            for entry in reg.get("rmse_by_depth", []):
                d = round(entry["depth"], 2)
                depth_rmse_acc[d] = depth_rmse_acc.get(d, 0.0) + entry["rmse"] * rn
                depth_n_acc[d]    = depth_n_acc.get(d, 0) + rn
            for entry in reg.get("bias_by_depth", []):
                d = round(entry["depth"], 2)
                depth_bias_acc[d] = depth_bias_acc.get(d, 0.0) + entry["bias"] * rn

        print(f"\n  Per-depth RMSE / bias for bug-fix channels (monsoon+non-monsoon N-weighted):")
        print(f"  {'Depth (m)':>10}  {'Ch':>4}  {'RMSE (°C)':>10}  {'Bias (°C)':>10}")
        print("  " + "-" * 44)
        for ch_num, depth in sorted(SPOT_CHANNELS.items(), key=lambda x: x[1]):
            # Match closest stored depth key
            if depth_n_acc:
                best_d = min(depth_n_acc.keys(), key=lambda x: abs(x - depth))
                n    = depth_n_acc.get(best_d, 0)
                rmse = depth_rmse_acc.get(best_d, float("nan")) / n if n > 0 else float("nan")
                bias = depth_bias_acc.get(best_d, float("nan")) / n if (n > 0 and best_d in depth_bias_acc) else float("nan")
                print(f"  {best_d:>10.2f}  {ch_num:>4}  {rmse:>10.4f}  {bias:>+10.4f}")
            else:
                print(f"  {depth:>10.2f}  {ch_num:>4}  (no per-depth data)")

    # Save results to JSON
    out = {
        "profile": {
            "date": target["date"],
            "lat": target["lat"],
            "lon": target["lon"],
            "n_levels": len(target["depths"]),
            "depth_range_m": [float(p_depths.min()), float(p_depths.max())],
        },
        "spot_check": {
            str(ch): {
                "depth_m": v["depth"],
                "model_t_C": v["model_t"],
                "argo_t_C": v["argo_t"],
                "residual_C": v["residual"],
                "pass": "PASS" in v["verdict"],
            }
            for ch, v in results.items()
        },
        "all_pass": all_pass,
    }
    out_path = ROOT / "runs/issue22_spotcheck.json"
    json.dump(out, open(out_path, "w", encoding="utf-8"), indent=2)
    print(f"\nSpot-check JSON saved to: {out_path}")
    print("\nVERIFICATION COMPLETE.")


if __name__ == "__main__":
    main()
