"""
Phase 6.2 — Input Variable Ablation Study with U-Net.

Trains and evaluates 4 U-Net variants on different input channel subsets:
  - V1: SST only (1 channel: analysed_sst)
  - V2: SST + SLA (2 channels: analysed_sst, sla)
  - V3: SST + SLA + SSS (3 channels: analysed_sst, sla, sos)
  - V4: All 7 channels (analysed_sst, sos, sla, u, v, uwnd, vwnd)

All variants use:
  - Dataset: 2010–2020 Train, 2021 Val, 2022 Test (Anomaly Formulation)
  - Architecture: BaselineModel (U-Net) with in_channels matched to subset
  - Loss: MSE on anomalies with target_mask
  - Schedule: max 30 epochs, batch 2, accum 4, LR 5e-4, cosine annealing, patience 5
  - Training crop (51x121)

Outputs:
  - runs/phase6_ablation/variables.csv
  - runs/phase6_ablation/variables.png
  - runs/phase6_ablation/ablation_results.json
  - Checkpoints and metrics in runs/phase6_var_<N>/
"""

from __future__ import annotations

import csv
import io
import json
import logging
import random
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
import torch.nn.functional as F
import xarray as xr
import yaml
from torch.amp import GradScaler, autocast
from torch.utils.data import DataLoader

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from ocean_embed.data import OceanEmbedDataset, load_normalization_stats
from ocean_embed.data.normalization import SURFACE_VARS
from ocean_embed.data.splits import make_date_range_split
from ocean_embed.grid import SIH_DEPTHS
from ocean_embed.models.baseline import BaselineModel

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("var_ablation")

ROOT         = Path(__file__).resolve().parents[3]
DATA_DIR     = ROOT / "data" / "processed"
SURFACE_ZARR = DATA_DIR / "surface_features.zarr"
TARGET_ZARR  = DATA_DIR / "target_glorys.zarr"
CLIM_ZARR    = DATA_DIR / "climatology_2010_2020.zarr"
STATS_PATH   = DATA_DIR / "normalization_stats_v3.json"
DATA_CFG     = ROOT / "backend/ocean_embed/configs/data_config.yaml"
ABLATION_DIR = ROOT / "runs" / "phase6_ablation"
ABLATION_DIR.mkdir(parents=True, exist_ok=True)

DEPTHS_ARR = np.asarray(SIH_DEPTHS, dtype=float)
BANDS = {
    "ML_0-50m": (0.0, 50.0),
    "thermocline_50-200m": (50.0, 200.0),
    "deep_200-1000m": (200.0, 1000.0),
}

# Variable configurations
# Canonical order in SURFACE_VARS:
# 0: analysed_sst, 1: sos, 2: sla, 3: u, 4: v, 5: uwnd, 6: vwnd
VAR_CONFIGS = [
    {
        "id": "phase6_var_1",
        "name": "V1: SST only",
        "short_name": "SST",
        "n_vars": 1,
        "channel_indices": [0],
        "channel_names": ["analysed_sst"],
    },
    {
        "id": "phase6_var_2",
        "name": "V2: SST + SLA",
        "short_name": "SST+SLA",
        "n_vars": 2,
        "channel_indices": [0, 2],
        "channel_names": ["analysed_sst", "sla"],
    },
    {
        "id": "phase6_var_3",
        "name": "V3: SST + SLA + SSS",
        "short_name": "SST+SLA+SSS",
        "n_vars": 3,
        "channel_indices": [0, 2, 1],
        "channel_names": ["analysed_sst", "sla", "sos"],
    },
    {
        "id": "phase6_var_4",
        "name": "V4: All 7 channels",
        "short_name": "All 7 vars",
        "n_vars": 7,
        "channel_indices": [0, 1, 2, 3, 4, 5, 6],
        "channel_names": SURFACE_VARS,
    },
]


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
        if p.size == 0:
            return
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
        mean_p = self.sum_pred / n
        mean_t = self.sum_target / n
        var_p = self.sum_pred_sq - n * (mean_p ** 2)
        var_t = self.sum_target_sq - n * (mean_t ** 2)
        cov = self.sum_pred_target - n * mean_p * mean_t
        r = cov / np.sqrt(var_p * var_t) if var_p > 0 and var_t > 0 else float("nan")
        r2 = 1.0 - (self.sum_err_sq / var_t) if var_t > 0 else float("nan")
        return {
            "rmse": float(np.sqrt(self.sum_err_sq / n)),
            "mae":  float(self.sum_abs_err / n),
            "bias": float(self.sum_err / n),
            "r2":   float(r2),
            "pearson_r": float(r),
            "n_points": int(self.n),
        }


def make_accumulator() -> dict[str, Any]:
    return {
        "overall": RunningMetrics(),
        "per_depth": [RunningMetrics() for _ in SIH_DEPTHS],
        "bands": {name: RunningMetrics() for name in BANDS},
    }


def accumulate_batch(acc: dict[str, Any], pred: np.ndarray, target: np.ndarray) -> None:
    acc["overall"].update(pred, target)
    for d in range(len(SIH_DEPTHS)):
        acc["per_depth"][d].update(pred[:, d], target[:, d])
    for name, (lo, hi) in BANDS.items():
        idx = np.where((DEPTHS_ARR >= lo) & (DEPTHS_ARR <= hi))[0]
        acc["bands"][name].update(pred[:, idx], target[:, idx])


def train_and_eval_variant(
    var_cfg: Dict[str, Any],
    train_ds: OceanEmbedDataset,
    val_ds: OceanEmbedDataset,
    test_ds: OceanEmbedDataset,
    device: torch.device,
) -> Dict[str, Any]:
    run_id = var_cfg["id"]
    run_name = var_cfg["name"]
    ch_indices = var_cfg["channel_indices"]
    n_in_ch = len(ch_indices)
    run_dir = ROOT / "runs" / run_id
    run_dir.mkdir(parents=True, exist_ok=True)

    log.info("=" * 70)
    log.info(f"STARTING {run_name} (in_channels={n_in_ch}, indices={ch_indices})")
    log.info(f"Directory: {run_dir}")
    log.info("=" * 70)

    # Set seeds for exact reproducibility
    random.seed(42); np.random.seed(42); torch.manual_seed(42)
    if device.type == "cuda":
        torch.cuda.manual_seed_all(42)

    train_loader = DataLoader(train_ds, batch_size=2, shuffle=True,  num_workers=0, pin_memory=(device.type == "cuda"))
    val_loader   = DataLoader(val_ds,   batch_size=4, shuffle=False, num_workers=0, pin_memory=(device.type == "cuda"))
    test_loader  = DataLoader(test_ds,  batch_size=4, shuffle=False, num_workers=0, pin_memory=(device.type == "cuda"))

    model = BaselineModel(
        in_channels=n_in_ch, out_depths=15, base_channels=32, encoder_depth=4, dropout=0.2
    ).to(device)
    log.info(f"{run_name} parameter count: {model.count_parameters():,}")

    optimizer = torch.optim.AdamW(model.parameters(), lr=5e-4, weight_decay=3e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=30, eta_min=1e-6)
    scaler    = GradScaler("cuda", enabled=(device.type == "cuda"))
    accum_steps = 4

    best_val_rmse = float("inf")
    patience = 5
    patience_counter = 0
    MAX_EPOCHS = 30
    history = []
    best_epoch = -1

    t0_train = time.perf_counter()

    for epoch in range(MAX_EPOCHS):
        t_epoch0 = time.perf_counter()
        model.train()
        losses = []
        optimizer.zero_grad(set_to_none=True)

        for step, batch in enumerate(train_loader):
            # Select subset of input channels
            x_full = batch["input"].to(device, non_blocking=True) # (B, 7, H, W)
            x = x_full[:, ch_indices, :, :]
            anom = batch["target"].to(device, non_blocking=True)
            mask = batch["target_mask"].to(device, non_blocking=True)

            with autocast("cuda", enabled=(device.type == "cuda")):
                pred = model(x)
                loss = ((pred - anom) ** 2 * mask).sum() / mask.sum().clamp(min=1.0)

            scaler.scale(loss / accum_steps).backward()
            losses.append(float(loss.detach()))

            if (step + 1) % accum_steps == 0 or (step + 1) == len(train_loader):
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                scaler.step(optimizer)
                scaler.update()
                optimizer.zero_grad(set_to_none=True)

        scheduler.step()
        epoch_sec = time.perf_counter() - t_epoch0
        train_loss = float(np.mean(losses))

        # Evaluate validation set
        model.eval()
        val_acc = RunningMetrics()
        with torch.no_grad():
            for batch in val_loader:
                x_full   = batch["input"].to(device, non_blocking=True)
                x        = x_full[:, ch_indices, :, :]
                clim     = batch["clim"].to(device, non_blocking=True)
                tgt_abs  = batch["target_absolute"].to(device, non_blocking=True)
                tgt_mask = batch["target_mask"].to(device, non_blocking=True)

                with autocast("cuda", enabled=(device.type == "cuda")):
                    pred_anom = model(x)
                    pred_abs  = clim + pred_anom
                    pred_abs  = pred_abs * tgt_mask

                val_acc.update(pred_abs.float().cpu().numpy(), tgt_abs.float().cpu().numpy())

        val_rmse = val_acc.result()["rmse"]
        val_r2   = val_acc.result()["r2"]
        current_lr = scheduler.get_last_lr()[0]

        log.info(
            f"[{var_cfg['short_name']}] Epoch {epoch:2d}/{MAX_EPOCHS} | Train Loss: {train_loss:.5f} | "
            f"Val RMSE: {val_rmse:.4f} °C | Val R²: {val_r2:.4f} | LR: {current_lr:.2e} | {epoch_sec:.1f}s"
        )

        history.append({
            "epoch": epoch,
            "train_loss": train_loss,
            "val_rmse": val_rmse,
            "val_r2": val_r2,
            "lr": current_lr,
            "epoch_sec": epoch_sec,
        })

        if val_rmse < best_val_rmse:
            best_val_rmse = val_rmse
            best_epoch = epoch
            patience_counter = 0
            log.info(f"  --> Best Val RMSE: {best_val_rmse:.4f} °C (Epoch {epoch})")
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "val_rmse": best_val_rmse,
                "var_config": var_cfg,
            }, run_dir / "checkpoint_best.pt")
        else:
            patience_counter += 1
            log.info(f"  Patience {patience_counter}/{patience}")
            if patience_counter >= patience:
                log.info(f"Early stopping triggered at epoch {epoch}.")
                break

    train_total_sec = time.perf_counter() - t0_train
    log.info(f"Training completed in {train_total_sec / 60:.1f} min. Best epoch: {best_epoch}")

    with open(run_dir / "history.json", "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)

    # ── Test Evaluation (2022 Split) ──────────────────────────────────────────
    log.info(f"Evaluating {run_name} on 2022 test split...")
    best_ckpt = torch.load(run_dir / "checkpoint_best.pt", map_location="cpu", weights_only=False)
    model.load_state_dict(best_ckpt["model_state_dict"])
    model.eval()

    test_acc = make_accumulator()
    with torch.no_grad():
        for batch in test_loader:
            x_full   = batch["input"].to(device, non_blocking=True)
            x        = x_full[:, ch_indices, :, :]
            clim     = batch["clim"].to(device, non_blocking=True)
            tgt_abs  = batch["target_absolute"].to(device, non_blocking=True)
            tgt_mask = batch["target_mask"].to(device, non_blocking=True)

            with autocast("cuda", enabled=(device.type == "cuda")):
                pred_anom = model(x)
                pred_abs  = clim + pred_anom
                pred_abs  = pred_abs * tgt_mask

            accumulate_batch(test_acc, pred_abs.float().cpu().numpy(), tgt_abs.float().cpu().numpy())

    test_results = {
        "id": run_id,
        "name": run_name,
        "short_name": var_cfg["short_name"],
        "n_vars": var_cfg["n_vars"],
        "channels": var_cfg["channel_names"],
        "best_epoch": best_epoch,
        "training_time_min": train_total_sec / 60,
        "overall": test_acc["overall"].result(),
        "depth_bands": {name: test_acc["bands"][name].result() for name in BANDS},
        "per_depth_rmse": {
            str(d): test_acc["per_depth"][idx].result()["rmse"]
            for idx, d in enumerate(SIH_DEPTHS)
        },
    }

    with open(run_dir / "test_metrics.json", "w", encoding="utf-8") as f:
        json.dump(test_results, f, indent=2)

    log.info(f"=== {run_name} Test RMSE: {test_results['overall']['rmse']:.4f} °C ===")
    return test_results


def main() -> None:
    t_start = time.perf_counter()
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log.info(f"Device: {device}")

    # Load splits
    with open(DATA_CFG, encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)

    sf = xr.open_zarr(str(SURFACE_ZARR))
    splits = make_date_range_split(
        sf.time.values,
        data_cfg["splits"]["train_range"],
        data_cfg["splits"]["val_range"],
        data_cfg["splits"]["test_range"],
    )
    sf.close()

    train_ds = OceanEmbedDataset(
        SURFACE_ZARR, TARGET_ZARR, STATS_PATH,
        indices=splits["train"], mode="train", crop_size=(51, 121),
    )
    val_ds = OceanEmbedDataset(
        SURFACE_ZARR, TARGET_ZARR, STATS_PATH,
        indices=splits["val"], mode="eval",
    )
    test_ds = OceanEmbedDataset(
        SURFACE_ZARR, TARGET_ZARR, STATS_PATH,
        indices=splits["test"], mode="eval",
    )

    all_results = []
    for var_cfg in VAR_CONFIGS:
        res = train_and_eval_variant(var_cfg, train_ds, val_ds, test_ds, device)
        all_results.append(res)

    train_ds.close(); val_ds.close(); test_ds.close()

    # ── Save CSV Table ────────────────────────────────────────────────────────
    csv_path = ABLATION_DIR / "variables.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "variant_id", "name", "n_variables", "channels",
            "overall_rmse", "overall_mae", "overall_r2",
            "ml_0_50m_rmse", "thermocline_50_200m_rmse", "deep_200_1000m_rmse",
            "best_epoch", "training_time_min"
        ])
        for r in all_results:
            writer.writerow([
                r["id"],
                r["short_name"],
                r["n_vars"],
                "+".join(r["channels"]),
                f"{r['overall']['rmse']:.4f}",
                f"{r['overall']['mae']:.4f}",
                f"{r['overall']['r2']:.4f}",
                f"{r['depth_bands']['ML_0-50m']['rmse']:.4f}",
                f"{r['depth_bands']['thermocline_50-200m']['rmse']:.4f}",
                f"{r['depth_bands']['deep_200-1000m']['rmse']:.4f}",
                r["best_epoch"],
                f"{r['training_time_min']:.1f}",
            ])
    log.info(f"Saved: {csv_path}")

    with open(ABLATION_DIR / "ablation_results.json", "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2)

    # ── Generate Plot ─────────────────────────────────────────────────────────
    plot_path = ABLATION_DIR / "variables.png"
    n_vars = [r["n_vars"] for r in all_results]
    names  = [r["short_name"] for r in all_results]
    overall_rmse = [r["overall"]["rmse"] for r in all_results]
    ml_rmse      = [r["depth_bands"]["ML_0-50m"]["rmse"] for r in all_results]
    thermo_rmse  = [r["depth_bands"]["thermocline_50-200m"]["rmse"] for r in all_results]
    deep_rmse    = [r["depth_bands"]["deep_200-1000m"]["rmse"] for r in all_results]

    fig, ax = plt.subplots(figsize=(9, 6), dpi=150)
    ax.plot(n_vars, overall_rmse, "o-", color="black", lw=2.5, markersize=8, label="Overall (0–1000m)")
    ax.plot(n_vars, thermo_rmse, "s--", color="#d95f02", lw=2.0, markersize=7, label="Thermocline (50–200m)")
    ax.plot(n_vars, ml_rmse, "^--", color="#7570b3", lw=2.0, markersize=7, label="Mixed Layer (0–50m)")
    ax.plot(n_vars, deep_rmse, "d--", color="#1b9e77", lw=2.0, markersize=7, label="Deep (200–1000m)")

    # Add Climatology reference line for Overall
    ax.axhline(0.6429, color="gray", linestyle=":", lw=1.5, label="Climatology Baseline (0.6429 °C)")

    # Annotate points
    for x, y, name in zip(n_vars, overall_rmse, names):
        ax.annotate(f"{y:.4f} °C\n({name})", (x, y), textcoords="offset points", xytext=(0, 10), ha="center", fontsize=9, fontweight="bold")

    ax.set_xticks(n_vars)
    ax.set_xticklabels([f"{n} var(s)\n[{name}]" for n, name in zip(n_vars, names)], fontsize=10)
    ax.set_xlabel("Number of Input Surface Variables", fontsize=12, fontweight="bold")
    ax.set_ylabel("Test RMSE (°C)", fontsize=12, fontweight="bold")
    ax.set_title("Phase 6.2 — Input Variable Ablation on 2022 Test Split (U-Net)", fontsize=13, fontweight="bold", pad=14)
    ax.grid(True, linestyle="--", alpha=0.5)
    ax.legend(frameon=True, facecolor="white", framealpha=0.9, fontsize=10, loc="upper right")
    fig.tight_layout()
    fig.savefig(plot_path)
    plt.close(fig)
    log.info(f"Saved plot: {plot_path}")

    total_time_min = (time.perf_counter() - t_start) / 60
    log.info("=" * 70)
    log.info(f"ALL 4 VARIANTS COMPLETED in {total_time_min:.1f} minutes!")
    log.info("=" * 70)


if __name__ == "__main__":
    main()
