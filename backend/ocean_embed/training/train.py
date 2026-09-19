"""
OceanEmbed — CLI training entry point.

Usage:
    python backend/ocean_embed/training/train.py \\
        --config backend/ocean_embed/configs/training_config.yaml
"""

from __future__ import annotations

import argparse
import logging
import random
import sys
from pathlib import Path
from typing import Any, Dict

import numpy as np
import torch
import yaml
import xarray as xr
from torch.utils.data import DataLoader

# Ensure backend/ is on sys.path when run as a script
_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from ocean_embed.data import OceanEmbedDataset, load_normalization_stats, make_temporal_split
from ocean_embed.models.ocean_embed import OceanEmbedModel
from ocean_embed.training.losses import OceanEmbedLoss
from ocean_embed.training.trainer import Trainer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("train")


def find_project_root() -> Path:
    candidates = [
        Path(__file__).resolve().parents[3],
        Path.cwd(),
        Path.cwd().parent,
    ]
    for root in candidates:
        if (root / "data" / "processed" / "surface_features.zarr").exists():
            return root
    return Path(__file__).resolve().parents[3]


def load_training_config(config_path: Path) -> Dict[str, Any]:
    with open(config_path, encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    config_dir = config_path.parent
    model_section = cfg.get("model") or {}
    model_path = model_section.get("config_path")
    if model_path:
        mp = config_dir / model_path
        with open(mp, encoding="utf-8") as f:
            model_cfg = yaml.safe_load(f)
        cfg["_model_yaml"] = model_cfg
    else:
        cfg["_model_yaml"] = model_section

    return cfg


def set_seeds(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)


def log_device_info(device: torch.device) -> None:
    logger.info("Device: %s", device)
    if device.type == "cuda":
        free, total = torch.cuda.mem_get_info()
        logger.info(
            "VRAM total=%.2f GB free=%.2f GB",
            total / (1024 ** 3),
            free / (1024 ** 3),
        )


def maybe_reduce_batch_for_vram(cfg: Dict[str, Any]) -> None:
    if not torch.cuda.is_available():
        return
    free, _total = torch.cuda.mem_get_info()
    free_gb = free / (1024 ** 3)
    if free_gb < 3.0 and int(cfg.get("batch_size", 2)) > 1:
        logger.warning(
            "VRAM free %.2f GB < 3 GB — reducing batch_size from %s to 1",
            free_gb,
            cfg.get("batch_size"),
        )
        cfg["batch_size"] = 1


def build_model_from_config(cfg: Dict[str, Any]) -> OceanEmbedModel:
    model_cfg = cfg["_model_yaml"]
    tw = int(cfg.get("temporal_window", 1))
    arch = model_cfg.get("architecture", {})
    enc = arch.get("encoder", {})
    dec = arch.get("depth_decoder", {})
    reg = arch.get("regional", {})
    return OceanEmbedModel(
        temporal_window=tw,
        n_surface_channels=7,
        use_masks=arch.get("masks", {}).get("enabled", True),
        use_coords=True,
        base_channels=enc.get("base_channels", 32),
        encoder_depth=enc.get("depth", 4),
        latent_dim=arch.get("latent_dim", 128),
        n_fourier_freqs=dec.get("fourier_frequencies", 16),
        decoder_hidden=tuple(dec.get("hidden_dims", [256, 256, 128])),
        n_regions=len(reg.get("regions", ["arabian_sea", "bay_of_bengal", "open_ocean"])),
        region_embed_dim=reg.get("embedding_dim", 16),
        dropout=enc.get("dropout", 0.1),
        max_depth=float(model_cfg.get("max_depth", 1000.0)),
    )


def dry_run_forward(model: OceanEmbedModel, batch: Dict[str, torch.Tensor], device: torch.device, tw: int) -> None:
    from ocean_embed.training.trainer import batch_to_model_inputs
    from ocean_embed.grid import SIH_DEPTHS

    model.eval()
    with torch.no_grad():
        inputs, masks, lat_norm, lon_norm, doy_norm, _ = batch_to_model_inputs(
            batch, tw, device
        )
        out = model(
            inputs=inputs,
            masks=masks,
            lat_norm=lat_norm,
            lon_norm=lon_norm,
            doy_norm=doy_norm,
            depths=SIH_DEPTHS,
        )
    logger.info("Dry-run forward OK — input %s → means %s", tuple(inputs.shape), tuple(out["means"].shape))


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train OceanEmbed")
    p.add_argument(
        "--config",
        type=str,
        default="backend/ocean_embed/configs/training_config.yaml",
        help="Path to training YAML config",
    )
    p.add_argument("--resume", type=str, default=None, help="Checkpoint path to resume from")
    p.add_argument("--max_epochs", type=int, default=None, help="Override n_epochs from config")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    project_root = find_project_root()
    config_path = Path(args.config)
    if not config_path.is_absolute():
        config_path = project_root / config_path

    cfg = load_training_config(config_path)
    n_epochs = int(args.max_epochs if args.max_epochs is not None else cfg.get("n_epochs", 50))
    seed = int(cfg.get("seed", 42))
    set_seeds(seed)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    log_device_info(device)
    maybe_reduce_batch_for_vram(cfg)

    data_cfg = cfg.get("data", {})
    surface_zarr = project_root / data_cfg.get("surface_zarr", "data/processed/surface_features.zarr")
    target_zarr = project_root / data_cfg.get("target_zarr", "data/processed/target_glorys.zarr")
    stats_path = project_root / data_cfg.get("stats_path", "data/processed/normalization_stats.json")

    sf = xr.open_zarr(str(surface_zarr))
    times = sf.time.values
    sf.close()

    splits = make_temporal_split(
        times,
        train_frac=float(data_cfg.get("train_frac", 0.70)),
        val_frac=float(data_cfg.get("val_frac", 0.15)),
        test_frac=float(data_cfg.get("test_frac", 0.15)),
    )

    train_ds = OceanEmbedDataset(surface_zarr, target_zarr, stats_path, indices=splits["train"])
    val_ds = OceanEmbedDataset(surface_zarr, target_zarr, stats_path, indices=splits["val"])
    logger.info("Dataset sizes: train=%d val=%d", len(train_ds), len(val_ds))

    batch_size = int(cfg.get("batch_size", 2))
    val_batch_size = int(cfg.get("val_batch_size", batch_size))
    num_workers = int(cfg.get("num_workers", 0))
    pin_memory = bool(cfg.get("pin_memory", True)) and device.type == "cuda"

    train_loader = DataLoader(
        train_ds,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=False,
    )

    steps_per_epoch = max(1, len(train_loader))
    accum = int(cfg.get("gradient_accumulation_steps", 4))
    if steps_per_epoch < accum:
        logger.warning(
            "Only %d train step(s)/epoch (< gradient_accumulation_steps=%d); "
            "using accumulation=1 so weights update every batch.",
            steps_per_epoch,
            accum,
        )
        cfg["gradient_accumulation_steps"] = 1
    val_loader = DataLoader(
        val_ds,
        batch_size=val_batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=pin_memory,
        persistent_workers=False,
    )

    model = build_model_from_config(cfg).to(device)
    logger.info("Model parameters: %d", model.count_parameters())

    sample_batch = next(iter(train_loader))
    dry_run_forward(model, sample_batch, device, int(cfg.get("temporal_window", 1)))

    loss_cfg = cfg.get("loss", {})
    loss_fn = OceanEmbedLoss(
        use_uncertainty=bool(loss_cfg.get("use_uncertainty", True)),
        thermocline_weight=float(loss_cfg.get("thermocline_weight", 0.01)),
        thermocline_temperature=float(loss_cfg.get("thermocline_temperature", 1.0)),
        thermocline_use_soft_argmax=bool(loss_cfg.get("thermocline_use_soft_argmax", True)),
        depth_smooth_weight=float(loss_cfg.get("depth_smooth_weight", 0.001)),
    )

    lr = float(cfg.get("learning_rate", 1e-3))
    wd = float(cfg.get("weight_decay", 1e-4))
    opt_cfg = cfg.get("optimizer", {})
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=lr,
        weight_decay=wd,
        betas=tuple(opt_cfg.get("betas", [0.9, 0.999])),
        eps=float(opt_cfg.get("eps", 1e-8)),
    )

    sched_cfg = cfg.get("scheduler", {})
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer,
        T_max=n_epochs,
        eta_min=float(sched_cfg.get("eta_min", 1e-6)),
    )

    norm_stats = load_normalization_stats(stats_path)
    run_dir = project_root / "runs" / cfg.get("run_name", "default_run")

    trainer = Trainer(
        config=cfg,
        model=model,
        loss_fn=loss_fn,
        train_loader=train_loader,
        val_loader=val_loader,
        device=device,
        optimizer=optimizer,
        scheduler=scheduler,
        norm_stats=norm_stats,
        run_dir=run_dir,
    )

    if args.resume:
        resume_path = Path(args.resume)
        if not resume_path.is_absolute():
            resume_path = project_root / resume_path
        trainer.load_checkpoint(resume_path)

    trainer.fit(n_epochs=n_epochs)
    train_ds.close()
    val_ds.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
