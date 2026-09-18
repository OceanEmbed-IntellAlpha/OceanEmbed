"""
OceanEmbed — Climatological baseline.

The climatology predicts the training-set mean temperature at each
(lat, lon, depth, day-of-year) cell.  It is the floor every trained
model must beat.

SCIENTIFIC NOTE: With only 5 days of data (smoke-test), the climatology
is nearly perfect (DOY is nearly constant, so it essentially predicts
the per-cell training mean).  This is expected.  The harness is designed
to work unchanged when the dataset grows to multi-year coverage.

GLORYS12V1 is a REANALYSIS, not independent ground truth.

Public API:
    fit_climatology(target_zarr_path, train_indices, save_path)
    evaluate_climatology(climatology_path, target_zarr_path, eval_indices)
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Union

import numpy as np

logger = logging.getLogger(__name__)

# Depth band definitions (metres) — indices into the 15-level canonical list
DEPTH_BANDS = {
    "mixed_layer_0_50m":    (0.0,   50.0),
    "thermocline_50_200m":  (50.0,  200.0),
    "deep_200_1000m":       (200.0, 1000.0),
}


# ── Public API ────────────────────────────────────────────────────────────────

def fit_climatology(
    target_zarr_path: Union[str, Path],
    train_indices:    np.ndarray,
    save_path:        Union[str, Path],
) -> np.ndarray:
    """Compute training-set mean temperature per (lat, lon, depth, doy) cell.

    With many years of training data, separate means are kept for each
    day-of-year so the baseline captures the seasonal cycle.  With a
    short smoke-test dataset (e.g., 5 consecutive days) the DOY dimension
    collapses gracefully to the overall training mean — this is expected.

    Args:
        target_zarr_path: Path to target_glorys.zarr.
        train_indices:    Integer time indices to use (train split only).
        save_path:        Where to write climatology.npz.

    Returns:
        clim array shape (365, D, H, W) — NaN where no training samples exist.
    """
    import xarray as xr

    train_indices = np.asarray(train_indices, dtype=int)
    logger.info(
        f"Fitting climatology on {len(train_indices)} training samples."
    )

    tg = xr.open_zarr(str(target_zarr_path))
    times = tg.time.values  # numpy datetime64
    depths = tg.depth.values
    D = len(depths)
    H = tg.sizes["latitude"]
    W = tg.sizes["longitude"]

    # Pre-allocate accumulators: (365, D, H, W)
    clim_sum   = np.zeros((365, D, H, W), dtype=np.float64)
    clim_count = np.zeros((365, D, H, W), dtype=np.int32)

    for t in train_indices:
        doy = int(
            (np.datetime64(times[t], "D") - np.datetime64(f"{_year(times[t])}-01-01", "D"))
            .astype(int)
        )   # 0-indexed, 0 = Jan 1
        doy = min(doy, 364)   # clip leap-day to slot 364

        arr = tg["thetao"].isel(time=int(t)).values  # (D, H, W)
        valid = np.isfinite(arr)
        clim_sum[doy]   += np.where(valid, arr, 0.0)
        clim_count[doy] += valid.astype(np.int32)

    tg.close()

    # Mean; cells with no samples → NaN
    with np.errstate(invalid="ignore"):
        clim = np.where(clim_count > 0, clim_sum / clim_count, np.nan)
    clim = clim.astype(np.float32)

    # Persist
    save_path = Path(save_path)
    save_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        save_path,
        climatology=clim,
        depths=depths.astype(np.float32),
        n_train=len(train_indices),
    )
    logger.info(f"Climatology saved to {save_path}")
    return clim


def evaluate_climatology(
    climatology_path:  Union[str, Path],
    target_zarr_path:  Union[str, Path],
    eval_indices:      np.ndarray,
    results_dir:       Optional[Union[str, Path]] = None,
) -> Dict:
    """Evaluate the climatology baseline on eval_indices (val or test split).

    Computes per-depth RMSE, MAE, bias, Pearson r, R², aggregated into
    three depth bands (ML / thermocline / deep).

    Args:
        climatology_path: Path to climatology.npz produced by fit_climatology.
        target_zarr_path: Path to target_glorys.zarr.
        eval_indices:     Integer time indices to evaluate on.
        results_dir:      Directory to save metrics.json and rmse_vs_depth.png.
                          Defaults to runs/baseline_climatology/.

    Returns:
        Nested metrics dict.
    """
    import xarray as xr
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    eval_indices = np.asarray(eval_indices, dtype=int)
    logger.info(
        f"Evaluating climatology on {len(eval_indices)} samples."
    )

    if len(eval_indices) == 0:
        logger.warning(
            "Evaluation index set is empty.  "
            "Returning placeholder metrics (all NaN).  "
            "This is expected for a 5-day smoke-test dataset where "
            "all samples land in the training split."
        )
        metrics = _empty_metrics()
        _save_results(metrics, results_dir, depths=None)
        return metrics

    # Load climatology
    clim_data = np.load(climatology_path)
    clim   = clim_data["climatology"]   # (365, D, H, W)
    depths = clim_data["depths"]        # (D,)
    D = len(depths)

    tg = xr.open_zarr(str(target_zarr_path))
    times = tg.time.values

    # Collect predictions and observations
    all_pred  = []   # list of (D, H, W)
    all_truth = []

    for t in eval_indices:
        doy = int(
            (np.datetime64(times[t], "D") - np.datetime64(f"{_year(times[t])}-01-01", "D"))
            .astype(int)
        )
        doy = min(doy, 364)
        pred  = clim[doy]                                    # (D, H, W)
        truth = tg["thetao"].isel(time=int(t)).values.astype(np.float32)
        all_pred.append(pred)
        all_truth.append(truth)

    tg.close()

    pred_arr  = np.stack(all_pred,  axis=0)   # (N, D, H, W)
    truth_arr = np.stack(all_truth, axis=0)

    # ── Per-depth metrics ─────────────────────────────────────────────────────
    per_depth = []
    for d in range(D):
        p = pred_arr[:, d, :, :].ravel()
        t = truth_arr[:, d, :, :].ravel()
        valid = np.isfinite(p) & np.isfinite(t)
        if valid.sum() == 0:
            per_depth.append({
                "depth_m": float(depths[d]),
                "rmse": None, "mae": None, "bias": None, "r": None, "r2": None,
            })
            continue
        p, t = p[valid], t[valid]
        rmse = float(np.sqrt(np.mean((p - t) ** 2)))
        mae  = float(np.mean(np.abs(p - t)))
        bias = float(np.mean(p - t))
        r    = float(np.corrcoef(p, t)[0, 1]) if len(p) > 1 else float("nan")
        ss_res = float(np.sum((p - t) ** 2))
        ss_tot = float(np.sum((t - np.mean(t)) ** 2))
        r2 = 1.0 - ss_res / ss_tot if ss_tot > 0 else float("nan")
        per_depth.append({
            "depth_m": float(depths[d]),
            "rmse": rmse, "mae": mae, "bias": bias, "r": r, "r2": r2,
        })
        logger.info(
            f"  depth={depths[d]:.1f}m: "
            f"RMSE={rmse:.3f}  MAE={mae:.3f}  bias={bias:.3f}  R²={r2:.3f}"
        )

    # ── Depth-band aggregates ─────────────────────────────────────────────────
    band_metrics: Dict[str, Dict] = {}
    for band_name, (z_min, z_max) in DEPTH_BANDS.items():
        band_idx = [
            i for i, dm in enumerate(per_depth)
            if dm["depth_m"] is not None
               and z_min <= dm["depth_m"] <= z_max
        ]
        if not band_idx:
            band_metrics[band_name] = {}
            continue
        band_rmse = [per_depth[i]["rmse"] for i in band_idx
                     if per_depth[i]["rmse"] is not None]
        band_metrics[band_name] = {
            "mean_rmse": float(np.mean(band_rmse)) if band_rmse else None,
            "depth_range_m": [z_min, z_max],
        }
        logger.info(f"  Band '{band_name}': mean RMSE = {band_metrics[band_name]['mean_rmse']}")

    metrics = {
        "n_eval_samples": len(eval_indices),
        "per_depth": per_depth,
        "depth_bands": band_metrics,
        "note": (
            "GLORYS12V1 is a reanalysis, not independent ground truth. "
            "Metrics with 5-day data are nearly degenerate (DOY constant) — plumbing test only."
        ),
    }

    _save_results(metrics, results_dir, depths=depths, per_depth=per_depth)
    return metrics


# ── Internal helpers ──────────────────────────────────────────────────────────

def _year(dt64: np.datetime64) -> int:
    return int(str(dt64)[:4])


def _empty_metrics() -> Dict:
    return {
        "n_eval_samples": 0,
        "per_depth": [],
        "depth_bands": {},
        "note": "Eval set was empty — all 5 samples in training split.",
    }


def _save_results(
    metrics:     Dict,
    results_dir: Optional[Union[str, Path]],
    depths:      Optional[np.ndarray],
    per_depth:   Optional[List] = None,
) -> None:
    """Persist metrics.json and rmse_vs_depth.png."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    if results_dir is None:
        results_dir = Path("runs/baseline_climatology")
    results_dir = Path(results_dir)
    results_dir.mkdir(parents=True, exist_ok=True)

    # metrics.json
    metrics_path = results_dir / "metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    logger.info(f"Climatology metrics saved to {metrics_path}")

    # rmse_vs_depth.png
    if per_depth and depths is not None:
        valid_depths = [d["depth_m"] for d in per_depth if d.get("rmse") is not None]
        valid_rmse   = [d["rmse"]    for d in per_depth if d.get("rmse") is not None]

        fig, ax = plt.subplots(figsize=(5, 7))
        if valid_depths:
            ax.plot(valid_rmse, valid_depths, "o-", color="steelblue", lw=2, ms=5)
            ax.invert_yaxis()
            ax.set_xlabel("RMSE (°C)")
            ax.set_ylabel("Depth (m)")
            ax.set_title("Climatology Baseline — RMSE vs Depth\n(GLORYS12V1 reanalysis; smoke-test only)")
            ax.grid(True, alpha=0.4)
        else:
            ax.text(0.5, 0.5, "No eval samples\n(all in training split)",
                    ha="center", va="center", transform=ax.transAxes)
            ax.set_title("Climatology RMSE vs Depth")

        plot_path = results_dir / "rmse_vs_depth.png"
        fig.savefig(plot_path, dpi=120, bbox_inches="tight")
        plt.close(fig)
        logger.info(f"RMSE vs depth plot saved to {plot_path}")
