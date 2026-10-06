"""
train_phase8.py — Phase 8: Smooth Thermocline-Weighted Loss (Issue #21 Option A)

Mirrors the exact setup that produced model_v2.pt:
  - BaselineModel (7-channel U-Net, 15-depth head)
  - Anomaly formulation (predict GLORYS - climatology)
  - AdamW + cosine LR + 3-epoch warmup
  - Batch 2, grad-accum 4, AMP

Only change vs v2: MSELoss replaced with WeightedMSELoss
  (Gaussian weight peak 3x at 100 m, sigma=40 m)

Output: runs/phase8_thermocline_weighted/
  checkpoint_epoch_NN.pt  (every epoch)
  checkpoint_best.pt      (best val RMSE)
  training_log.json

Usage (from project root):
    .venv312\\Scripts\\python.exe backend/ocean_embed/training/train_phase8.py
"""

from __future__ import annotations

import json
import logging
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import torch
import xarray as xr
import yaml
from torch.amp import GradScaler, autocast
from torch.utils.data import DataLoader

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

from ocean_embed.grid import GLORYS_NATIVE_DEPTHS
from ocean_embed.models.baseline import BaselineModel
from ocean_embed.data.zarr_dataset import OceanEmbedDataset
from ocean_embed.data.normalization import load_normalization_stats
from ocean_embed.data.splits import make_date_range_split
from ocean_embed.training.losses import WeightedMSELoss, smooth_thermocline_weight

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("train_phase8")

CFG_PATH = BACKEND / "ocean_embed/configs/phase8_thermocline_weighted.yaml"
RUN_NAME = "phase8_thermocline_weighted"
RUN_DIR  = ROOT / "runs" / RUN_NAME


def load_cfg() -> Dict[str, Any]:
    with open(CFG_PATH, encoding="utf-8") as f:
        return yaml.safe_load(f)


def set_seeds(seed: int) -> None:
    import random
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def print_weight_profile(depth_levels: list) -> None:
    logger.info("Depth-weight profile (WeightedMSELoss, sigma=40m, peak@100m):")
    for d in depth_levels:
        w = smooth_thermocline_weight(d)
        logger.info("  %6.1f m  w=%.4f", d, w)


def train_one_epoch(
    model, loader, loss_fn, optimizer, scaler, device,
    accum_steps, max_grad_norm, log_every, use_amp,
) -> Dict[str, float]:
    model.train()
    optimizer.zero_grad(set_to_none=True)
    total_loss = 0.0
    n_steps = 0
    opt_step = 0

    for batch_idx, batch in enumerate(loader):
        x      = batch["input"].to(device, non_blocking=True)
        anom   = batch["target"].to(device, non_blocking=True)
        t_mask = batch["target_mask"].to(device, non_blocking=True)

        with autocast("cuda", enabled=use_amp):
            pred = model(x)
            loss = loss_fn(pred, anom, mask=t_mask)

        scaler.scale(loss / accum_steps).backward()
        total_loss += loss.item()
        n_steps += 1

        step_done = (batch_idx + 1) % accum_steps == 0
        last_batch = (batch_idx + 1) == len(loader)
        if step_done or last_batch:
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_grad_norm)
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad(set_to_none=True)
            opt_step += 1
            if opt_step % log_every == 0:
                lr = optimizer.param_groups[0]["lr"]
                logger.info("  step=%d loss=%.5f lr=%.2e", opt_step, loss.item(), lr)

    return {"train_loss": total_loss / max(n_steps, 1)}


@torch.no_grad()
def validate(model, loader, device, use_amp, depth_levels) -> Dict[str, Any]:
    model.eval()
    depths = np.array(depth_levels, dtype=float)
    d_sq  = np.zeros(len(depths), dtype=np.float64)
    d_err = np.zeros(len(depths), dtype=np.float64)
    d_n   = np.zeros(len(depths), dtype=np.int64)

    for batch in loader:
        x     = batch["input"].to(device, non_blocking=True)
        t_abs = batch["target_absolute"].cpu().numpy()
        clim  = batch["clim"].cpu().numpy()
        t_msk = batch["target_mask"].cpu().numpy() > 0.5

        with autocast("cuda", enabled=use_amp):
            pred_anom = model(x).float().cpu().numpy()
        pred_abs = pred_anom + clim

        for d in range(len(depths)):
            valid = t_msk[:, d] & np.isfinite(t_abs[:, d]) & np.isfinite(pred_abs[:, d])
            if not valid.any():
                continue
            err = pred_abs[:, d][valid] - t_abs[:, d][valid]
            d_sq[d]  += float((err * err).sum())
            d_err[d] += float(err.sum())
            d_n[d]   += int(valid.sum())

    per_rmse = {float(depths[d]): float(np.sqrt(d_sq[d] / max(d_n[d], 1))) for d in range(len(depths))}
    per_bias = {float(depths[d]): float(d_err[d] / max(d_n[d], 1)) for d in range(len(depths))}

    def band(lo, hi):
        idx = np.where((depths >= lo) & (depths <= hi))[0]
        sq = sum(d_sq[i] for i in idx)
        n  = sum(d_n[i] for i in idx)
        return float(np.sqrt(sq / max(n, 1)))

    return {
        "val_rmse":       float(np.sqrt(d_sq.sum() / max(d_n.sum(), 1))),
        "ml_rmse":        band(0, 50),
        "thermo_rmse":    band(50, 200),
        "deep_rmse":      band(200, 1000),
        "per_depth_rmse": per_rmse,
        "per_depth_bias": per_bias,
    }


def main() -> int:
    cfg = load_cfg()
    set_seeds(int(cfg.get("seed", 42)))
    RUN_DIR.mkdir(parents=True, exist_ok=True)

    device  = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    use_amp = bool(cfg.get("mixed_precision", True)) and device.type == "cuda"
    logger.info("Device: %s  AMP: %s", device, use_amp)

    surface_zarr = ROOT / cfg["data"]["surface_zarr"]
    target_zarr  = ROOT / cfg["data"]["target_zarr"]
    stats_path   = ROOT / cfg["data"]["stats_path"]
    dc_path      = ROOT / cfg["data"]["data_config_path"]

    with open(dc_path, encoding="utf-8") as f:
        dc = yaml.safe_load(f)
    sc = dc["splits"]

    sf = xr.open_zarr(str(surface_zarr))
    splits = make_date_range_split(sf.time.values, sc["train_range"], sc["val_range"], sc["test_range"])
    sf.close()
    logger.info("Split: train=%d val=%d test=%d", len(splits["train"]), len(splits["val"]), len(splits["test"]))

    train_ds = OceanEmbedDataset(surface_zarr, target_zarr, stats_path, indices=splits["train"], mode="train", crop_size=(51, 121))
    val_ds   = OceanEmbedDataset(surface_zarr, target_zarr, stats_path, indices=splits["val"],   mode="eval")

    depth_levels = list(train_ds.depths.astype(float))
    logger.info("Using %d depth levels: %s", len(depth_levels), [f"{d:.1f}" for d in depth_levels])

    bs = int(cfg.get("batch_size", 2))
    nw = int(cfg.get("num_workers", 0))
    pm = bool(cfg.get("pin_memory", True)) and device.type == "cuda"
    train_loader = DataLoader(train_ds, batch_size=bs, shuffle=True, num_workers=nw, pin_memory=pm)
    val_loader   = DataLoader(val_ds, batch_size=int(cfg.get("val_batch_size", 2)), shuffle=False, num_workers=nw, pin_memory=pm)

    model = BaselineModel(in_channels=7, out_depths=len(depth_levels), base_channels=32, encoder_depth=4, dropout=float(cfg.get("dropout", 0.2))).to(device)
    logger.info("BaselineModel params=%d out_depths=%d", sum(p.numel() for p in model.parameters() if p.requires_grad), len(depth_levels))

    loss_fn = WeightedMSELoss(depth_levels).to(device)
    print_weight_profile(depth_levels)

    lr  = float(cfg.get("learning_rate", 5e-4))
    wd  = float(cfg.get("weight_decay", 3e-4))
    oc  = cfg.get("optimizer", {})
    optimizer = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=wd,
                                  betas=tuple(oc.get("betas", [0.9, 0.999])), eps=float(oc.get("eps", 1e-8)))

    n_epochs      = int(cfg.get("n_epochs", 15))
    warmup_epochs = int(cfg.get("warmup_epochs", 3))
    eta_min       = float(cfg.get("min_lr", 1e-6))
    cosine_t      = max(1, n_epochs - warmup_epochs)
    cosine = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=cosine_t, eta_min=eta_min)
    if warmup_epochs > 0:
        warmup = torch.optim.lr_scheduler.LinearLR(optimizer, start_factor=0.01, end_factor=1.0, total_iters=warmup_epochs)
        scheduler = torch.optim.lr_scheduler.SequentialLR(optimizer, schedulers=[warmup, cosine], milestones=[warmup_epochs])
    else:
        scheduler = cosine

    scaler      = GradScaler("cuda", enabled=use_amp)
    accum_steps = int(cfg.get("gradient_accumulation_steps", 4))
    if len(train_loader) < accum_steps:
        accum_steps = 1
    max_grad_norm = float(cfg.get("max_grad_norm", 1.0))
    log_every     = int(cfg.get("log_every_steps", 50))
    patience      = int(cfg.get("early_stopping_patience", 10))

    # Diagnostic depths (from Issue spec) — GLORYS native approximate equivalents
    DIAG_DEPTHS = [47.37, 77.85, 92.33, 130.67, 155.85, 186.13]

    history: List[Dict] = []
    best_val_rmse = float("inf")
    epochs_no_improve = 0
    t_total = time.time()

    for epoch in range(1, n_epochs + 1):
        t0 = time.time()
        logger.info("=== Epoch %d/%d ===", epoch, n_epochs)

        train_m = train_one_epoch(model, train_loader, loss_fn, optimizer, scaler,
                                  device, accum_steps, max_grad_norm, log_every, use_amp)
        val_m   = validate(model, val_loader, device, use_amp, depth_levels)
        scheduler.step()

        elapsed = time.time() - t0
        lr_now  = optimizer.param_groups[0]["lr"]
        logger.info("Epoch %d | train_loss=%.5f | val_rmse=%.4f°C | thermo=%.4f | ml=%.4f | deep=%.4f | lr=%.2e | %.0fs",
                    epoch, train_m["train_loss"], val_m["val_rmse"], val_m["thermo_rmse"],
                    val_m["ml_rmse"], val_m["deep_rmse"], lr_now, elapsed)

        # Per-depth at diagnostic depths
        logger.info("  --- Per-depth at diagnostic depths ---")
        for d in depth_levels:
            if any(abs(d - dd) < 5.0 for dd in DIAG_DEPTHS):
                rmse_d = val_m["per_depth_rmse"].get(d, float("nan"))
                bias_d = val_m["per_depth_bias"].get(d, float("nan"))
                logger.info("    depth=%6.2fm  RMSE=%.4f°C  Bias=%+.4f°C", d, rmse_d, bias_d)

        rec = {"epoch": epoch, "lr": lr_now, "elapsed_s": elapsed, **train_m, **val_m}
        history.append(rec)

        ckpt = {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "val_rmse": val_m["val_rmse"],
            "thermo_rmse": val_m["thermo_rmse"],
            "config": cfg,
            "depth_levels": depth_levels,
        }
        torch.save(ckpt, RUN_DIR / f"checkpoint_epoch_{epoch:02d}.pt")

        if val_m["val_rmse"] < best_val_rmse:
            best_val_rmse = val_m["val_rmse"]
            epochs_no_improve = 0
            torch.save(ckpt, RUN_DIR / "checkpoint_best.pt")
            logger.info("  *** New best val_rmse=%.4f°C (thermo=%.4f°C)", best_val_rmse, val_m["thermo_rmse"])
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                logger.info("Early stopping at epoch %d.", epoch)
                break

        with open(RUN_DIR / "training_log.json", "w") as f:
            json.dump({"run_name": RUN_NAME, "best_val_rmse": best_val_rmse,
                       "depth_levels": depth_levels, "history": history}, f, indent=2)

    logger.info("Done. Total=%.1f min. best_val_rmse=%.4f", (time.time() - t_total) / 60, best_val_rmse)
    train_ds.close()
    val_ds.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
