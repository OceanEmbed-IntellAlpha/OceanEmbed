"""
OceanEmbed — One-Batch Overfit Test.

Tests whether the model can memorize a single batch of data.
This is the most fundamental test of whether the model architecture
and loss functions are working correctly.

Success criterion: loss decreases by at least 95% from step 0.
"""

import sys
from pathlib import Path

# Add backend/ to path for imports
backend_dir = Path(__file__).resolve().parents[2]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import logging
import time
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

from ocean_embed.data import OceanEmbedDataset, make_temporal_split
from ocean_embed.models.ocean_embed import OceanEmbedModel
from ocean_embed.training.losses import OceanEmbedLoss
from ocean_embed.grid import SIH_DEPTHS

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("overfit_one_batch")


def overfit_one_batch(
    batch_size: int = 2,
    n_steps: int = 100,
    lr: float = 1e-3,
    device: str = None,
):
    """Overfit model to a single batch of data."""
    logger.info("=" * 60)
    logger.info("ONE-BATCH OVERFIT TEST (T=1)")
    logger.info("=" * 60)
    
    # Auto-detect device if not specified
    if device is None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Configuration: batch_size={batch_size}, n_steps={n_steps}, lr={lr}, device={device}")

    # Load dataset
    # Get project root - this should work regardless of where script is run from
    # Try multiple approaches to find the project root
    script_path = Path(__file__).resolve()
    possible_roots = [
        script_path.parents[2],  # If script is in backend/ocean_embed/training/
        script_path.parents[1],  # If script is in backend/ocean_embed/
        script_path.parents[0],  # If script is in backend/
        Path.cwd().parent,       # If cwd is backend/
        Path.cwd(),              # If cwd is project root
    ]
    
    project_root = None
    for root in possible_roots:
        test_path = root / "data" / "processed" / "surface_features.zarr"
        if test_path.exists():
            project_root = root
            break
    
    if project_root is None:
        # Fallback: assume two levels up from script
        project_root = script_path.parents[2]
    
    SURFACE_ZARR = str(project_root / "data/processed/surface_features.zarr")
    TARGET_ZARR = str(project_root / "data/processed/target_glorys.zarr")
    STATS_PATH = str(project_root / "data/processed/normalization_stats.json")
    
    logger.info(f"Using project root: {project_root}")
    logger.info(f"Data paths: {SURFACE_ZARR}, {TARGET_ZARR}")

    import xarray as xr
    sf = xr.open_zarr(SURFACE_ZARR)
    times = sf.time.values
    sf.close()

    splits = make_temporal_split(times, train_frac=0.70, val_frac=0.15, test_frac=0.15)
    train_idx = splits["train"]

    dataset = OceanEmbedDataset(SURFACE_ZARR, TARGET_ZARR, STATS_PATH, indices=train_idx)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # Get a single batch
    batch = next(iter(dataloader))
    logger.info(f"Batch shapes:")
    logger.info(f"  input: {batch['input'].shape}")
    logger.info(f"  masks: {batch['masks'].shape}")
    logger.info(f"  target: {batch['target'].shape}")

    # Reconstruct temporal inputs for OceanEmbedModel
    # For this test, use T=1 (single timestep) instead of duplicating
    T = 1  # temporal window
    B, C, H, W = batch['input'].shape

    # Build temporal inputs by adding T dimension (no repetition for T=1)
    inputs_temporal = batch['input'].unsqueeze(1)  # (B, 1, C, H, W)
    masks_temporal = batch['masks'].unsqueeze(1)  # (B, 1, C, H, W)

    # Coordinate fields from dataset (collated to batch dimension)
    lat_norm = batch["lat_norm"]  # (B, H, W)
    lon_norm = batch["lon_norm"]  # (B, H, W)
    doy_norm = batch["doy_norm"]  # (B,)

    # Move to device
    inputs_temporal = inputs_temporal.to(device)
    masks_temporal = masks_temporal.to(device)
    lat_norm = lat_norm.to(device)
    lon_norm = lon_norm.to(device)
    doy_norm = doy_norm.to(device)
    target = batch['target'].to(device)

    # Initialize model
    model = OceanEmbedModel(
        temporal_window=T,
        n_surface_channels=C,
        use_masks=True,
        use_coords=True,
        base_channels=32,
        encoder_depth=4,
        latent_dim=128,
        n_fourier_freqs=16,
        decoder_hidden=(256, 256, 128),
        n_regions=3,
        region_embed_dim=16,
        dropout=0.1,
        max_depth=1000.0,
    ).to(device)

    # Initialize loss function
    loss_fn = OceanEmbedLoss(
        use_uncertainty=True,
        thermocline_weight=0.01,
        thermocline_temperature=1.0,
        thermocline_use_soft_argmax=True,
        depth_smooth_weight=0.001,
    )

    # Initialize optimizer
    optimizer = optim.Adam(model.parameters(), lr=lr)

    # Training loop
    model.train()
    loss_history = []
    grad_norms = []

    if device == "cuda":
        torch.cuda.reset_peak_memory_stats()

    logger.info("Starting training loop...")
    t0 = time.perf_counter()
    for step in range(n_steps):
        optimizer.zero_grad()

        # Forward pass
        output = model(
            inputs=inputs_temporal,
            masks=masks_temporal,
            lat_norm=lat_norm,
            lon_norm=lon_norm,
            doy_norm=doy_norm,
            depths=SIH_DEPTHS,
        )

        # Compute loss
        loss_dict = loss_fn(
            pred_mean=output['means'],
            pred_log_var=output['log_vars'],
            target=target,
            depths=torch.tensor(SIH_DEPTHS, dtype=torch.float32).to(device),
        )
        loss = loss_dict['total']

        # Backward pass
        loss.backward()

        # Compute gradient norm
        total_norm = 0.0
        for p in model.parameters():
            if p.grad is not None:
                param_norm = p.grad.data.norm(2)
                total_norm += param_norm.item() ** 2
        total_norm = total_norm ** 0.5
        grad_norms.append(total_norm)

        # Optimize
        optimizer.step()

        # Record loss
        loss_history.append(loss.item())

        # Print progress
        if step % 20 == 0 or step == n_steps - 1:
            logger.info(f"Step {step:4d}: loss={loss.item():.6f}, grad_norm={total_norm:.6f}")
            logger.info(f"  Components: primary={loss_dict['primary'].item():.4f}, "
                       f"thermo={loss_dict['thermo'].item():.4f}, smooth={loss_dict['smooth'].item():.4f}")

    wall_time_s = time.perf_counter() - t0
    peak_vram_gb = (
        torch.cuda.max_memory_allocated() / (1024 ** 3)
        if device == "cuda"
        else 0.0
    )

    # Analyze results
    initial_loss = loss_history[0]
    final_loss = loss_history[-1]
    loss_reduction = (initial_loss - final_loss) / initial_loss * 100

    logger.info("=" * 60)
    logger.info("OVERFIT TEST RESULTS")
    logger.info("=" * 60)
    logger.info(f"Device: {device}")
    logger.info(f"Input temporal shape: {tuple(inputs_temporal.shape)}")
    logger.info(f"Wall time: {wall_time_s:.2f}s")
    logger.info(f"Peak VRAM: {peak_vram_gb:.3f} GB")
    logger.info(f"Loss trajectory (every 20 steps): {[f'{loss_history[i]:.4f}' for i in range(0, n_steps, 20)]}")
    logger.info(f"Initial loss: {initial_loss:.6f}")
    logger.info(f"Final loss:   {final_loss:.6f}")
    logger.info(f"Loss reduction: {loss_reduction:.2f}%")
    logger.info(f"Success criterion (95% reduction): {'PASS' if loss_reduction >= 95 else 'FAIL'}")

    # Log model output stats
    with torch.no_grad():
        model.eval()
        final_output = model(
            inputs=inputs_temporal,
            masks=masks_temporal,
            lat_norm=lat_norm,
            lon_norm=lon_norm,
            doy_norm=doy_norm,
            depths=SIH_DEPTHS,
        )
        means = final_output['means']
        logger.info(f"Final output stats:")
        logger.info(f"  mean: {means.mean().item():.4f}, std: {means.std().item():.4f}")
        logger.info(f"  min: {means.min().item():.4f}, max: {means.max().item():.4f}")

    # Save loss curve
    results_dir = Path("runs/phase2_overfit")
    results_dir.mkdir(parents=True, exist_ok=True)

    fig, ax = plt.subplots(figsize=(10, 6))
    ax.plot(loss_history, label='Total Loss')
    ax.set_xlabel('Training Step')
    ax.set_ylabel('Loss')
    ax.set_title('One-Batch Overfit Test: Loss Curve')
    ax.set_yscale('log')
    ax.grid(True, alpha=0.3)
    ax.legend()

    loss_curve_path = results_dir / "loss_curve.png"
    fig.savefig(loss_curve_path, dpi=120, bbox_inches='tight')
    plt.close(fig)
    logger.info(f"Loss curve saved to {loss_curve_path}")

    # Save model checkpoint
    checkpoint_path = results_dir / "overfit_checkpoint.pt"
    torch.save({
        'model_state_dict': model.state_dict(),
        'optimizer_state_dict': optimizer.state_dict(),
        'loss_history': loss_history,
        'grad_norms': grad_norms,
        'initial_loss': initial_loss,
        'final_loss': final_loss,
        'loss_reduction': loss_reduction,
    }, checkpoint_path)
    logger.info(f"Checkpoint saved to {checkpoint_path}")

    # Return results
    return {
        'initial_loss': initial_loss,
        'final_loss': final_loss,
        'loss_reduction': loss_reduction,
        'success': loss_reduction >= 95,
        'loss_curve_path': str(loss_curve_path),
        'checkpoint_path': str(checkpoint_path),
        'n_steps': n_steps,
        'grad_norms': grad_norms,
        'device': device,
        'wall_time_s': wall_time_s,
        'peak_vram_gb': peak_vram_gb,
        'loss_history': loss_history,
    }


def main():
    """Run the one-batch overfit test."""
    try:
        if not torch.cuda.is_available():
            logger.error("CUDA is required for Fix C; torch.cuda.is_available() is False")
            sys.exit(1)
        results = overfit_one_batch(batch_size=2, n_steps=100, lr=1e-3, device="cuda")

        logger.info("=" * 60)
        logger.info("FINAL RESULT")
        logger.info("=" * 60)
        if results['success']:
            logger.info("OVERFIT TEST PASSED - Model can learn")
            logger.info(f"Loss reduced from {results['initial_loss']:.6f} to {results['final_loss']:.6f} ({results['loss_reduction']:.1f}%)")
            sys.exit(0)
        else:
            logger.error("OVERFIT TEST FAILED - Model cannot learn")
            logger.error(f"Loss only reduced from {results['initial_loss']:.6f} to {results['final_loss']:.6f} ({results['loss_reduction']:.1f}%)")
            logger.error("This indicates a fundamental problem with the model or loss function")
            sys.exit(1)

    except Exception as e:
        logger.error(f"OVERFIT TEST FAILED WITH EXCEPTION: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()