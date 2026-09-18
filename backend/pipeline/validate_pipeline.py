import xarray as xr
import matplotlib.pyplot as plt
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def validate_pipeline():
    processed_dir = Path("data/processed")
    surface_zarr = processed_dir / "surface_features.zarr"
    target_zarr = processed_dir / "target_glorys.zarr"

    if not surface_zarr.exists() or not target_zarr.exists():
        logger.error("Zarr stores not found. Run pipeline first.")
        return

    logger.info("Loading Zarr stores...")
    surface_ds = xr.open_zarr(surface_zarr)
    target_ds = xr.open_zarr(target_zarr)

    logger.info(f"Surface Features Dataset:")
    logger.info(surface_ds)
    logger.info(f"\nTarget GLORYS Dataset:")
    logger.info(target_ds)

    # 1. Coordinate Validation
    logger.info("\n=== 1. Coordinate Validation ===")
    assert surface_ds.latitude.equals(target_ds.latitude), "Latitudes do not match!"
    assert surface_ds.longitude.equals(target_ds.longitude), "Longitudes do not match!"
    # Ensure they are exactly on the 0.25 grid
    lat_diffs = surface_ds.latitude.diff(dim='latitude').values
    lon_diffs = surface_ds.longitude.diff(dim='longitude').values
    logger.info(f"Latitude spacing matches 0.25 deg: {all(abs(abs(d) - 0.25) < 1e-4 for d in lat_diffs)}")
    logger.info(f"Longitude spacing matches 0.25 deg: {all(abs(abs(d) - 0.25) < 1e-4 for d in lon_diffs)}")
    logger.info(f"Lat bounds: {surface_ds.latitude.min().item():.2f} to {surface_ds.latitude.max().item():.2f}")
    logger.info(f"Lon bounds: {surface_ds.longitude.min().item():.2f} to {surface_ds.longitude.max().item():.2f}")

    # 2. Variable Validation
    logger.info("\n=== 2. Variable Validation ===")
    expected_surface_vars = ['analysed_sst', 'sos', 'sla', 'u', 'v', 'uwnd', 'vwnd']
    for var in expected_surface_vars:
        assert var in surface_ds.data_vars, f"Missing {var} in surface dataset"
    logger.info(f"Surface variables present: {list(surface_ds.data_vars)}")
    logger.info(f"Target variables present: {list(target_ds.data_vars)}")
    
    # 3. Plotting for Visual Validation
    logger.info("\n=== 3. Visual Validation ===")
    # Select the first timestep for plotting
    t_idx = 0
    surf_t = surface_ds.isel(time=t_idx)
    targ_t = target_ds.isel(time=t_idx)
    
    fig, axes = plt.subplots(2, 4, figsize=(20, 10))
    fig.suptitle(f"Data Pipeline Validation - {str(surface_ds.time[t_idx].values)[:10]}", fontsize=16)
    
    # Plot Surface variables
    vars_to_plot = expected_surface_vars
    titles = ["SST (°C)", "SSS (psu)", "SSH (m)", "Current U (m/s)", "Current V (m/s)", "Wind U (m/s)", "Wind V (m/s)"]
    
    for i, (var, title) in enumerate(zip(vars_to_plot, titles)):
        ax = axes[i // 4, i % 4]
        surf_t[var].plot(ax=ax, cmap='viridis' if 'wnd' not in var and var not in ['u', 'v'] else 'coolwarm')
        ax.set_title(title)
        
    # Plot Target variable (e.g. at surface depth index 0)
    ax = axes[1, 3]
    targ_t["thetao"].isel(depth=0).plot(ax=ax, cmap='inferno')
    ax.set_title("Target GLORYS Temp (°C) at Surface Depth")
    
    plt.tight_layout()
    plot_path = processed_dir / "pipeline_validation.png"
    plt.savefig(plot_path)
    logger.info(f"Validation plot saved to {plot_path}")
    
    logger.info("\nValidation completed successfully! Datasets are perfectly aligned and formatted.")

if __name__ == "__main__":
    validate_pipeline()
