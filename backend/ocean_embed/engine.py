"""
OceanEmbed — Inference Engine.

Provides a unified interface for running OceanEmbed predictions.
Supports:
- Real model (when checkpoint exists)
- Demo mode (deterministic synthetic outputs, clearly labelled DEMO/SYNTHETIC)

The engine auto-detects whether a real model is available.
"""

from __future__ import annotations

import logging
import math
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)

CHECKPOINT_PATH = Path("ocean_embed/checkpoints/ocean_embed_best.pt")
DEMO_LABEL = "DEMO / SYNTHETIC"


def _demo_temperature_profile(
    lat: float,
    lon: float,
    depths: List[float],
    date: str,
    masks: Optional[Dict[str, bool]] = None,
) -> tuple[list[float], list[float]]:
    """Generate deterministic DEMO / SYNTHETIC temperature profile.

    This is a simplified analytical model for software testing ONLY.
    NOT a scientific result.

    Returns:
        (temperatures, uncertainties) at the given depths
    """
    # Deterministic seed from location + date
    seed = int(abs(lat * 1000 + lon * 100 + hash(date[:8]) % 10000)) % (2**31)
    rng = np.random.default_rng(seed)

    try:
        doy = datetime.strptime(date[:10], "%Y-%m-%d").timetuple().tm_yday
    except ValueError:
        doy = 180

    t_surface = 28.0 - 5.0 * (lat - 5.0) / 25.0 + 2.0 * math.sin(2 * math.pi * doy / 365)
    t_deep = 4.0
    thermo_depth = 80.0 + 30.0 * math.sin(math.pi * (lon - 45.0) / 60.0)
    thermo_depth = max(40.0, min(150.0, thermo_depth))

    # Increase uncertainty if inputs are missing
    missing_count = sum(1 for v in (masks or {}).values() if v)
    base_uncertainty = 0.5 + 0.3 * missing_count

    temperatures = []
    uncertainties = []
    for z in depths:
        t_z = t_deep + (t_surface - t_deep) * math.exp(-z / thermo_depth)
        t_z += float(rng.standard_normal() * 0.3)
        # Uncertainty increases with depth and missing inputs
        unc = base_uncertainty + 0.5 * (z / 1000.0)
        temperatures.append(round(float(t_z), 4))
        uncertainties.append(round(float(unc), 4))

    return temperatures, uncertainties


class OceanEmbedEngine:
    """Inference engine for OceanEmbed predictions.

    Auto-detects REAL vs DEMO mode based on checkpoint availability.
    """

    def __init__(
        self,
        checkpoint_path: Path | str = CHECKPOINT_PATH,
        device: str = "cpu",
    ):
        self.device_name = device
        self.checkpoint_path = Path(checkpoint_path)
        self.demo_mode = not self.checkpoint_path.exists()
        self._model = None

        if self.demo_mode:
            logger.warning(
                f"No checkpoint found at {self.checkpoint_path}. "
                f"Engine running in DEMO / SYNTHETIC mode. "
                f"Outputs are NOT scientific results."
            )
        else:
            logger.info(f"Loading model from {self.checkpoint_path}")
            self._load_model()

    def _load_model(self) -> None:
        """Load the trained OceanEmbed model from checkpoint."""
        try:
            import torch
            from ocean_embed.models.ocean_embed import OceanEmbedModel

            checkpoint = torch.load(self.checkpoint_path, map_location=self.device_name, weights_only=False)
            config = checkpoint.get("model_config", checkpoint.get("config", {}))
            is_demo = checkpoint.get("is_demo_mode", False)

            self._model = OceanEmbedModel(
                temporal_window=config.get("temporal_window", 3),
                n_surface_channels=config.get("n_surface_channels", 7),
                use_masks=True,
                use_coords=True,
                base_channels=config.get("base_channels", 16),
                encoder_depth=config.get("encoder_depth", 3),
                latent_dim=config.get("latent_dim", 64),
                n_fourier_freqs=config.get("n_fourier_freqs", 16),
                decoder_hidden=tuple(config.get("decoder_hidden", [128, 128, 64])),
            )
            self._model.load_state_dict(checkpoint["model_state_dict"])
            self._model.eval()
            self.demo_mode = is_demo
            logger.info(f"Model loaded successfully. Demo mode: {self.demo_mode}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}. Falling back to DEMO mode.")
            self.demo_mode = True

    def predict_profile(
        self,
        lat: float,
        lon: float,
        date: str,
        depths: Optional[List[float]] = None,
        masks: Optional[Dict[str, bool]] = None,
    ) -> Dict[str, Any]:
        """Predict temperature profile at a location and date."""
        from ocean_embed.grid import SIH_DEPTHS, get_region_name
        depths = depths or SIH_DEPTHS
        masks = masks or {}
        region_name = get_region_name(lat, lon)

        if self._model is not None and not self.demo_mode:
            try:
                res = self._real_predict_profile(lat, lon, date, depths, masks)
                res["region"] = region_name
                return res
            except Exception as e:
                logger.warning(f"Real prediction failed ({e}), using analytical demo profile.")

        temps, uncs = _demo_temperature_profile(lat, lon, depths, date, masks)
        return {
            "demo": True,
            "data_type": DEMO_LABEL,
            "lat": lat,
            "lon": lon,
            "region": region_name,
            "date": date,
            "depths": depths,
            "temperatures": temps,
            "uncertainties": uncs,
            "warning": "DEMO / SYNTHETIC data. NOT a scientific result.",
        }

    def _real_predict_profile(
        self,
        lat: float,
        lon: float,
        date: str,
        depths: List[float],
        masks: Dict[str, bool],
    ) -> Dict[str, Any]:
        """Run neural model inference for arbitrary continuous depths."""
        import torch
        from ocean_embed.grid import (
            normalize_lat,
            normalize_lon,
            normalize_doy,
            get_region_id,
        )

        try:
            doy = datetime.strptime(date[:10], "%Y-%m-%d").timetuple().tm_yday
        except Exception:
            doy = 180

        H, W = 16, 16  # local patch representation
        lat_t = torch.tensor(normalize_lat(lat), dtype=torch.float32).view(1, 1, 1).expand(1, H, W)
        lon_t = torch.tensor(normalize_lon(lon), dtype=torch.float32).view(1, 1, 1).expand(1, H, W)
        doy_t = torch.tensor([normalize_doy(doy)], dtype=torch.float32)
        reg_id = torch.tensor([get_region_id(lat, lon)], dtype=torch.long)

        # Baseline surface context
        inputs_t = torch.zeros((1, 3, 7, H, W), dtype=torch.float32)
        masks_t = torch.ones((1, 3, 7, H, W), dtype=torch.float32)

        # Apply missing flags
        flag_map = {"sst": 0, "sss": 1, "ssh": 2, "current_u": 3, "current_v": 4, "wind_u": 5, "wind_v": 6}
        for k, v in masks.items():
            if v and k in flag_map:
                masks_t[:, :, flag_map[k], :, :] = 0.0

        with torch.no_grad():
            out = self._model(
                inputs=inputs_t,
                masks=masks_t,
                lat_norm=lat_t,
                lon_norm=lon_t,
                doy_norm=doy_t,
                depths=depths,
                region_ids=reg_id,
            )
            # Center pixel of patch
            means = out["means"][0, :, H // 2, W // 2].cpu().numpy()
            log_vars = out["log_vars"][0, :, H // 2, W // 2].cpu().numpy()
            uncertainties = np.exp(0.5 * log_vars)

        return {
            "demo": False,
            "data_type": "MODEL PREDICTION",
            "lat": lat,
            "lon": lon,
            "date": date,
            "depths": depths,
            "temperatures": [round(float(m), 4) for m in means],
            "uncertainties": [round(float(u), 4) for u in uncertainties],
        }

    def predict_map(
        self,
        date: str,
        depth: float,
        masks: Optional[Dict[str, bool]] = None,
    ) -> Dict[str, Any]:
        """Predict temperature map at a specific date and depth.

        Returns:
            dict with lat/lon grids and temperature/uncertainty arrays
        """
        from ocean_embed.grid import make_grid
        lats, lons = make_grid()

        if self.demo_mode:
            masks = masks or {}
            temp_map = np.zeros((len(lats), len(lons)))
            unc_map = np.zeros((len(lats), len(lons)))

            for i, lat in enumerate(lats):
                for j, lon in enumerate(lons):
                    temps, uncs = _demo_temperature_profile(
                        float(lat), float(lon), [depth], date, masks
                    )
                    temp_map[i, j] = temps[0]
                    unc_map[i, j] = uncs[0]

            return {
                "demo": True,
                "data_type": DEMO_LABEL,
                "date": date,
                "depth": depth,
                "lats": lats.tolist(),
                "lons": lons.tolist(),
                "temperatures": temp_map.tolist(),
                "uncertainties": unc_map.tolist(),
                "warning": "DEMO / SYNTHETIC data. NOT a scientific result.",
            }

        raise NotImplementedError("Real map prediction requires data pipeline.")

    def get_metadata(self) -> Dict[str, Any]:
        """Return engine metadata."""
        from ocean_embed.grid import SIH_DEPTHS, DOMAIN
        return {
            "demo_mode": self.demo_mode,
            "data_type": DEMO_LABEL if self.demo_mode else "REAL",
            "checkpoint": str(self.checkpoint_path) if not self.demo_mode else None,
            "sih_depths": SIH_DEPTHS,
            "domain": DOMAIN,
            "n_parameters": self._model.count_parameters() if self._model else 0,
            "sih_id": "SIH26066",
        }
