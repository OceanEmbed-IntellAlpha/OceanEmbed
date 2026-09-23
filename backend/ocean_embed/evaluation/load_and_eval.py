"""Load frozen OceanEmbed v0 and evaluate it on the 2022 test split."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import xarray as xr
import yaml
from torch.utils.data import DataLoader

_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from ocean_embed.data import OceanEmbedDataset, denormalize_target, load_normalization_stats
from ocean_embed.data.splits import make_date_range_split
from ocean_embed.grid import SIH_DEPTHS
from ocean_embed.training.train import build_model_from_config, load_training_config
from ocean_embed.training.trainer import batch_to_model_inputs


class RunningMetrics:
    """Streaming scalar metrics without retaining the full test cube in RAM."""

    def __init__(self) -> None:
        self.n = 0
        self.sum_err_sq = self.sum_abs_err = self.sum_err = 0.0
        self.sum_pred = self.sum_target = 0.0
        self.sum_pred_sq = self.sum_target_sq = self.sum_pred_target = 0.0

    def update(self, pred: np.ndarray, target: np.ndarray) -> None:
        p = pred.astype(np.float64, copy=False).ravel()
        t = target.astype(np.float64, copy=False).ravel()
        valid = np.isfinite(p) & np.isfinite(t)
        p, t = p[valid], t[valid]
        err = p - t
        self.n += p.size
        self.sum_err_sq += float(np.dot(err, err))
        self.sum_abs_err += float(np.abs(err).sum())
        self.sum_err += float(err.sum())
        self.sum_pred += float(p.sum())
        self.sum_target += float(t.sum())
        self.sum_pred_sq += float(np.dot(p, p))
        self.sum_target_sq += float(np.dot(t, t))
        self.sum_pred_target += float(np.dot(p, t))

    def result(self) -> dict[str, float]:
        n = max(self.n, 1)
        mean_p, mean_t = self.sum_pred / n, self.sum_target / n
        var_p = self.sum_pred_sq - n * mean_p**2
        var_t = self.sum_target_sq - n * mean_t**2
        cov = self.sum_pred_target - n * mean_p * mean_t
        pearson = cov / np.sqrt(var_p * var_t) if var_p > 0 and var_t > 0 else float("nan")
        return {
            "rmse": float(np.sqrt(self.sum_err_sq / n)),
            "mae": float(self.sum_abs_err / n),
            "bias": float(self.sum_err / n),
            "pearson_r": float(pearson),
            "r2": float(1.0 - self.sum_err_sq / var_t) if var_t > 0 else float("nan"),
        }


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    frozen_dir = root / "runs" / "_final_v0"
    checkpoint = frozen_dir / "model_v0.pt"
    current_cfg = load_training_config(root / "backend/ocean_embed/configs/training_config.yaml")
    checkpoint_data = torch.load(checkpoint, map_location="cpu", weights_only=False)
    # Architecture remains identical; checkpoint config identifies the source run.
    model = build_model_from_config(current_cfg)
    model.load_state_dict(checkpoint_data["model_state_dict"])
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device).eval()

    with open(root / "backend/ocean_embed/configs/data_config.yaml", encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)
    surface_path = root / "data/processed/surface_features.zarr"
    target_path = root / "data/processed/target_glorys.zarr"
    stats_path = root / "data/processed/normalization_stats_v3.json"
    sf = xr.open_zarr(surface_path)
    splits = make_date_range_split(
        sf.time.values,
        data_cfg["splits"]["train_range"],
        data_cfg["splits"]["val_range"],
        data_cfg["splits"]["test_range"],
    )
    sf.close()
    ds = OceanEmbedDataset(surface_path, target_path, stats_path, indices=splits["test"], mode="eval")
    loader = DataLoader(ds, batch_size=2, shuffle=False, num_workers=0, pin_memory=device.type == "cuda")
    stats = load_normalization_stats(stats_path)

    overall = RunningMetrics()
    per_depth = [RunningMetrics() for _ in SIH_DEPTHS]
    bands = {"ML_0-50m": (0, 50), "thermocline_50-200m": (50, 200), "deep_200-1000m": (200, 1000)}
    band_metrics = {name: RunningMetrics() for name in bands}
    depths = np.asarray(SIH_DEPTHS, dtype=float)

    with torch.no_grad():
        for batch in loader:
            inputs, masks, lat, lon, doy, target_anom, target_abs, clim, target_mask = batch_to_model_inputs(batch, 1, device)
            output = model(inputs=inputs, masks=masks, lat_norm=lat, lon_norm=lon, doy_norm=doy, depths=SIH_DEPTHS)
            pred_anom_np = output["means"].float().cpu().numpy()
            clim_np = clim.float().cpu().numpy()
            target_abs_np = target_abs.float().cpu().numpy()
            pred_c = clim_np + pred_anom_np
            target_c = target_abs_np
            overall.update(pred_c, target_c)
            for idx in range(len(SIH_DEPTHS)):
                per_depth[idx].update(pred_c[:, idx], target_c[:, idx])
            for name, (lo, hi) in bands.items():
                idx = np.where((depths >= lo) & (depths <= hi))[0]
                band_metrics[name].update(pred_c[:, idx], target_c[:, idx])

    results: dict[str, Any] = {
        "checkpoint": str(checkpoint),
        "checkpoint_epoch": int(checkpoint_data["epoch"]),
        "split": "test (2022)",
        "n_samples": len(ds),
        "overall": overall.result(),
        "depth_bands": {name: metric.result() for name, metric in band_metrics.items()},
        "per_depth_rmse": {str(depth): per_depth[idx].result()["rmse"] for idx, depth in enumerate(SIH_DEPTHS)},
    }
    out_json = frozen_dir / "test_metrics.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(SIH_DEPTHS, list(results["per_depth_rmse"].values()), marker="o")
    ax.set_xlabel("Depth (m)")
    ax.set_ylabel("Test RMSE (°C)")
    ax.set_title("OceanEmbed v0 — Test RMSE vs depth")
    ax.grid(alpha=0.3)
    fig.savefig(frozen_dir / "test_rmse_vs_depth.png", dpi=140, bbox_inches="tight")
    plt.close(fig)
    ds.close()
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
