"""One-off verification: loss scaling and model output sanity (Phase 4 prep)."""
from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
import yaml
import xarray as xr
from torch.utils.data import DataLoader

from ocean_embed.data import (
    OceanEmbedDataset,
    denormalize_target,
    load_normalization_stats,
    make_temporal_split,
)
from ocean_embed.grid import SIH_DEPTHS
from ocean_embed.models.ocean_embed import OceanEmbedModel
from ocean_embed.training.losses import OceanEmbedLoss
from ocean_embed.training.trainer import batch_to_model_inputs


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    with open(root / "backend/ocean_embed/configs/training_config.yaml", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    with open(root / "backend/ocean_embed/configs/model_config.yaml", encoding="utf-8") as f:
        model_cfg = yaml.safe_load(f)

    loss_cfg = cfg["loss"]
    print("=" * 60)
    print("CHECK 2 — Loss scale comparison")
    print("=" * 60)
    print("Loss config from training_config.yaml:", loss_cfg)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    sf = xr.open_zarr(str(root / "data/processed/surface_features.zarr"))
    times = sf.time.values
    sf.close()
    splits = make_temporal_split(times, 0.70, 0.15, 0.15)
    stats_path = root / "data/processed/normalization_stats.json"
    stats = load_normalization_stats(stats_path)
    val_ds = OceanEmbedDataset(
        root / "data/processed/surface_features.zarr",
        root / "data/processed/target_glorys.zarr",
        stats_path,
        indices=splits["val"],
    )
    val_loader = DataLoader(val_ds, batch_size=2, shuffle=False, num_workers=0)
    batch = next(iter(val_loader))

    arch = model_cfg["architecture"]
    enc = arch["encoder"]
    dec = arch["depth_decoder"]
    reg = arch["regional"]
    model = OceanEmbedModel(
        temporal_window=1,
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
    ).to(device)

    loss_fn = OceanEmbedLoss(
        use_uncertainty=loss_cfg.get("use_uncertainty", True),
        thermocline_weight=float(loss_cfg.get("thermocline_weight", 0.01)),
        thermocline_temperature=float(loss_cfg.get("thermocline_temperature", 1.0)),
        thermocline_use_soft_argmax=bool(loss_cfg.get("thermocline_use_soft_argmax", True)),
        depth_smooth_weight=float(loss_cfg.get("depth_smooth_weight", 0.001)),
    )
    depths_t = torch.tensor(SIH_DEPTHS, dtype=torch.float32, device=device)

    inputs, masks, lat_norm, lon_norm, doy_norm, target = batch_to_model_inputs(batch, 1, device)

    torch.manual_seed(0)
    rand_inputs = torch.randn_like(inputs) * 0.5
    rand_masks = torch.ones_like(masks)

    model.eval()
    with torch.no_grad():
        out = model(rand_inputs, rand_masks, lat_norm, lon_norm, doy_norm, depths=SIH_DEPTHS)
        pred_mean = out["means"]
        pred_log_var = out["log_vars"]

    zeros_mean = torch.zeros_like(target)
    zeros_log_var = torch.zeros_like(pred_log_var)

    def total_loss(mean, log_var, tgt, label: str) -> float:
        d = loss_fn(pred_mean=mean, pred_log_var=log_var, target=tgt, depths=depths_t)
        print(f"\n--- {label} ---")
        for k, v in d.items():
            print(f"  {k}: {v.item():.6f}")
        return d["total"].item()

    a = total_loss(pred_mean, pred_log_var, target, "a) model(random input) vs target")
    b = total_loss(zeros_mean, zeros_log_var, target, "b) constant-zero mean vs target")
    c = total_loss(target, pred_log_var, target, "c) target vs target (mean=target)")

    print("\nSummary totals:")
    print(f"  loss(model_output, target) = {a:.6f}")
    print(f"  loss(zeros, target)        = {b:.6f}")
    print(f"  loss(target, target)       = {c:.6f}")

    print("\n" + "=" * 60)
    print("CHECK 3 — Model output statistics (real batch, eval)")
    print("=" * 60)
    real_inputs, real_masks, lat_norm, lon_norm, doy_norm, target = batch_to_model_inputs(
        batch, 1, device
    )
    with torch.no_grad():
        out_real = model(real_inputs, real_masks, lat_norm, lon_norm, doy_norm, depths=SIH_DEPTHS)
    means = out_real["means"]
    print("output['means'] (normalized):")
    print(
        f"  mean={means.mean().item():.6f} std={means.std().item():.6f} "
        f"min={means.min().item():.6f} max={means.max().item():.6f}"
    )
    print("target (normalized):")
    print(
        f"  mean={target.mean().item():.6f} std={target.std().item():.6f} "
        f"min={target.min().item():.6f} max={target.max().item():.6f}"
    )
    lv = out_real["log_vars"]
    print("output['log_vars']:")
    print(
        f"  mean={lv.mean().item():.6f} std={lv.std().item():.6f} "
        f"min={lv.min().item():.6f} max={lv.max().item():.6f}"
    )

    print("\n" + "=" * 60)
    print("CHECK 4 — Target denormalization (val batch)")
    print("=" * 60)
    t_norm = target.cpu().numpy()
    t_phys = denormalize_target(t_norm, stats)
    print("denormalized target (°C):")
    print(
        f"  mean={t_phys.mean():.4f} std={t_phys.std():.4f} "
        f"min={t_phys.min():.4f} max={t_phys.max():.4f}"
    )
    depth_means = [float(t_phys[:, d].mean()) for d in range(t_phys.shape[1])]
    print(f"  per-depth mean °C (depths {SIH_DEPTHS}): {depth_means}")
    valid = t_phys[np.isfinite(t_phys)]
    print(f"  finite fraction: {valid.size / t_phys.size:.4f}")
    in_range = np.sum((valid >= 5) & (valid <= 30))
    print(f"  fraction in [5, 30]°C: {in_range / valid.size:.4f}")

    val_ds.close()


if __name__ == "__main__":
    main()
