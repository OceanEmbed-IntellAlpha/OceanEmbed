"""
Verification script for anomaly prediction reformulating.
Tests sample shapes, dtypes, NaN handling, zero-anomaly prediction climatology RMSE, and model forward pass.
"""

from __future__ import annotations

import sys
from pathlib import Path
import numpy as np
import torch
import yaml
import xarray as xr

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from ocean_embed.data import OceanEmbedDataset
from ocean_embed.data.splits import make_date_range_split
from ocean_embed.models.ocean_embed import OceanEmbedModel
from ocean_embed.training.train import build_model_from_config, load_training_config
from ocean_embed.training.trainer import batch_to_model_inputs, Trainer
from ocean_embed.evaluation.metrics import compute_all_metrics, rmse


def verify():
    project_root = Path(__file__).resolve().parents[2]
    surface_zarr = project_root / "data" / "processed" / "surface_features.zarr"
    target_zarr = project_root / "data" / "processed" / "target_glorys.zarr"
    clim_zarr = project_root / "data" / "processed" / "climatology_2010_2020.zarr"
    stats_path = project_root / "data" / "processed" / "normalization_stats_v3.json"
    dc_path = project_root / "backend" / "ocean_embed" / "configs" / "data_config.yaml"

    print("=== 1. Checking dataset shapes & dtypes ===")
    sf = xr.open_zarr(surface_zarr)
    times = sf.time.values
    sf.close()

    with open(dc_path, encoding="utf-8") as f:
        dc = yaml.safe_load(f)
    sc = dc.get("splits", {})
    splits = make_date_range_split(times, sc["train_range"], sc["val_range"], sc["test_range"])

    ds_val = OceanEmbedDataset(
        surface_zarr, target_zarr, stats_path, indices=splits["val"], mode="eval"
    )

    sample = ds_val[0]
    print("Sample keys:", list(sample.keys()))
    print("Input shape:", sample["input"].shape, sample["input"].dtype, "NaNs:", torch.isnan(sample["input"]).any().item())
    print("Target anomaly shape:", sample["target"].shape, sample["target"].dtype, "NaNs:", torch.isnan(sample["target"]).any().item())
    print("Target absolute shape:", sample["target_absolute"].shape, sample["target_absolute"].dtype, "NaNs:", torch.isnan(sample["target_absolute"]).any().item())
    print("Climatology shape:", sample["clim"].shape, sample["clim"].dtype, "NaNs:", torch.isnan(sample["clim"]).any().item())
    print("Target mask shape:", sample["target_mask"].shape, sample["target_mask"].dtype)

    # Check relationship target_anomaly = target_absolute - clim
    expected_anom = (sample["target_absolute"] - sample["clim"]) * sample["target_mask"]
    diff = torch.abs(sample["target"] - expected_anom).max().item()
    print(f"Max abs diff between target_anomaly and (target_abs - clim): {diff:.6f}")
    assert diff < 1e-4, f"Target anomaly mismatch: {diff}"

    print("\n=== 2. Verifying Zero-Anomaly prediction climatology RMSE on Val split (2021) ===")
    val_loader = torch.utils.data.DataLoader(ds_val, batch_size=4, shuffle=False)
    
    sq_err_sum = 0.0
    valid_count = 0
    
    for i, batch in enumerate(val_loader):
        if i >= 5:  # Evaluate 5 batches (20 samples) for verification
            break
        # Zero anomaly prediction: pred_anom = 0
        pred_anom = torch.zeros_like(batch["target"])
        clim = batch["clim"]
        target_abs = batch["target_absolute"]
        mask = batch["target_mask"]
        
        final_pred = clim + pred_anom  # = clim
        
        valid = (mask == 1.0) & torch.isfinite(target_abs)
        diff = (final_pred - target_abs)[valid]
        sq_err_sum += torch.sum(diff ** 2).item()
        valid_count += valid.sum().item()

    val_zero_rmse = np.sqrt(sq_err_sum / valid_count)
    print(f"Zero anomaly prediction Val RMSE (20 samples): {val_zero_rmse:.4f} °C (valid points: {valid_count})")

    print("\n=== 3. Dry-run model forward pass ===")
    cfg = load_training_config(project_root / "backend" / "ocean_embed" / "configs" / "training_config.yaml")
    model = build_model_from_config(cfg)
    model.eval()
    
    val_sample_batch = next(iter(val_loader))
    inputs, masks, lat, lon, doy, target_anom, target_abs, clim, target_mask = batch_to_model_inputs(val_sample_batch, 1, torch.device("cpu"))
    
    out = model(inputs=inputs, masks=masks, lat_norm=lat, lon_norm=lon, doy_norm=doy, depths=ds_val.depths)
    pred_anom = out["means"]
    print("Model output shape:", pred_anom.shape, "mean:", pred_anom.mean().item(), "std:", pred_anom.std().item())

    ds_val.close()
    print("\nALL VERIFICATION CHECKS PASSED!")


if __name__ == "__main__":
    verify()
