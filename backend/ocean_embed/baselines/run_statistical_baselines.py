"""Fit/evaluate train-only climatology and global-mean baselines on 2022."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import xarray as xr
import yaml

_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from ocean_embed.data.splits import make_date_range_split
from ocean_embed.grid import SIH_DEPTHS


class RunningMetrics:
    def __init__(self) -> None:
        self.n = 0
        self.sse = self.sae = self.se = 0.0
        self.sp = self.st = self.sp2 = self.st2 = self.spt = 0.0

    def update(self, pred: np.ndarray, target: np.ndarray) -> None:
        p, t = pred.ravel().astype(np.float64), target.ravel().astype(np.float64)
        ok = np.isfinite(p) & np.isfinite(t)
        p, t = p[ok], t[ok]
        e = p - t
        self.n += len(p)
        self.sse += float(np.dot(e, e)); self.sae += float(np.abs(e).sum()); self.se += float(e.sum())
        self.sp += float(p.sum()); self.st += float(t.sum())
        self.sp2 += float(np.dot(p, p)); self.st2 += float(np.dot(t, t)); self.spt += float(np.dot(p, t))

    def result(self) -> dict[str, float]:
        n = max(self.n, 1); mp, mt = self.sp / n, self.st / n
        vp, vt = self.sp2 - n * mp**2, self.st2 - n * mt**2
        cov = self.spt - n * mp * mt
        return {
            "rmse": float(np.sqrt(self.sse / n)), "mae": float(self.sae / n), "bias": float(self.se / n),
            "pearson_r": float(cov / np.sqrt(vp * vt)) if vp > 0 and vt > 0 else float("nan"),
            "r2": float(1.0 - self.sse / vt) if vt > 0 else float("nan"),
        }


def climatology_slot(time: np.datetime64) -> int:
    """Map calendar month/day to a 365-day climatology; Feb 29 joins Feb 28."""
    stamp = pd.Timestamp(time)
    month, day = stamp.month, min(stamp.day, 28) if stamp.month == 2 else stamp.day
    return pd.Timestamp(year=2001, month=month, day=day).dayofyear - 1


def fit(target: xr.DataArray, train_idx: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    d, h, w = target.shape[1:]
    sums = np.zeros((365, d, h, w), dtype=np.float32)
    counts = np.zeros((365, d, h, w), dtype=np.uint16)
    global_sum = np.zeros(d, dtype=np.float64)
    global_count = np.zeros(d, dtype=np.int64)
    for idx in train_idx:
        arr = target.isel(time=int(idx)).values.astype(np.float32)
        valid = np.isfinite(arr)
        slot = climatology_slot(target.time.values[int(idx)])
        sums[slot] += np.where(valid, arr, 0.0)
        counts[slot] += valid
        global_sum += np.where(valid, arr, 0.0).sum(axis=(1, 2), dtype=np.float64)
        global_count += valid.sum(axis=(1, 2))
    clim = np.divide(sums, counts, out=np.full_like(sums, np.nan), where=counts > 0)
    return clim, (global_sum / global_count).astype(np.float32)


def evaluate(target: xr.DataArray, test_idx: np.ndarray, predictor: Any) -> dict[str, Any]:
    overall, per_depth = RunningMetrics(), [RunningMetrics() for _ in SIH_DEPTHS]
    bands = {"ML_0-50m": (0, 50), "thermocline_50-200m": (50, 200), "deep_200-1000m": (200, 1000)}
    per_band = {key: RunningMetrics() for key in bands}
    depths = np.asarray(SIH_DEPTHS)
    for idx in test_idx:
        truth = target.isel(time=int(idx)).values.astype(np.float32)
        pred = predictor(int(idx), truth.shape)
        overall.update(pred, truth)
        for d in range(len(SIH_DEPTHS)):
            per_depth[d].update(pred[d], truth[d])
        for name, (lo, hi) in bands.items():
            ids = np.where((depths >= lo) & (depths <= hi))[0]
            per_band[name].update(pred[ids], truth[ids])
    return {
        "n_test_samples": int(len(test_idx)), "overall": overall.result(),
        "depth_bands": {name: metric.result() for name, metric in per_band.items()},
        "per_depth_rmse": {str(z): per_depth[i].result()["rmse"] for i, z in enumerate(SIH_DEPTHS)},
    }


def save(name: str, metrics: dict[str, Any], output_dir: Path) -> None:
    with open(output_dir / f"{name}_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(SIH_DEPTHS, list(metrics["per_depth_rmse"].values()), marker="o")
    ax.set(xlabel="Depth (m)", ylabel="Test RMSE (°C)", title=f"{name} — Test RMSE vs depth")
    ax.grid(alpha=0.3)
    fig.savefig(output_dir / f"{name}_rmse_vs_depth.png", dpi=140, bbox_inches="tight")
    plt.close(fig)


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    output_dir = root / "runs" / "_baselines"; output_dir.mkdir(parents=True, exist_ok=True)
    with open(root / "backend/ocean_embed/configs/data_config.yaml", encoding="utf-8") as f:
        split_cfg = yaml.safe_load(f)["splits"]
    ds = xr.open_zarr(root / "data/processed/target_glorys.zarr")
    splits = make_date_range_split(ds.time.values, split_cfg["train_range"], split_cfg["val_range"], split_cfg["test_range"])
    target = ds["thetao"]
    clim, global_depth_mean = fit(target, splits["train"])
    np.savez_compressed(output_dir / "climatology_mean.npz", climatology=clim, depths=ds.depth.values, global_depth_mean=global_depth_mean)
    climatology = evaluate(target, splits["test"], lambda idx, _: clim[climatology_slot(ds.time.values[idx])])
    global_mean = evaluate(target, splits["test"], lambda _idx, shape: np.broadcast_to(global_depth_mean[:, None, None], shape))
    save("climatology", climatology, output_dir); save("global_mean", global_mean, output_dir)
    print(json.dumps({"climatology": climatology, "global_mean": global_mean}, indent=2))
    ds.close()


if __name__ == "__main__":
    main()
