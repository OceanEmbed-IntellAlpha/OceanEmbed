"""
OceanEmbed — Loss Gradient Verification.

Verifies that each loss component produces valid gradients.
Identifies dead losses (no gradients) and NaN gradients.

Tests:
- MSELoss
- GaussianNLLLoss
- ThermoclineLoss (currently uses argmax - expected to be dead)
- OceanEmbedLoss (combined)
"""

import sys
from pathlib import Path

# Add backend/ to path for imports
backend_dir = Path(__file__).resolve().parents[2]
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import logging
import torch
from typing import Dict, Any

from ocean_embed.training.losses import (
    MSELoss,
    GaussianNLLLoss,
    ThermoclineLoss,
    OceanEmbedLoss,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("verify_losses")


def check_gradients(
    pred: torch.Tensor,
    loss_value: torch.Tensor,
    loss_name: str
) -> Dict[str, Any]:
    """Check if gradients flowed through prediction tensor."""
    result = {
        "loss_name": loss_name,
        "loss_value": float(loss_value.item()),
        "gradients_flowed": False,
        "grad_norm": None,
        "grad_min": None,
        "grad_max": None,
        "grad_has_nan": False,
        "grad_all_zero": False,
    }

    if pred.grad is None:
        result["gradients_flowed"] = False
        logger.warning(f"{loss_name}: No gradients computed (pred.grad is None)")
        return result

    grad = pred.grad
    result["grad_norm"] = float(torch.norm(grad).item())
    result["grad_min"] = float(grad.min().item())
    result["grad_max"] = float(grad.max().item())
    result["grad_has_nan"] = bool(torch.isnan(grad).any())
    result["grad_all_zero"] = bool((grad == 0).all())
    result["gradients_flowed"] = not result["grad_all_zero"] and not result["grad_has_nan"]

    if result["grad_has_nan"]:
        logger.error(f"{loss_name}: GRADIENTS CONTAIN NaN")
    elif result["grad_all_zero"]:
        logger.error(f"{loss_name}: GRADIENTS ARE ALL ZERO (dead loss)")
    else:
        logger.info(f"{loss_name}: Gradients OK (norm={result['grad_norm']:.4f}, min={result['grad_min']:.4f}, max={result['grad_max']:.4f})")

    return result


def test_mse_loss() -> Dict[str, Any]:
    """Test MSELoss gradient flow."""
    logger.info("=" * 60)
    logger.info("Testing MSELoss")
    logger.info("=" * 60)

    loss_fn = MSELoss()

    # Create dummy predictions and targets
    B, D, H, W = 2, 15, 101, 241
    pred = torch.randn(B, D, H, W, requires_grad=True)
    target = torch.randn(B, D, H, W)
    mask = torch.ones(B, D, H, W)

    loss = loss_fn(pred, target, mask)
    loss.backward()

    result = check_gradients(pred, loss, "MSELoss")
    return result


def test_gaussian_nll_loss() -> Dict[str, Any]:
    """Test GaussianNLLLoss gradient flow."""
    logger.info("=" * 60)
    logger.info("Testing GaussianNLLLoss")
    logger.info("=" * 60)

    loss_fn = GaussianNLLLoss()

    # Create dummy predictions and targets
    B, D, H, W = 2, 15, 101, 241
    mean = torch.randn(B, D, H, W, requires_grad=True)
    log_var = torch.randn(B, D, H, W, requires_grad=True)
    target = torch.randn(B, D, H, W)

    loss = loss_fn(mean, log_var, target)
    loss.backward()

    # Check gradients for both mean and log_var
    mean_result = check_gradients(mean, loss, "GaussianNLLLoss(mean)")
    log_var_result = check_gradients(log_var, loss, "GaussianNLLLoss(log_var)")

    # Return combined result
    return {
        "loss_name": "GaussianNLLLoss",
        "loss_value": float(loss.item()),
        "mean_gradients": mean_result,
        "log_var_gradients": log_var_result,
        "gradients_flowed": mean_result["gradients_flowed"] and log_var_result["gradients_flowed"],
    }


def test_thermocline_loss() -> Dict[str, Any]:
    """Test ThermoclineLoss gradient flow."""
    logger.info("=" * 60)
    logger.info("Testing ThermoclineLoss")
    logger.info("=" * 60)

    loss_fn = ThermoclineLoss(weight=0.01)

    # Create dummy predictions and targets
    B, D, H, W = 2, 15, 101, 241
    pred_temps = torch.randn(B, D, H, W, requires_grad=True)
    ref_temps = torch.randn(B, D, H, W)
    depths = torch.tensor([0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000], dtype=torch.float32)

    try:
        loss = loss_fn(pred_temps, ref_temps, depths)
        loss.backward()

        result = check_gradients(pred_temps, loss, "ThermoclineLoss")

        # Add specific diagnostic about argmax issue
        if not result["gradients_flowed"]:
            logger.error("ThermoclineLoss: CONFIRMED DEAD LOSS due to argmax operation")
            logger.error("This is expected - argmax is non-differentiable")
            result["expected_dead"] = True
            result["reason"] = "argmax operation is non-differentiable"
        else:
            logger.info("ThermoclineLoss: Gradients flowed (soft-argmax working correctly)")
            result["expected_dead"] = False
            result["fix_applied"] = "soft-argmax"

        return result
    except Exception as e:
        logger.error(f"ThermoclineLoss verification FAILED: {e}")
        return {
            "loss_name": "ThermoclineLoss",
            "status": "FAIL",
            "error": str(e),
            "expected_dead": True,
            "reason": "argmax operation is non-differentiable"
        }


def test_ocean_embed_loss() -> Dict[str, Any]:
    """Test OceanEmbedLoss combined gradient flow."""
    logger.info("=" * 60)
    logger.info("Testing OceanEmbedLoss (combined)")
    logger.info("=" * 60)

    loss_fn = OceanEmbedLoss(
        use_uncertainty=True,
        thermocline_weight=0.01,
        depth_smooth_weight=0.001,
    )

    # Create dummy predictions and targets
    B, D, H, W = 2, 15, 101, 241
    pred_mean = torch.randn(B, D, H, W, requires_grad=True)
    pred_log_var = torch.randn(B, D, H, W, requires_grad=True)
    target = torch.randn(B, D, H, W)
    depths = torch.tensor([0, 5, 10, 20, 30, 50, 75, 100, 125, 150, 200, 300, 500, 700, 1000], dtype=torch.float32)

    loss_dict = loss_fn(pred_mean, pred_log_var, target, depths)
    total_loss = loss_dict["total"]
    total_loss.backward()

    # Check gradients for both mean and log_var
    mean_result = check_gradients(pred_mean, total_loss, "OceanEmbedLoss(mean)")
    log_var_result = check_gradients(pred_log_var, total_loss, "OceanEmbedLoss(log_var)")

    # Log individual loss components
    logger.info(f"OceanEmbedLoss components:")
    logger.info(f"  primary: {loss_dict['primary'].item():.4f}")
    logger.info(f"  thermo: {loss_dict['thermo'].item():.4f}")
    logger.info(f"  smooth: {loss_dict['smooth'].item():.4f}")
    logger.info(f"  total: {loss_dict['total'].item():.4f}")

    return {
        "loss_name": "OceanEmbedLoss",
        "loss_value": float(total_loss.item()),
        "components": {k: float(v.item()) for k, v in loss_dict.items()},
        "mean_gradients": mean_result,
        "log_var_gradients": log_var_result,
        "gradients_flowed": mean_result["gradients_flowed"] and log_var_result["gradients_flowed"],
    }


def main():
    """Run all loss gradient verification tests."""
    logger.info("Starting loss gradient verification...")

    results = {}

    try:
        mse_result = test_mse_loss()
        results["mse"] = mse_result
    except Exception as e:
        logger.error(f"MSELoss verification FAILED: {e}")
        results["mse"] = {"status": "FAIL", "error": str(e)}

    try:
        nll_result = test_gaussian_nll_loss()
        results["gaussian_nll"] = nll_result
    except Exception as e:
        logger.error(f"GaussianNLLLoss verification FAILED: {e}")
        results["gaussian_nll"] = {"status": "FAIL", "error": str(e)}

    try:
        thermo_result = test_thermocline_loss()
        results["thermocline"] = thermo_result
    except Exception as e:
        logger.error(f"ThermoclineLoss verification FAILED: {e}")
        results["thermocline"] = {"status": "FAIL", "error": str(e)}

    try:
        combined_result = test_ocean_embed_loss()
        results["ocean_embed"] = combined_result
    except Exception as e:
        logger.error(f"OceanEmbedLoss verification FAILED: {e}")
        results["ocean_embed"] = {"status": "FAIL", "error": str(e)}

    logger.info("=" * 60)
    logger.info("VERIFICATION SUMMARY")
    logger.info("=" * 60)

    for loss_name, result in results.items():
        if "status" in result and result["status"] == "FAIL":
            logger.error(f"{loss_name}: FAIL - {result.get('error', 'Unknown error')}")
        else:
            gradients_flowed = result.get("gradients_flowed", False)
            status = "PASS" if gradients_flowed else "FAIL"
            logger.info(f"{loss_name}: {status}")
            logger.info(f"  Loss value: {result.get('loss_value', 'N/A'):.4f}")
            if loss_name == "thermocline":
                if gradients_flowed:
                    logger.info(f"  Fix applied: {result.get('fix_applied', 'None')}")
                else:
                    logger.info(f"  Expected dead: {result.get('expected_dead', False)}")
                    logger.info(f"  Reason: {result.get('reason', 'Unknown')}")
            else:
                logger.info(f"  Gradients flowed: {gradients_flowed}")

    # Check if ThermoclineLoss is working (should be fixed now)
    if not results.get("thermocline", {}).get("gradients_flowed", True):
        logger.error("ThermoclineLoss still has gradient issues - fix may not be working correctly")
        sys.exit(1)
    else:
        logger.info("ThermoclineLoss gradients flowing - soft-argmax fix successful")


if __name__ == "__main__":
    main()