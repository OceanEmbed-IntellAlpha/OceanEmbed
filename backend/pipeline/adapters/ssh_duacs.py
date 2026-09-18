"""
Adapter for DUACS Sea Surface Height (SSH / SLA) Data.

Source: DUACS L4 Altimetry (c3s_obs-sl_glo_phy-ssh_my_twosat-l4-duacs-0.25deg_P1D)
Native resolution: 0.25°, daily
Output variable: sla (m)

Preprocessing:
  1. Load with Dask chunking
  2. Spatial subset to NIO domain
  3. Regrid to 0.25° (to enforce exact coordinate alignment)
  4. Align time to daily mean
  5. Apply QC range check (-2 to 2 m)
"""

import xarray as xr
import logging
from backend.pipeline.processor import GridProcessor

logger = logging.getLogger("Adapter.SSH")

SSH_VALID_MIN = -2.0
SSH_VALID_MAX = 2.0


class DUACSAdapter:
    """Adapter for DUACS Sea Surface Height (SSH/SLA) Data"""

    def __init__(self, data_path: str, processor: GridProcessor):
        self.data_path = data_path
        self.processor = processor

    def load(self) -> xr.Dataset:
        ds = xr.open_dataset(self.data_path, chunks={"time": "auto"})

        # DUACS is already 0.25 deg, but we subset and regrid to ensure
        # exact coordinate alignment with the canonical grid
        ds = self.processor.subset(ds, lat_name="latitude", lon_name="longitude")
        ds = self.processor.regrid(ds, lat_name="latitude", lon_name="longitude", method="linear")
        ds = self.processor.align_time(ds, time_name="time")

        ds = ds[["sla"]]

        # QC: flag values outside physical range
        ds["sla"] = ds["sla"].where(
            (ds["sla"] >= SSH_VALID_MIN) & (ds["sla"] <= SSH_VALID_MAX)
        )
        logger.info(f"SSH preprocessing complete. Shape: {dict(ds.dims)}")

        return ds
