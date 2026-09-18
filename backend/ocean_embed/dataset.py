"""
OceanEmbed — PyTorch Dataset classes.

Provides:
- OceanEmbedDataset: loads preprocessed samples for training
- DemoDataset: generates deterministic synthetic samples for software testing

IMPORTANT: DemoDataset data is never used as scientific evidence.
All synthetic outputs are labelled DEMO/SYNTHETIC.
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
from ocean_embed.normalization import NormalizationStats

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
        self.stats = stats or NormalizationStats.from_reference()
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


class DemoDataset(Dataset):
    """Synthetic dataset for software/UI testing only.

    DEMO / SYNTHETIC — never use for scientific claims.

    Generates deterministic physically-plausible-looking but fake samples.
    """

    LABEL = "DEMO / SYNTHETIC"

    def __init__(
        self,
        n_samples: int = 100,
        temporal_window: int = 3,
        seed: int = 42,
    ):
        self.n_samples = n_samples
        self.temporal_window = temporal_window
        self.rng = np.random.default_rng(seed)
        self.lats, self.lons = make_grid()
        self.H = len(self.lats)
        self.W = len(self.lons)
        logger.warning(
            f"DemoDataset active — {self.LABEL}. "
            "Do NOT use outputs as scientific results."
        )

    def __len__(self) -> int:
        return self.n_samples

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        rng = np.random.default_rng(idx * 12345)  # deterministic per index
        lat_grid, lon_grid = np.meshgrid(self.lats, self.lons, indexing="ij")

        # Synthetic surface inputs: physically plausible range
        sst = 28.0 - 5.0 * (lat_grid - 5.0) / 25.0 + rng.standard_normal((self.H, self.W)) * 0.5
        sss = 34.5 + rng.standard_normal((self.H, self.W)) * 0.5
        ssh = rng.standard_normal((self.H, self.W)) * 0.1
        cu = rng.standard_normal((self.H, self.W)) * 0.15
        cv = rng.standard_normal((self.H, self.W)) * 0.15
        wu = rng.standard_normal((self.H, self.W)) * 3.0
        wv = rng.standard_normal((self.H, self.W)) * 3.0

        surface = np.stack([sst, sss, ssh, cu, cv, wu, wv], axis=0).astype(np.float32)
        masks = np.ones((7, self.H, self.W), dtype=np.float32)

        # Stack temporal window
        inputs_list = [surface] * self.temporal_window  # simplified: same for all timesteps
        inputs = np.stack(inputs_list, axis=0)   # (T, 7, H, W)
        mask_stack = np.stack([masks] * self.temporal_window, axis=0)  # (T, 7, H, W)

        # Synthetic target: exponential thermocline decay
        target = self._synthetic_profile(lat_grid, lon_grid, rng)

        # Normalize coordinates
        lat_norm = normalize_lat(lat_grid).astype(np.float32)
        lon_norm = normalize_lon(lon_grid).astype(np.float32)
        doy_norm = float((idx % 365) / 365.25)

        return {
            "inputs": torch.from_numpy(inputs),
            "masks": torch.from_numpy(mask_stack),
            "target": torch.from_numpy(target),
            "lat_norm": torch.from_numpy(lat_norm),
            "lon_norm": torch.from_numpy(lon_norm),
            "doy_norm": torch.tensor(doy_norm, dtype=torch.float32),
            "demo": True,
            "data_type": self.LABEL,
        }

    def _synthetic_profile(
        self,
        lat_grid: np.ndarray,
        lon_grid: np.ndarray,
        rng: np.random.Generator,
    ) -> np.ndarray:
        """Generate synthetic temperature profile. DEMO / SYNTHETIC only."""
        depths = np.array(SIH_DEPTHS, dtype=np.float32)
        t_surface = 28.0 - 5.0 * (lat_grid - 5.0) / 25.0
        t_deep = 4.0
        thermo_depth = 80.0 + 30.0 * np.sin(np.pi * (lon_grid - 45.0) / 60.0)
        thermo_depth = np.clip(thermo_depth, 40.0, 150.0)

        target = np.zeros((len(depths), lat_grid.shape[0], lat_grid.shape[1]), dtype=np.float32)
        for d_idx, z in enumerate(depths):
            t_z = t_deep + (t_surface - t_deep) * np.exp(-z / thermo_depth)
            t_z += rng.standard_normal(t_z.shape) * 0.3
            target[d_idx] = t_z.astype(np.float32)

        return target
