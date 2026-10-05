"""
OceanEmbed — PyTorch Dataset classes.

Provides:
- OceanEmbedDataset: loads preprocessed samples for training
"""

from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
from torch.utils.data import Dataset

from ocean_embed.grid import (
    DOMAIN, SIH_DEPTHS, make_grid,
    normalize_lat, normalize_lon, normalize_depth, normalize_doy, get_region_id,
)
from ocean_embed.normalization import (
    NormalizationStats,
    load_normalization_stats,
    denormalize_target,
)

logger = logging.getLogger(__name__)


class OceanEmbedDataset(Dataset):
    """PyTorch Dataset for OceanEmbed training.

    Loads preprocessed .npz sample files from data/processed/{split}/.

    Each sample file contains:
        inputs:   (T, 7, H, W)   surface observations, T=temporal window
        masks:    (T, 7, H, W)   validity masks
        target:   (D, H, W)      subsurface temperature at D depths
        lat_grid: (H, W)
        lon_grid: (H, W)
        date:     str
    """

    def __init__(
        self,
        data_dir: Path | str,
        split: str = "train",
        temporal_window: int = 3,
        stats: Optional[NormalizationStats] = None,
        depths: Optional[List[float]] = None,
    ):
        self.data_dir = Path(data_dir) / split
        self.split = split
        self.temporal_window = temporal_window

        if stats is not None:
            self.stats = stats
        else:
            # Auto-detect precomputed stats file to prevent silent fallback to reference stats
            candidate_paths = [
                Path(data_dir) / "normalization_stats_v3.json",
                Path(data_dir).parent / "normalization_stats_v3.json",
                Path(data_dir) / "normalization_stats.json",
                Path(data_dir).parent / "normalization_stats.json",
                Path("data/processed/normalization_stats_v3.json"),
                Path("data/processed/normalization_stats.json"),
                Path("data/interim/normalization_stats.yaml"),
            ]
            loaded_stats = None
            for cp in candidate_paths:
                if cp.exists():
                    try:
                        loaded_stats = NormalizationStats.from_file(cp)
                        logger.info(f"Automatically loaded precomputed normalization stats from {cp}")
                        break
                    except Exception as e:
                        logger.debug(f"Could not load stats from {cp}: {e}")
            if loaded_stats is not None:
                self.stats = loaded_stats
            else:
                logger.warning(
                    "No precomputed normalization statistics file found. "
                    "Falling back to reference statistics (Issue #12). For optimal training performance, "
                    "compute dataset statistics using backend/scripts/compute_normalization_stats.py."
                )
                self.stats = NormalizationStats.from_reference()

        self.depths = depths or SIH_DEPTHS

        if not self.data_dir.exists():
            logger.warning(
                f"Dataset directory {self.data_dir} does not exist. "
                f"Dataset will be empty. Run preprocessing pipeline first."
            )
            self.files: List[Path] = []
        else:
            self.files = sorted(self.data_dir.glob("*.npz"))
            logger.info(f"Found {len(self.files)} samples in {self.data_dir}")

    def __len__(self) -> int:
        return len(self.files)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        f = self.files[idx]
        data = np.load(f, allow_pickle=True)

        inputs = data["inputs"].astype(np.float32)    # (T, 7, H, W)
        masks = data["masks"].astype(np.float32)      # (T, 7, H, W)
        target = data["target"].astype(np.float32)    # (D, H, W)
        lat_grid = data["lat_grid"].astype(np.float32)
        lon_grid = data["lon_grid"].astype(np.float32)

        date_str = str(data.get("date", ""))
        doy = self._date_to_doy(date_str)

        # Normalize surface inputs
        channel_names = ["sst", "sss", "ssh", "current_u", "current_v", "wind_u", "wind_v"]
        for t in range(inputs.shape[0]):
            for c, name in enumerate(channel_names):
                inputs[t, c] = self.stats.normalize(inputs[t, c], name)

        # Normalize target
        target = self.stats.normalize(target, "target_temp")

        # Normalized coordinate grids
        lat_norm = normalize_lat(lat_grid)
        lon_norm = normalize_lon(lon_grid)

        return {
            "inputs": torch.from_numpy(inputs),          # (T, 7, H, W)
            "masks": torch.from_numpy(masks),            # (T, 7, H, W)
            "target": torch.from_numpy(target),          # (D, H, W)
            "lat_norm": torch.from_numpy(lat_norm),      # (H, W)
            "lon_norm": torch.from_numpy(lon_norm),      # (H, W)
            "doy_norm": torch.tensor(doy, dtype=torch.float32),
        }

    @staticmethod
    def _date_to_doy(date_str: str) -> float:
        try:
            import datetime
            d = datetime.datetime.strptime(date_str[:10], "%Y-%m-%d")
            return d.timetuple().tm_yday / 365.25
        except Exception:
            return 0.0


