"""
Phase 6.1 — Post-training evaluation script.

Loads the best checkpoint from runs/phase6_mse_only/, evaluates on the 2022
test split (anomaly formulation), and prints a comparison table vs:
  - Climatology (0.6429)
  - Ridge (0.5856)
  - v1 OceanEmbed (0.6047)
  - U-Net baseline (0.5312)

Usage (from project root):
    python backend/ocean_embed/evaluation/eval_phase6.py
"""

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

from ocean_embed.data import OceanEmbedDataset, load_normalization_stats
from ocean_embed.data.splits import make_date_range_split
from ocean_embed.grid import SIH_DEPTHS
from ocean_embed.training.train import build_model_from_config, load_training_config
from ocean_embed.training.trainer import batch_to_model_inputs


# ── Known reference values from prior experiments ──────────────────────────
REFERENCES = {
    "Climatology":       {"rmse": 0.6429, "mae": None,   "r2": None},
    "Ridge (anomaly)":   {"rmse": 0.5856, "mae": None,   "r2": None},
    "v1 OceanEmbed":     {"rmse": 0.6047, "mae": 0.2853, "r2": 0.9973},
    "U-Net baseline":    {"rmse": 0.5312, "mae": 0.2362, "r2": 0.9980},
}

BAND_REF = {
    # (v1, U-Net) per band
    "ML_0-50m":          {"v1": 0.4840, "unet": 0.4551},
    "thermocline_50-200m": {"v1": 0.8707, "unet": 0.7383},
    "deep_200-1000m":    {"v1": 0.2690, "unet": 0.2570},
}


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
        self.sum_err_sq    += float(np.dot(err, err))
        self.sum_abs_err   += float(np.abs(err).sum())
        self.sum_err       += float(err.sum())
        self.sum_pred      += float(p.sum())
        self.sum_target    += float(t.sum())
        self.sum_pred_sq   += float(np.dot(p, p))
        self.sum_target_sq += float(np.dot(t, t))
        self.sum_pred_target += float(np.dot(p, t))

    def result(self) -> dict[str, float]:
        n = max(self.n, 1)
        mean_p = self.sum_pred / n
        mean_t = self.sum_target / n
        var_p  = self.sum_pred_sq   - n * mean_p ** 2
        var_t  = self.sum_target_sq - n * mean_t ** 2
        cov    = self.sum_pred_target - n * mean_p * mean_t
        pearson = cov / np.sqrt(var_p * var_t) if var_p > 0 and var_t > 0 else float("nan")
        return {
            "rmse":      float(np.sqrt(self.sum_err_sq / n)),
            "mae":       float(self.sum_abs_err / n),
            "bias":      float(self.sum_err / n),
            "pearson_r": float(pearson),
            "r2":        float(1.0 - self.sum_err_sq / var_t) if var_t > 0 else float("nan"),
            "n":         int(self.n),
        }


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    run_dir = root / "runs" / "phase6_mse_only"
    ckpt_path = run_dir / "checkpoint_best.pt"

    if not ckpt_path.exists():
        # Fallback: find latest epoch checkpoint
        ckpts = sorted(run_dir.glob("checkpoint_epoch_*.pt"))
        if not ckpts:
            raise FileNotFoundError(f"No checkpoint found in {run_dir}")
        ckpt_path = ckpts[-1]
        print(f"[WARN] checkpoint_best.pt not found — using {ckpt_path.name}")

    print(f"Loading checkpoint: {ckpt_path}")
    cfg_path = root / "backend/ocean_embed/configs/phase6_mse_only.yaml"
    cfg = load_training_config(cfg_path)

    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    model = build_model_from_config(cfg)
    model.load_state_dict(ckpt["model_state_dict"])
    best_epoch = int(ckpt.get("epoch", -1))
    print(f"Best checkpoint epoch: {best_epoch}")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Device: {device}")
    model = model.to(device).eval()

    # ── Data ────────────────────────────────────────────────────────────────
    with open(root / "backend/ocean_embed/configs/data_config.yaml", encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)

    surface_path = root / "data/processed/surface_features.zarr"
    target_path  = root / "data/processed/target_glorys.zarr"
    stats_path   = root / "data/processed/normalization_stats_v3.json"

    sf = xr.open_zarr(str(surface_path))
    splits = make_date_range_split(
        sf.time.values,
        data_cfg["splits"]["train_range"],
        data_cfg["splits"]["val_range"],
        data_cfg["splits"]["test_range"],
    )
    sf.close()

    ds = OceanEmbedDataset(surface_path, target_path, stats_path, indices=splits["test"], mode="eval")
    loader = DataLoader(ds, batch_size=2, shuffle=False, num_workers=0,
                        pin_memory=(device.type == "cuda"))
    print(f"Test samples: {len(ds)}")

    # ── Evaluation ──────────────────────────────────────────────────────────
    depths = np.asarray(SIH_DEPTHS, dtype=float)
    bands  = {"ML_0-50m": (0, 50), "thermocline_50-200m": (50, 200), "deep_200-1000m": (200, 1000)}

    overall      = RunningMetrics()
    per_depth    = [RunningMetrics() for _ in SIH_DEPTHS]
    band_metrics = {name: RunningMetrics() for name in bands}

    n_batches = 0
    with torch.no_grad():
        for batch in loader:
            inputs, masks, lat, lon, doy, target_anom, target_abs, clim, target_mask = \
                batch_to_model_inputs(batch, 1, device)
            out = model(inputs=inputs, masks=masks, lat_norm=lat, lon_norm=lon,
                        doy_norm=doy, depths=SIH_DEPTHS)
            pred_anom = out["means"].float().cpu().numpy()
            clim_np   = clim.float().cpu().numpy()
            tgt_np    = target_abs.float().cpu().numpy()
            pred_abs  = clim_np + pred_anom

            overall.update(pred_abs, tgt_np)
            for idx in range(len(SIH_DEPTHS)):
                per_depth[idx].update(pred_abs[:, idx], tgt_np[:, idx])
            for name, (lo, hi) in bands.items():
                idx = np.where((depths >= lo) & (depths <= hi))[0]
                band_metrics[name].update(pred_abs[:, idx], tgt_np[:, idx])

            n_batches += 1
            if n_batches % 50 == 0:
                print(f"  batches processed: {n_batches}")

    print(f"Total batches: {n_batches}")

    # ── Compile results ─────────────────────────────────────────────────────
    ov = overall.result()
    results: dict[str, Any] = {
        "run": "phase6_mse_only",
        "checkpoint": str(ckpt_path),
        "best_epoch": best_epoch,
        "split": "test (2022)",
        "n_samples": len(ds),
        "overall": ov,
        "depth_bands": {name: m.result() for name, m in band_metrics.items()},
        "per_depth_rmse": {
            str(d): per_depth[i].result()["rmse"]
            for i, d in enumerate(SIH_DEPTHS)
        },
    }

    # ── Save ────────────────────────────────────────────────────────────────
    out_json = run_dir / "test_metrics.json"
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved: {out_json}")

    # ── Comparison table ────────────────────────────────────────────────────
    this_rmse = ov["rmse"]
    this_mae  = ov["mae"]
    this_r2   = ov["r2"]
    clim_rmse = REFERENCES["Climatology"]["rmse"]

    lines = []
    lines.append("# Phase 6.1 — MSE-only Loss Ablation Results\n")
    lines.append(f"**Best epoch:** {best_epoch}  ")
    lines.append(f"**Test samples:** {len(ds)} (2022)\n")

    lines.append("\n## Overall Test Metrics\n")
    lines.append(f"- **RMSE:** {this_rmse:.4f} °C")
    lines.append(f"- **MAE:**  {this_mae:.4f} °C")
    lines.append(f"- **R²:**   {this_r2:.4f}")
    lines.append(f"- **Δ vs Climatology:** {this_rmse - clim_rmse:+.4f} °C ({(this_rmse - clim_rmse)/clim_rmse*100:+.1f}%)")

    lines.append("\n## Comparison Table\n")
    header = "| Model | RMSE (°C) | Δ vs Clim | Δ vs v1 |"
    lines.append(header)
    lines.append("|:---|:---:|:---:|:---:|")

    ref_rows = [
        ("Climatology",       REFERENCES["Climatology"]["rmse"]),
        ("Ridge (anomaly)",   REFERENCES["Ridge (anomaly)"]["rmse"]),
        ("v1 OceanEmbed",     REFERENCES["v1 OceanEmbed"]["rmse"]),
        ("U-Net baseline",    REFERENCES["U-Net baseline"]["rmse"]),
        ("**Phase 6.1 MSE-only**", this_rmse),
    ]
    v1_rmse = REFERENCES["v1 OceanEmbed"]["rmse"]
    for name, rmse_val in ref_rows:
        d_clim = rmse_val - clim_rmse
        d_v1   = rmse_val - v1_rmse
        lines.append(f"| {name} | {rmse_val:.4f} | {d_clim:+.4f} | {d_v1:+.4f} |")

    lines.append("\n## Per-Band Results\n")
    lines.append("| Band | MSE-only | v1 OceanEmbed | U-Net baseline |")
    lines.append("|:---|:---:|:---:|:---:|")
    for band_name, ref in BAND_REF.items():
        band_rmse = band_metrics[band_name].result()["rmse"]
        lines.append(f"| {band_name} | {band_rmse:.4f} | {ref['v1']:.4f} | {ref['unet']:.4f} |")

    lines.append("\n## Interpretation\n")
    if this_rmse < 0.55:
        verdict = (
            "✅ **Auxiliary losses were the problem.** MSE-only clearly beats v1 and approaches the "
            "U-Net baseline. The thermocline + smoothness regularization terms were over-constraining "
            "the model and preventing it from fitting the data effectively."
        )
    elif this_rmse < 0.60:
        verdict = (
            "⚠️ **Partial improvement.** MSE-only is better than v1 but auxiliary losses are not the "
            "only cause of the gap vs U-Net. Architecture differences (encoder depth, capacity, etc.) "
            "also play a role."
        )
    else:
        verdict = (
            "❌ **Auxiliary losses are NOT the bottleneck.** MSE-only performs similarly to or worse "
            "than v1. The architecture (Fourier depth decoder, capacity) is the main limiting factor, "
            "not the loss formulation."
        )
    lines.append(verdict)

    lines.append("\n## Per-depth RMSE\n")
    lines.append("| Depth (m) | MSE-only | v1 OceanEmbed | U-Net baseline |")
    lines.append("|---:|:---:|:---:|:---:|")
    # Store v1 and U-Net per-depth (hardcoded from phase4 / phase5 results)
    v1_per_depth = {
        0.49: 0.4422, 5.08: 0.4408, 9.57: 0.4362, 18.50: 0.4558, 29.44: 0.4934,
        47.37: 0.6059, 77.85: 0.9098, 92.33: 1.0255, 130.67: 0.9361, 155.85: 0.7950,
        186.13: 0.6343, 318.13: 0.3375, 541.09: 0.2646, 643.57: 0.2709, 902.34: 0.2468,
    }
    unet_per_depth = {
        0.49: 0.4255, 5.08: 0.4229, 9.57: 0.4191, 18.50: 0.4388, 29.44: 0.4706,
        47.37: 0.5413, 77.85: 0.7799, 92.33: 0.8693, 130.67: 0.7776, 155.85: 0.6748,
        # 0.5494 is the 186.13 m GLORYS test-set RMSE, not an Argo validation value.
        186.13: 0.5494, 318.13: 0.3164, 541.09: 0.2266, 643.57: 0.2339, 902.34: 0.2408,
    }
    for d in SIH_DEPTHS:
        mse_val = results["per_depth_rmse"][str(d)]
        lines.append(f"| {d:.2f} | {mse_val:.4f} | {v1_per_depth.get(d, float('nan')):.4f} | {unet_per_depth.get(d, float('nan')):.4f} |")

    report_md = "\n".join(lines)
    report_path = run_dir / "phase6_report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_md)
    print(f"Saved: {report_path}")

    # ── Plot ────────────────────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(10, 5))
    pd_rmse  = [results["per_depth_rmse"][str(d)] for d in SIH_DEPTHS]
    v1_vals  = [v1_per_depth.get(d, float("nan")) for d in SIH_DEPTHS]
    un_vals  = [unet_per_depth.get(d, float("nan")) for d in SIH_DEPTHS]
    ax.plot(SIH_DEPTHS, pd_rmse, "o-", label="Phase 6.1 MSE-only", color="royalblue", lw=2)
    ax.plot(SIH_DEPTHS, v1_vals, "s--", label="v1 OceanEmbed (0.6047)", color="tomato", lw=1.5, alpha=0.8)
    ax.plot(SIH_DEPTHS, un_vals, "^--", label="U-Net baseline (0.5312)", color="seagreen", lw=1.5, alpha=0.8)
    ax.set_xlabel("Depth (m)")
    ax.set_ylabel("Test RMSE (°C)")
    ax.set_title(f"Phase 6.1 — MSE-only ablation (overall RMSE={this_rmse:.4f} °C)")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    plot_path = run_dir / "phase6_rmse_vs_depth.png"
    fig.savefig(plot_path, dpi=140, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved: {plot_path}")

    # ── Final console summary ────────────────────────────────────────────────
    print("\n" + "="*60)
    print("PHASE 6.1 — FINAL RESULTS")
    print("="*60)
    print(f"  Overall RMSE : {this_rmse:.4f} °C")
    print(f"  Overall MAE  : {this_mae:.4f} °C")
    print(f"  Overall R²   : {this_r2:.4f}")
    print(f"  Best epoch   : {best_epoch}")
    print("-"*60)
    print(f"  vs Climatology : {this_rmse - clim_rmse:+.4f} ({(this_rmse - clim_rmse)/clim_rmse*100:+.1f}%)")
    print(f"  vs v1          : {this_rmse - v1_rmse:+.4f} ({(this_rmse - v1_rmse)/v1_rmse*100:+.1f}%)")
    print(f"  vs U-Net       : {this_rmse - 0.5312:+.4f} ({(this_rmse - 0.5312)/0.5312*100:+.1f}%)")
    print("="*60)
    if this_rmse < 0.55:
        print("VERDICT: ✅ MSE-only is better — auxiliary losses were over-regularizing")
    elif this_rmse < 0.60:
        print("VERDICT: ⚠️ Partial improvement — architecture also a factor")
    else:
        print("VERDICT: ❌ No improvement — architecture is the limiting factor")
    print("="*60)


if __name__ == "__main__":
    main()
