"""
OceanEmbed — Training loop with AMP, gradient accumulation, and checkpointing.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
from torch.amp import GradScaler, autocast
from torch.utils.data import DataLoader

from ocean_embed.data.normalization import denormalize_target
from ocean_embed.evaluation.metrics import compute_all_metrics, rmse
from ocean_embed.grid import SIH_DEPTHS

logger = logging.getLogger(__name__)

VAL_DEPTH_BANDS_DEFAULT = {
    "ML_0-50m": (0, 50),
    "thermocline_50-200m": (50, 200),
    "deep_200-1000m": (200, 1000),
}


def batch_to_model_inputs(
    batch: Dict[str, torch.Tensor],
    temporal_window: int,
    device: torch.device,
) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
    """Collated dataset batch → model tensors with temporal dimension T."""
    inputs = batch["input"].unsqueeze(1)
    masks = batch["masks"].unsqueeze(1)
    if temporal_window != 1:
        raise ValueError(
            f"Only temporal_window=1 is supported in Phase 3; got {temporal_window}"
        )

    lat_norm = batch["lat_norm"].to(device, non_blocking=True)
    lon_norm = batch["lon_norm"].to(device, non_blocking=True)
    doy_norm = batch["doy_norm"].to(device, non_blocking=True)
    target = batch["target"].to(device, non_blocking=True)
    inputs = inputs.to(device, non_blocking=True)
    masks = masks.to(device, non_blocking=True)
    return inputs, masks, lat_norm, lon_norm, doy_norm, target


class Trainer:
    """Mixed-precision trainer with accumulation, checkpointing, and early stopping."""

    def __init__(
        self,
        config: Dict[str, Any],
        model: torch.nn.Module,
        loss_fn: torch.nn.Module,
        train_loader: DataLoader,
        val_loader: DataLoader,
        device: torch.device,
        optimizer: torch.optim.Optimizer,
        scheduler: Optional[torch.optim.lr_scheduler._LRScheduler] = None,
        norm_stats: Optional[Dict] = None,
        run_dir: Optional[Path] = None,
    ) -> None:
        self.config = config
        self.model = model
        self.loss_fn = loss_fn
        self.train_loader = train_loader
        self.val_loader = val_loader
        self.device = device
        self.optimizer = optimizer
        self.scheduler = scheduler
        self.norm_stats = norm_stats or {}

        run_name = config.get("run_name", "default_run")
        self.run_dir = Path(run_dir or Path("runs") / run_name)
        self.run_dir.mkdir(parents=True, exist_ok=True)

        self.temporal_window = int(config.get("temporal_window", 1))
        self.accum_steps = int(config.get("gradient_accumulation_steps", 4))
        self.max_grad_norm = float(config.get("max_grad_norm", 1.0))
        self.log_every = int(config.get("log_every_steps", 10))
        self.checkpoint_every = int(config.get("checkpoint_every", 5))
        self.patience = int(config.get("early_stopping_patience", 10))
        self.use_amp = bool(config.get("mixed_precision", True)) and device.type == "cuda"

        self.scaler = GradScaler("cuda", enabled=self.use_amp)
        self.depths_tensor = torch.tensor(SIH_DEPTHS, dtype=torch.float32, device=device)

        bands_cfg = config.get("val_depth_bands", {})
        self.val_depth_bands: List[Tuple[str, float, float]] = []
        if isinstance(bands_cfg, dict):
            for name, bounds in bands_cfg.items():
                if isinstance(bounds, (list, tuple)) and len(bounds) == 2:
                    self.val_depth_bands.append((name, float(bounds[0]), float(bounds[1])))
        if not self.val_depth_bands:
            self.val_depth_bands = [
                (k, lo, hi) for k, (lo, hi) in VAL_DEPTH_BANDS_DEFAULT.items()
            ]

        self.history: List[Dict[str, Any]] = []
        self.best_val_loss = float("inf")
        self.epochs_without_improvement = 0
        self.start_epoch = 0
        self.global_step = 0
        self.peak_vram_gb = 0.0

    def _update_peak_vram(self) -> None:
        if self.device.type == "cuda":
            self.peak_vram_gb = max(
                self.peak_vram_gb,
                torch.cuda.max_memory_allocated() / (1024 ** 3),
            )

    def _forward_loss(
        self,
        batch: Dict[str, torch.Tensor],
    ) -> Tuple[torch.Tensor, Dict[str, torch.Tensor], torch.Tensor, torch.Tensor]:
        inputs, masks, lat_norm, lon_norm, doy_norm, target = batch_to_model_inputs(
            batch, self.temporal_window, self.device
        )
        with autocast("cuda", enabled=self.use_amp):
            output = self.model(
                inputs=inputs,
                masks=masks,
                lat_norm=lat_norm,
                lon_norm=lon_norm,
                doy_norm=doy_norm,
                depths=SIH_DEPTHS,
            )
            loss_dict = self.loss_fn(
                pred_mean=output["means"],
                pred_log_var=output["log_vars"],
                target=target,
                depths=self.depths_tensor,
            )
        return loss_dict["total"], loss_dict, output["means"], target

    @staticmethod
    def _append_preds(
        pred_list: List[np.ndarray],
        targ_list: List[np.ndarray],
        pred_norm: torch.Tensor,
        targ_norm: torch.Tensor,
    ) -> None:
        pred_list.append(pred_norm.detach().float().cpu().numpy())
        targ_list.append(targ_norm.detach().float().cpu().numpy())

    def _metrics_from_accumulated(
        self,
        pred_list: List[np.ndarray],
        targ_list: List[np.ndarray],
    ) -> Dict[str, Any]:
        if not pred_list:
            return {"rmse": float("nan"), "mae": float("nan")}

        pred = np.concatenate(pred_list, axis=0)
        targ = np.concatenate(targ_list, axis=0)
        pred_c = denormalize_target(pred, self.norm_stats)
        targ_c = denormalize_target(targ, self.norm_stats)
        overall = compute_all_metrics(pred_c, targ_c, stats=None)

        rmse_per_depth: Dict[float, float] = {}
        for d_idx, z in enumerate(SIH_DEPTHS):
            rmse_per_depth[float(z)] = rmse(
                pred_c[:, d_idx].ravel(),
                targ_c[:, d_idx].ravel(),
            )

        val_depth_bands: Dict[str, Dict[str, float]] = {}
        depths_arr = np.array(SIH_DEPTHS, dtype=float)
        for name, lo, hi in self.val_depth_bands:
            idx = np.where((depths_arr >= lo) & (depths_arr <= hi))[0]
            if len(idx) == 0:
                continue
            val_depth_bands[name] = compute_all_metrics(
                pred_c[:, idx].ravel(),
                targ_c[:, idx].ravel(),
                stats=None,
            )

        return {
            **overall,
            "val_depth_bands": val_depth_bands,
            "rmse_per_depth": rmse_per_depth,
        }

    def train_epoch(self) -> Dict[str, float]:
        self.model.train()
        if self.device.type == "cuda":
            torch.cuda.reset_peak_memory_stats()

        running_loss = 0.0
        n_loss_steps = 0
        loss_start: Optional[float] = None
        loss_end: Optional[float] = None
        pred_chunks: List[np.ndarray] = []
        targ_chunks: List[np.ndarray] = []

        self.optimizer.zero_grad(set_to_none=True)
        for batch_idx, batch in enumerate(self.train_loader):
            loss, _loss_dict, pred_mean, target = self._forward_loss(batch)
            if loss_start is None:
                loss_start = loss.item()
            loss_end = loss.item()
            loss_scaled = loss / self.accum_steps
            self.scaler.scale(loss_scaled).backward()

            running_loss += loss.item()
            n_loss_steps += 1
            self._append_preds(pred_chunks, targ_chunks, pred_mean, target)

            step_done = (batch_idx + 1) % self.accum_steps == 0
            last_batch = batch_idx + 1 == len(self.train_loader)
            if step_done or last_batch:
                self.scaler.unscale_(self.optimizer)
                grad_norm = torch.nn.utils.clip_grad_norm_(
                    self.model.parameters(), self.max_grad_norm
                )
                self.scaler.step(self.optimizer)
                self.scaler.update()
                self.optimizer.zero_grad(set_to_none=True)
                self.global_step += 1
                self._update_peak_vram()

                if self.global_step % self.log_every == 0:
                    lr = self.optimizer.param_groups[0]["lr"]
                    vram = (
                        torch.cuda.memory_allocated() / (1024 ** 3)
                        if self.device.type == "cuda"
                        else 0.0
                    )
                    logger.info(
                        "step=%d loss=%.4f lr=%.2e grad_norm=%.4f vram_gb=%.3f",
                        self.global_step,
                        loss.item(),
                        lr,
                        float(grad_norm),
                        vram,
                    )

        train_metrics = self._metrics_from_accumulated(pred_chunks, targ_chunks)
        mean_loss = running_loss / max(n_loss_steps, 1)
        return {
            "loss": mean_loss,
            "loss_start": loss_start if loss_start is not None else mean_loss,
            "loss_end": loss_end if loss_end is not None else mean_loss,
            "rmse": train_metrics["rmse"],
            "mae": train_metrics["mae"],
        }

    @torch.no_grad()
    def validate(self) -> Dict[str, Any]:
        self.model.eval()
        running_loss = 0.0
        n_batches = 0
        pred_chunks: List[np.ndarray] = []
        targ_chunks: List[np.ndarray] = []

        for batch in self.val_loader:
            loss, _, pred_mean, target = self._forward_loss(batch)
            running_loss += loss.item()
            n_batches += 1
            self._append_preds(pred_chunks, targ_chunks, pred_mean, target)

        metrics = self._metrics_from_accumulated(pred_chunks, targ_chunks)
        metrics["loss"] = running_loss / max(n_batches, 1)
        return metrics

    def save_checkpoint(
        self,
        path: Path,
        epoch: int,
        best_val: float,
        tag: str = "",
    ) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "epoch": epoch,
            "model_state_dict": self.model.state_dict(),
            "optimizer_state_dict": self.optimizer.state_dict(),
            "scheduler_state_dict": self.scheduler.state_dict() if self.scheduler else None,
            "scaler_state_dict": self.scaler.state_dict(),
            "best_val_loss": best_val,
            "global_step": self.global_step,
            "config": self.config,
            "history": self.history,
            "tag": tag,
        }
        torch.save(payload, path)
        logger.info("Saved checkpoint → %s", path)

    def load_checkpoint(self, path: Path) -> int:
        ckpt = torch.load(path, map_location=self.device, weights_only=False)
        self.model.load_state_dict(ckpt["model_state_dict"])
        self.optimizer.load_state_dict(ckpt["optimizer_state_dict"])
        if self.scheduler and ckpt.get("scheduler_state_dict"):
            self.scheduler.load_state_dict(ckpt["scheduler_state_dict"])
        if ckpt.get("scaler_state_dict"):
            self.scaler.load_state_dict(ckpt["scaler_state_dict"])
        self.best_val_loss = float(ckpt.get("best_val_loss", self.best_val_loss))
        self.history = ckpt.get("history", [])
        self.global_step = int(ckpt.get("global_step", 0))
        start = int(ckpt["epoch"]) + 1
        self.start_epoch = start
        logger.info("Resumed from %s at epoch %d", path, start)
        return start

    def _save_metrics_json(self) -> None:
        out = self.run_dir / "metrics.json"

        def _json_safe(obj: Any) -> Any:
            if isinstance(obj, dict):
                return {str(k): _json_safe(v) for k, v in obj.items()}
            if isinstance(obj, (list, tuple)):
                return [_json_safe(v) for v in obj]
            if isinstance(obj, (np.floating, np.integer)):
                return float(obj)
            return obj

        payload = _json_safe({"history": self.history, "peak_vram_gb": self.peak_vram_gb})
        with open(out, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2)
        logger.info("Wrote metrics → %s", out)

    def _plot_rmse_vs_depth(self, rmse_per_depth: Dict[float, float]) -> None:
        depths = sorted(rmse_per_depth.keys())
        rmses = [rmse_per_depth[z] for z in depths]
        fig, ax = plt.subplots(figsize=(8, 5))
        ax.plot(depths, rmses, marker="o")
        ax.set_xlabel("Depth (m)")
        ax.set_ylabel("RMSE (°C)")
        ax.set_title("Validation RMSE vs depth")
        ax.grid(True, alpha=0.3)
        out = self.run_dir / "rmse_vs_depth.png"
        fig.savefig(out, dpi=120, bbox_inches="tight")
        plt.close(fig)
        logger.info("Wrote RMSE plot → %s", out)

    def fit(self, n_epochs: int) -> List[Dict[str, Any]]:
        t0 = time.perf_counter()
        if self.device.type == "cuda":
            torch.cuda.reset_peak_memory_stats()

        for epoch in range(self.start_epoch, n_epochs):
            epoch_t0 = time.perf_counter()
            train_m = self.train_epoch()
            val_m = self.validate()
            if self.scheduler is not None and self.global_step > 0:
                self.scheduler.step()

            record = {
                "epoch": epoch,
                "train": train_m,
                "val": {
                    "loss": val_m["loss"],
                    "rmse": val_m["rmse"],
                    "mae": val_m["mae"],
                    "bias": val_m.get("bias"),
                    "pearson_r": val_m.get("pearson_r"),
                    "r2": val_m.get("r2"),
                    "val_depth_bands": val_m.get("val_depth_bands", {}),
                    "rmse_per_depth": val_m.get("rmse_per_depth", {}),
                },
            }
            self.history.append(record)

            logger.info(
                "epoch=%d train_loss=%.4f train_rmse=%.4f°C val_loss=%.4f val_rmse=%.4f°C (%.1fs)",
                epoch,
                train_m["loss"],
                train_m["rmse"],
                val_m["loss"],
                val_m["rmse"],
                time.perf_counter() - epoch_t0,
            )
            for band_name, band_m in val_m.get("val_depth_bands", {}).items():
                logger.info("  val band %s: rmse=%.4f°C", band_name, band_m.get("rmse", float("nan")))

            self.save_checkpoint(
                self.run_dir / "checkpoint_last.pt",
                epoch=epoch,
                best_val=self.best_val_loss,
                tag="last",
            )

            if val_m["loss"] < self.best_val_loss:
                self.best_val_loss = val_m["loss"]
                self.epochs_without_improvement = 0
                self.save_checkpoint(
                    self.run_dir / "checkpoint_best.pt",
                    epoch=epoch,
                    best_val=self.best_val_loss,
                    tag="best",
                )
            else:
                self.epochs_without_improvement += 1

            if (epoch + 1) % self.checkpoint_every == 0:
                self.save_checkpoint(
                    self.run_dir / f"checkpoint_epoch_{epoch + 1:03d}.pt",
                    epoch=epoch,
                    best_val=self.best_val_loss,
                    tag=f"epoch_{epoch + 1}",
                )

            self._save_metrics_json()

            if self.epochs_without_improvement >= self.patience:
                logger.info("Early stopping at epoch %d (patience=%d)", epoch, self.patience)
                break

        if self.history:
            last_rmse = self.history[-1]["val"].get("rmse_per_depth") or {}
            if last_rmse:
                self._plot_rmse_vs_depth({float(k): v for k, v in last_rmse.items()})

        self.save_checkpoint(
            self.run_dir / "checkpoint_final.pt",
            epoch=self.history[-1]["epoch"] if self.history else n_epochs - 1,
            best_val=self.best_val_loss,
            tag="final",
        )
        self._save_metrics_json()
        logger.info(
            "Training finished in %.1fs peak_vram=%.3f GB",
            time.perf_counter() - t0,
            self.peak_vram_gb,
        )
        return self.history
