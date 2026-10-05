"""
OceanEmbed — Compute Normalization Statistics.

Computes channel-wise mean and standard deviation for surface variables
and target depth levels strictly on the training split (2010-01-01 to 2020-12-31)
to guarantee zero data leakage into validation or testing sets.

Usage:
    python backend/scripts/compute_normalization_stats.py \
        --surface-zarr data/processed/surface_features.zarr \
        --target-zarr data/processed/target_glorys.zarr \
        --output-json data/processed/normalization_stats.json \
        --train-start 2010-01-01 --train-end 2020-12-31
"""

from __future__ import annotations

import argparse
from datetime import datetime
import json
import logging
from pathlib import Path
import sys
from typing import Any, Dict, List, Optional

import numpy as np
import yaml

# Add backend directory to sys.path
_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from ocean_embed.grid import SIH_STANDARD_DEPTHS, GLORYS_NATIVE_DEPTHS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("compute_normalization_stats")

SURFACE_VARS = ["analysed_sst", "sos", "sla", "u", "v", "uwnd", "vwnd"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compute channel-wise normalization stats strictly from training data."
    )
    parser.add_argument(
        "--surface-zarr",
        type=str,
        default="data/processed/surface_features.zarr",
        help="Path to surface features zarr store.",
    )
    parser.add_argument(
        "--target-zarr",
        type=str,
        default="data/processed/target_glorys.zarr",
        help="Path to GLORYS target zarr store.",
    )
    parser.add_argument(
        "--data-config",
        type=str,
        default="backend/ocean_embed/configs/data_config.yaml",
        help="Path to data configuration YAML defining splits.",
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default="data/processed/normalization_stats.json",
        help="Output path for computed normalization JSON.",
    )
    parser.add_argument(
        "--train-start",
        type=str,
        default=None,
        help="Override training start date (YYYY-MM-DD).",
    )
    parser.add_argument(
        "--train-end",
        type=str,
        default=None,
        help="Override training end date (YYYY-MM-DD).",
    )
    return parser.parse_args()


def get_train_date_range(args: argparse.Namespace) -> tuple[str, str]:
    """Retrieve train date range from data_config or command line."""
    if args.train_start and args.train_end:
        return args.train_start, args.train_end

    cfg_path = Path(args.data_config)
    if cfg_path.exists():
        with open(cfg_path, encoding="utf-8") as f:
            cfg = yaml.safe_load(f)
        splits = cfg.get("splits", {})
        if "train_range" in splits:
            tr = splits["train_range"]
            return tr[0], tr[1]
        elif "train" in splits:
            return splits["train"]["start"], splits["train"]["end"]

    logger.warning("Data config not found or missing train_range; using default 2010-01-01 to 2020-12-31.")
    return "2010-01-01", "2020-12-31"


def compute_surface_stats(
    surface_zarr_path: Path,
    train_start: str,
    train_end: str,
) -> Dict[str, Dict[str, float]]:
    """Compute mean and std for each surface channel over the training split."""
    import xarray as xr

    logger.info(f"Opening surface features store: {surface_zarr_path}")
    ds = xr.open_zarr(str(surface_zarr_path))

    # Slice strictly to training date range
    logger.info(f"Subsetting surface data to train split: {train_start} to {train_end}")
    ds_train = ds.sel(time=slice(train_start, train_end))
    n_days = len(ds_train.time)
    logger.info(f"Training split contains {n_days} daily surface timesteps.")

    surface_stats: Dict[str, Dict[str, float]] = {}
    for var in SURFACE_VARS:
        if var not in ds_train:
            logger.warning(f"Variable '{var}' not present in surface zarr, skipping.")
            continue

        arr = ds_train[var].values.astype(np.float64)
        valid = arr[np.isfinite(arr)]
        if len(valid) == 0:
            logger.error(f"No finite values found for variable '{var}'!")
            continue

        mean_val = float(np.mean(valid))
        std_val = float(np.std(valid))
        surface_stats[var] = {
            "mean": mean_val,
            "std": std_val,
            "min": float(np.min(valid)),
            "max": float(np.max(valid)),
            "count": int(len(valid)),
        }
        logger.info(f"  [Surface] {var:>12}: mean={mean_val:8.4f}, std={std_val:8.4f}")

    ds.close()
    return surface_stats


def compute_target_stats(
    target_zarr_path: Path,
    train_start: str,
    train_end: str,
) -> List[Dict[str, Any]]:
    """Compute per-depth mean and std for GLORYS target temperature over the training split."""
    import xarray as xr

    logger.info(f"Opening GLORYS target store: {target_zarr_path}")
    ds = xr.open_zarr(str(target_zarr_path))

    logger.info(f"Subsetting target data to train split: {train_start} to {train_end}")
    ds_train = ds.sel(time=slice(train_start, train_end))

    temp_var = "thetao" if "thetao" in ds_train else "temperature"
    if temp_var not in ds_train:
        raise ValueError(f"Target store does not contain 'thetao' or 'temperature' variable.")

    # Determine depth coordinate
    depth_coord = "depth" if "depth" in ds_train.coords else "depth_m"
    depth_values = ds_train[depth_coord].values

    target_stats: List[Dict[str, Any]] = []
    logger.info(f"Computing per-depth stats across {len(depth_values)} levels...")

    for d_idx, depth_m in enumerate(depth_values):
        arr_d = ds_train[temp_var].isel({depth_coord: d_idx}).values.astype(np.float64)
        valid = arr_d[np.isfinite(arr_d)]
        if len(valid) == 0:
            mean_val, std_val = 15.0, 5.0
        else:
            mean_val = float(np.mean(valid))
            std_val = float(np.std(valid))

        target_stats.append({
            "depth_m": float(depth_m),
            "mean": mean_val,
            "std": std_val,
            "min": float(np.min(valid)) if len(valid) > 0 else 0.0,
            "max": float(np.max(valid)) if len(valid) > 0 else 0.0,
            "count": int(len(valid)),
        })
        logger.info(f"  [Depth {float(depth_m):6.1f}m]: mean={mean_val:6.3f}°C, std={std_val:6.3f}°C")

    ds.close()
    return target_stats


def main() -> None:
    args = parse_args()
    train_start, train_end = get_train_date_range(args)
    logger.info(f"Target training date range: {train_start} to {train_end}")

    surf_path = Path(args.surface_zarr)
    target_path = Path(args.target_zarr)
    out_path = Path(args.output_json)

    if not surf_path.exists():
        logger.error(
            f"Surface zarr not found at {surf_path}. "
            f"If training data is stored elsewhere or in cloud, provide via --surface-zarr."
        )
        sys.exit(1)

    surface_stats = compute_surface_stats(surf_path, train_start, train_end)

    if target_path.exists():
        target_stats = compute_target_stats(target_path, train_start, train_end)
    else:
        logger.warning(
            f"Target zarr not found at {target_path}. Target stats will be omitted or loaded from existing."
        )
        target_stats = []

    result = {
        "surface": surface_stats,
        "target": target_stats,
        "metadata": {
            "train_start": train_start,
            "train_end": train_end,
            "surface_store": str(surf_path),
            "target_store": str(target_path) if target_path.exists() else None,
            "computed_at": datetime.utcnow().isoformat() + "Z",
        },
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)

    logger.info(f"Successfully saved computed normalization stats to {out_path}!")


if __name__ == "__main__":
    main()
