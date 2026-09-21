"""
Final evaluation report for OceanEmbed phase4_anomaly.

Produces:
  1. Climatology baseline RMSE on the 2022 test split
  2. Model (best checkpoint, epoch 4) RMSE on the 2022 test split
  3. Epoch training table
  4. Per-depth breakdown
  5. JSON report saved to runs/phase4_anomaly/final_report.json
"""

from __future__ import annotations

import csv
import io
import json
import sys

# Force UTF-8 stdout so Unicode chars render correctly on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
elif hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
from pathlib import Path

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

from ocean_embed.data import OceanEmbedDataset, load_normalization_stats
from ocean_embed.data.splits import make_date_range_split
from ocean_embed.grid import SIH_DEPTHS
from ocean_embed.training.train import build_model_from_config, load_training_config
from ocean_embed.training.trainer import batch_to_model_inputs


# ---------------------------------------------------------------------------
# Streaming metrics helper
# ---------------------------------------------------------------------------
class RunningMetrics:
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


# ---------------------------------------------------------------------------
# Evaluation helpers
# ---------------------------------------------------------------------------
def evaluate_checkpoint(model, loader, device) -> dict:
    """Evaluate model: pred_abs = clim + model_anomaly."""
    overall = RunningMetrics()
    per_depth = [RunningMetrics() for _ in SIH_DEPTHS]
    bands = {"ML_0-50m": (0, 50), "thermocline_50-200m": (50, 200), "deep_200-1000m": (200, 1000)}
    band_metrics = {name: RunningMetrics() for name in bands}
    depths_arr = np.asarray(SIH_DEPTHS, dtype=float)

    model.eval()
    with torch.no_grad():
        for batch in loader:
            inputs, masks, lat, lon, doy, target_anom, target_abs, clim, target_mask = (
                batch_to_model_inputs(batch, 1, device)
            )
            output = model(
                inputs=inputs, masks=masks,
                lat_norm=lat, lon_norm=lon, doy_norm=doy,
                depths=SIH_DEPTHS,
            )
            pred_anom_np = output["means"].float().cpu().numpy()
            clim_np = clim.float().cpu().numpy()
            target_abs_np = target_abs.float().cpu().numpy()
            pred_c = clim_np + pred_anom_np
            target_c = target_abs_np

            overall.update(pred_c, target_c)
            for idx in range(len(SIH_DEPTHS)):
                per_depth[idx].update(pred_c[:, idx], target_c[:, idx])
            for name, (lo, hi) in bands.items():
                idx_arr = np.where((depths_arr >= lo) & (depths_arr <= hi))[0]
                band_metrics[name].update(pred_c[:, idx_arr], target_c[:, idx_arr])

    return {
        "overall": overall.result(),
        "depth_bands": {name: m.result() for name, m in band_metrics.items()},
        "per_depth_rmse": {
            f"{d:.2f}": per_depth[i].result()["rmse"]
            for i, d in enumerate(SIH_DEPTHS)
        },
    }


def evaluate_climatology(loader, device) -> dict:
    """Zero-anomaly baseline: pred = climatology."""
    overall = RunningMetrics()
    per_depth = [RunningMetrics() for _ in SIH_DEPTHS]
    bands = {"ML_0-50m": (0, 50), "thermocline_50-200m": (50, 200), "deep_200-1000m": (200, 1000)}
    band_metrics = {name: RunningMetrics() for name in bands}
    depths_arr = np.asarray(SIH_DEPTHS, dtype=float)

    with torch.no_grad():
        for batch in loader:
            _, _, _, _, _, _, target_abs, clim, _ = batch_to_model_inputs(batch, 1, device)
            clim_np = clim.float().cpu().numpy()
            target_abs_np = target_abs.float().cpu().numpy()

            overall.update(clim_np, target_abs_np)
            for idx in range(len(SIH_DEPTHS)):
                per_depth[idx].update(clim_np[:, idx], target_abs_np[:, idx])
            for name, (lo, hi) in bands.items():
                idx_arr = np.where((depths_arr >= lo) & (depths_arr <= hi))[0]
                band_metrics[name].update(clim_np[:, idx_arr], target_abs_np[:, idx_arr])

    return {
        "overall": overall.result(),
        "depth_bands": {name: m.result() for name, m in band_metrics.items()},
        "per_depth_rmse": {
            f"{d:.2f}": per_depth[i].result()["rmse"]
            for i, d in enumerate(SIH_DEPTHS)
        },
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    root = Path(__file__).resolve().parents[3]
    run_dir   = root / "runs" / "phase4_anomaly"
    ckpt_path = run_dir / "checkpoint_best.pt"
    cfg_path  = root / "backend/ocean_embed/configs/training_config.yaml"
    dcfg_path = root / "backend/ocean_embed/configs/data_config.yaml"
    surface   = root / "data/processed/surface_features.zarr"
    target    = root / "data/processed/target_glorys.zarr"
    stats     = root / "data/processed/normalization_stats_v3.json"

    print("=" * 64)
    print("  OceanEmbed — Final Evaluation Report (phase4_anomaly)")
    print("=" * 64)

    # Load model ----------------------------------------------------------
    cfg = load_training_config(cfg_path)
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    model = build_model_from_config(cfg)
    model.load_state_dict(ckpt["model_state_dict"])
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    best_epoch = int(ckpt.get("epoch", -1))
    print(f"\n  checkpoint : checkpoint_best.pt  (epoch {best_epoch})")
    print(f"  device     : {device}")

    # Build test loader ---------------------------------------------------
    with open(dcfg_path, encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)
    sf = xr.open_zarr(surface)
    splits = make_date_range_split(
        sf.time.values,
        data_cfg["splits"]["train_range"],
        data_cfg["splits"]["val_range"],
        data_cfg["splits"]["test_range"],
    )
    sf.close()
    ds = OceanEmbedDataset(surface, target, stats, indices=splits["test"], mode="eval")
    loader = DataLoader(ds, batch_size=2, shuffle=False, num_workers=0,
                        pin_memory=(device.type == "cuda"))
    print(f"  test split : {len(ds)} samples (2022)\n")

    # Climatology baseline ------------------------------------------------
    print("  [1/2] Computing climatology baseline ...")
    clim_res  = evaluate_climatology(loader, device)
    clim_rmse = clim_res["overall"]["rmse"]
    print(f"        Climatology RMSE = {clim_rmse:.4f} °C")

    # Model evaluation ----------------------------------------------------
    print(f"  [2/2] Evaluating model (best checkpoint, epoch {best_epoch}) ...")
    model_res  = evaluate_checkpoint(model, loader, device)
    model_rmse = model_res["overall"]["rmse"]
    print(f"        Model RMSE       = {model_rmse:.4f} °C")

    # Epoch table from CSV ------------------------------------------------
    epoch_rows: list[dict] = []
    epoch_csv = run_dir / "epoch_table.csv"
    if epoch_csv.exists():
        with open(epoch_csv, newline="") as f:
            epoch_rows = list(csv.DictReader(f))

    # ---- Print report ---------------------------------------------------
    print("\n" + "=" * 64)
    print("  EPOCH TABLE  (val_rmse = absolute-temperature RMSE, °C)")
    print("=" * 64)
    print(f"  {'Ep':>3}  {'Train Loss':>11}  {'Val Loss':>9}  {'Val RMSE':>9}  {'LR':>10}")
    for row in epoch_rows:
        mark = " *" if int(row["epoch"]) == best_epoch else "  "
        print(
            f"  {int(row['epoch']):>3}{mark} "
            f"{float(row['train_loss']):>11.5f}  "
            f"{float(row['val_loss']):>9.5f}  "
            f"{float(row['val_rmse']):>8.4f}°C  "
            f"{float(row['lr']):>10.2e}"
        )
    print("  (* = best checkpoint)")

    print("\n" + "=" * 64)
    print("  TEST-SET RESULTS  (2022 hold-out)")
    print("=" * 64)
    ratio = clim_rmse / model_rmse if model_rmse > 0 else float("nan")
    beats = model_rmse < clim_rmse
    print(f"  Climatology baseline RMSE  : {clim_rmse:.4f} °C")
    print(f"  Model RMSE (epoch {best_epoch:>2})       : {model_rmse:.4f} °C")
    print(f"  Ratio  clim / model        : {ratio:.3f}x")
    verdict = "[OK] BEATS" if beats else "[!!] DOES NOT BEAT"
    print(f"  Verdict : Model {verdict} climatology")

    print("\n  Depth-band breakdown:")
    print(f"  {'Band':<26} {'Model RMSE':>11}  {'Clim RMSE':>10}  {'Model R2':>9}")
    for band in model_res["depth_bands"]:
        m = model_res["depth_bands"][band]
        c = clim_res["depth_bands"][band]
        print(
            f"  {band:<26} {m['rmse']:>10.4f}°C  {c['rmse']:>9.4f}°C  {m['r2']:>9.4f}"
        )

    print("\n  Per-depth RMSE:")
    print(f"  {'Depth':>8}  {'Model':>10}  {'Clim':>9}  {'delta(m-c)':>10}")
    for dk in model_res["per_depth_rmse"]:
        m_r = model_res["per_depth_rmse"][dk]
        c_r = clim_res["per_depth_rmse"][dk]
        delta = m_r - c_r
        better = "[better]" if delta < 0 else "[worse] "
        print(f"  {float(dk):>7.2f}m  {m_r:>9.4f}C  {c_r:>8.4f}C  {delta:>+9.4f} {better}")

    # ---- Plot -----------------------------------------------------------
    depths_plot   = list(SIH_DEPTHS)
    model_pd      = list(model_res["per_depth_rmse"].values())
    clim_pd       = list(clim_res["per_depth_rmse"].values())

    fig, ax = plt.subplots(figsize=(9, 5))
    ax.plot(depths_plot, model_pd, marker="o", label=f"Model (epoch {best_epoch})", color="#4C9BE8", linewidth=2)
    ax.plot(depths_plot, clim_pd,  marker="s", label="Climatology baseline", color="#E8714C", linestyle="--", linewidth=2)
    ax.set_xlabel("Depth (m)")
    ax.set_ylabel("Test RMSE (°C)")
    ax.set_title("OceanEmbed phase4_anomaly — Test RMSE vs Depth (2022)")
    ax.legend()
    ax.grid(alpha=0.3)
    plot_path = run_dir / "test_rmse_vs_depth_final.png"
    fig.savefig(plot_path, dpi=140, bbox_inches="tight")
    plt.close(fig)
    print(f"\n  [Plot] {plot_path}")

    # ---- Save JSON ------------------------------------------------------
    report = {
        "run": "phase4_anomaly",
        "checkpoint": str(ckpt_path),
        "best_epoch": best_epoch,
        "test_split": "2022",
        "n_test_samples": len(ds),
        "climatology_baseline": clim_res,
        "model_test": model_res,
        "epoch_history": epoch_rows,
        "summary": {
            "clim_rmse": clim_rmse,
            "model_rmse": model_rmse,
            "model_beats_clim": bool(beats),
            "ratio_clim_over_model": float(ratio),
        },
    }
    report_path = run_dir / "final_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"  [JSON] {report_path}")
    print("\n  Done.")
    ds.close()


if __name__ == "__main__":
    main()
