"""
Uncertainty / log_var analysis across depths.
Evaluates continuous OceanEmbed models trained with Gaussian NLL loss
to inspect predicted log_var across depth bands.
"""

import sys
from pathlib import Path
import numpy as np
import torch
import xarray as xr
import yaml
from torch.utils.data import DataLoader

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from ocean_embed.grid import SIH_DEPTHS
from ocean_embed.models.ocean_embed import OceanEmbed
from ocean_embed.data import OceanEmbedDataset, load_normalization_stats
from ocean_embed.data.splits import make_date_range_split
from ocean_embed.training.train import build_model_from_config, load_training_config
from ocean_embed.training.trainer import batch_to_model_inputs

def inspect_log_var():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Check v1 continuous anomaly model or phase4_final
    ckpt_path = ROOT / "runs" / "_final_v1" / "model_v1_anomaly.pt"
    if not ckpt_path.exists():
        ckpt_path = ROOT / "runs" / "phase4_final" / "checkpoint_best.pt"
    
    if not ckpt_path.exists():
        print("No NLL checkpoint found.")
        return

    print(f"Loading uncertainty checkpoint: {ckpt_path}")
    cfg = load_training_config(ROOT / "backend/ocean_embed/configs/training_config.yaml")
    model = build_model_from_config(cfg)
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device).eval()

    with open(ROOT / "backend/ocean_embed/configs/data_config.yaml", encoding="utf-8") as f:
        data_cfg = yaml.safe_load(f)

    surface_path = ROOT / "data/processed/surface_features.zarr"
    target_path = ROOT / "data/processed/target_glorys.zarr"
    stats_path = ROOT / "data/processed/normalization_stats_v3.json"

    sf = xr.open_zarr(str(surface_path))
    splits = make_date_range_split(
        sf.time.values,
        data_cfg["splits"]["train_range"],
        data_cfg["splits"]["val_range"],
        data_cfg["splits"]["test_range"],
    )
    sf.close()

    ds = OceanEmbedDataset(surface_path, target_path, stats_path, indices=splits["test"][:50], mode="eval")
    loader = DataLoader(ds, batch_size=4, shuffle=False)

    depth_log_vars = [[] for _ in range(len(SIH_DEPTHS))]

    with torch.no_grad():
        for batch in loader:
            inp, m, la, lo, do, tg = batch_to_model_inputs(batch, 1, device)
            out = model(inputs=inp, masks=m, lat_norm=la, lon_norm=lo, doy_norm=do, depths=SIH_DEPTHS)
            log_vars = out["log_vars"].cpu().numpy() # (B, D, H, W)
            masks = m[:, 0:1].cpu().numpy() # valid ocean mask
            for d in range(len(SIH_DEPTHS)):
                lv = log_vars[:, d]
                val = lv[masks[:, 0] > 0.5]
                depth_log_vars[d].extend(val.tolist())

    print("\n--- UNCERTAINTY (LOG_VAR / PREDICTED SIGMA) BY DEPTH ---")
    print(f"{'Idx':<4} {'Depth(m)':<10} {'Mean log_var':<15} {'Mean sigma (°C)':<18} {'Median sigma (°C)':<18}")
    for d, lv_list in enumerate(depth_log_vars):
        lv_arr = np.array(lv_list)
        mean_lv = float(np.mean(lv_arr))
        sigma_arr = np.exp(0.5 * lv_arr) # in normalized units or degC
        print(f"{d:<4} {SIH_DEPTHS[d]:<10.2f} {mean_lv:<15.4f} {np.mean(sigma_arr):<18.4f} {np.median(sigma_arr):<18.4f}")

if __name__ == "__main__":
    inspect_log_var()
