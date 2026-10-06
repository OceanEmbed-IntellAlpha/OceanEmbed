"""
OceanEmbed — Loss functions.

Implements:
- MSE loss (baseline)
- WeightedMSELoss — depth-weighted MSE (Issue #21 Option A)
- Gaussian NLL loss (heteroscedastic uncertainty; Spec §14)
- Thermocline depth regularization loss (configurable; Spec §16)
- Depth smoothness regularization
"""

from __future__ import annotations

import math

import torch
import torch.nn as nn
import torch.nn.functional as F


class MSELoss(nn.Module):
    """Standard MSE loss with optional NaN masking."""

    def forward(
        self,
        pred: torch.Tensor,
        target: torch.Tensor,
        mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """
        Args:
            pred:   (B, D, H, W)
            target: (B, D, H, W)
            mask:   (B, D, H, W) float, 1=valid, 0=missing (optional)
        """
        diff_sq = (pred - target) ** 2

        if mask is not None:
            diff_sq = diff_sq * mask
            n_valid = mask.sum().clamp(min=1)
            return diff_sq.sum() / n_valid
        else:
            valid = torch.isfinite(target)
            diff_sq = diff_sq * valid.float()
            n_valid = valid.float().sum().clamp(min=1)
            return diff_sq.sum() / n_valid


def smooth_thermocline_weight(depth_m: float) -> float:
    """Per-depth loss weight: Gaussian bump centred at 100 m, sigma=40 m.

    Profile (approximate):
        depth   weight
        0 m     1.02
        30 m    1.15
        50 m    1.42
        75 m    2.09
        100 m   3.00   ← peak
        125 m   2.09
        150 m   1.42
        200 m   1.04
        300 m+  ~1.00

    Args:
        depth_m: Depth in metres (positive downward).

    Returns:
        Scalar weight >= 1.0.
    """
    return 1.0 + 2.0 * math.exp(-((depth_m - 100.0) ** 2) / (2.0 * 40.0 ** 2))


class WeightedMSELoss(nn.Module):
    """Depth-weighted MSE loss for Issue #21 Option A.

    Applies a smooth per-depth weight (Gaussian bump at 100 m) so the
    thermocline region receives higher gradient signal without step artifacts.

    Args:
        depth_levels: Sequence of depth values in metres (e.g. SIH_DEPTHS or
                      GLORYS_NATIVE_DEPTHS).  The weight vector is pre-computed
                      once in __init__ and registered as a buffer so it moves
                      with the module's device.
    """

    def __init__(self, depth_levels: list[float]) -> None:
        super().__init__()
        weights = torch.tensor(
            [smooth_thermocline_weight(d) for d in depth_levels],
            dtype=torch.float32,
        ).view(1, -1, 1, 1)  # (1, D, 1, 1) — broadcasts over (B, D, H, W)
        self.register_buffer("depth_weights", weights)
        self.depth_levels = list(depth_levels)

    def forward(
        self,
        pred: torch.Tensor,
        target: torch.Tensor,
        mask: torch.Tensor | None = None,
    ) -> torch.Tensor:
        """
        Args:
            pred:   (B, D, H, W)  — model anomaly predictions
            target: (B, D, H, W)  — GLORYS anomaly targets
            mask:   (B, D, H, W)  — float, 1=valid ocean pixel, 0=missing

        Returns:
            Weighted mean squared error (scalar).
        """
        diff_sq = (pred - target) ** 2

        if mask is not None:
            diff_sq = diff_sq * mask
            n_valid = mask.sum().clamp(min=1)
            # weight denominator by same mask so normalisation is correct
            weighted = (diff_sq * self.depth_weights).sum()
            weight_sum = (mask * self.depth_weights).sum().clamp(min=1)
            return weighted / weight_sum
        else:
            valid = torch.isfinite(target)
            diff_sq = diff_sq * valid.float()
            weighted = (diff_sq * self.depth_weights).sum()
            weight_sum = (valid.float() * self.depth_weights).sum().clamp(min=1)
            return weighted / weight_sum


class GaussianNLLLoss(nn.Module):
    """Heteroscedastic Gaussian negative log-likelihood loss.

    For each prediction:
        L = 0.5 * (log_var + (target - mean)^2 * exp(-log_var))

    This encourages the model to:
    - Predict large variance where prediction errors are large
    - Predict small variance where predictions are confident

    Reference:
        Kendall & Gal (2017), "What Uncertainties Do We Need in Bayesian
        Deep Learning for Computer Vision?"
    """

    def __init__(self, min_log_var: float = -4.0, max_log_var: float = 2.0):
        super().__init__()
        self.min_log_var = min_log_var
        self.max_log_var = max_log_var

    def forward(
        self,
        mean: torch.Tensor,
        log_var: torch.Tensor,
        target: torch.Tensor,
    ) -> torch.Tensor:
        """Compute Gaussian NLL.

        Args:
            mean:    (B, D, H, W) predicted mean
            log_var: (B, D, H, W) predicted log variance
            target:  (B, D, H, W) ground truth

        Returns:
            scalar loss
        """
        log_var = log_var.clamp(self.min_log_var, self.max_log_var)
        valid = torch.isfinite(target)

        nll = 0.5 * (log_var + (target - mean) ** 2 * torch.exp(-log_var))
        # Keep the uncertainty head away from extreme log variances.
        nll = nll + 0.5 * log_var.pow(2)
        nll = nll * valid.float()

        n_valid = valid.float().sum().clamp(min=1)
        return nll.sum() / n_valid


class ThermoclineLoss(nn.Module):
    """Physics-informed thermocline depth regularization.

    Penalizes discrepancy between predicted and reference thermocline depth.

    This is:
    - Configurable (weight=0 disables it)
    - Scientifically justified (thermocline position is a key oceanographic feature)
    - Included in ablations (see training_config.yaml)

    NOT hardcoded: weight comes from config.

    NOTE: Uses soft-argmax (softmax-weighted expectation) instead of argmax
    for differentiability. The original argmax implementation was non-differentiable
    and produced zero gradients, making the loss functionally dead.
    """

    def __init__(self, weight: float = 0.01, temperature: float = 1.0, use_soft_argmax: bool = True):
        super().__init__()
        self.weight = weight
        self.temperature = temperature
        self.use_soft_argmax = use_soft_argmax

    def compute_thermocline_depth(
        self,
        temps: torch.Tensor,
        depths: torch.Tensor,
        max_search_depth: float = 300.0,
    ) -> torch.Tensor:
        """Estimate thermocline depth as depth of maximum |dT/dz|.

        Args:
            temps:  (B, D, H, W) temperature at D depth levels
            depths: (D,) depth values in metres
            max_search_depth: maximum depth to search for thermocline

        Returns:
            thermo_depth: (B, H, W) estimated thermocline depth in metres
        """
        B, D, H, W = temps.shape

        # Compute finite differences along depth axis
        dT = temps[:, 1:, :, :] - temps[:, :-1, :, :]  # (B, D-1, H, W)
        dz = depths[1:] - depths[:-1]  # (D-1,)
        dz = dz.view(1, -1, 1, 1)

        dtdz = dT / dz.clamp(min=0.1)  # (B, D-1, H, W)
        dtdz_mag = dtdz.abs()

        # Only search above max_search_depth
        depth_mask = (depths[:-1] <= max_search_depth).float().view(1, -1, 1, 1)
        dtdz_mag = dtdz_mag * depth_mask + (1 - depth_mask) * (-1e6)

        if self.use_soft_argmax:
            # Soft-argmax: softmax-weighted expectation for differentiability
            # weights = softmax(dtdz_mag * temperature) over depth dimension
            weights = F.softmax(dtdz_mag * self.temperature, dim=1)  # (B, D-1, H, W)
            # thermo_depth = sum(weights * depths[:-1]) over depth dimension
            thermo_depth = (weights * depths[:-1].view(1, -1, 1, 1)).sum(dim=1)  # (B, H, W)
        else:
            # Original argmax (non-differentiable, produces zero gradients)
            idx = dtdz_mag.argmax(dim=1)  # (B, H, W)
            thermo_depth = depths[:-1][idx]  # (B, H, W)

        return thermo_depth

    def forward(
        self,
        pred_temps: torch.Tensor,
        ref_temps: torch.Tensor,
        depths: torch.Tensor,
    ) -> torch.Tensor:
        """Compute thermocline loss.

        Args:
            pred_temps: (B, D, H, W)
            ref_temps:  (B, D, H, W) — GLORYS12V1 reference
            depths:     (D,) metres

        Returns:
            weighted scalar loss
        """
        if self.weight == 0.0:
            return torch.tensor(0.0, device=pred_temps.device)

        pred_thermo = self.compute_thermocline_depth(pred_temps, depths)
        ref_thermo = self.compute_thermocline_depth(ref_temps, depths)

        thermo_loss = F.l1_loss(pred_thermo, ref_thermo)
        return self.weight * thermo_loss


class OceanEmbedLoss(nn.Module):
    """Combined training loss for OceanEmbed.

    = Gaussian NLL (or MSE) + thermocline regularization
    """

    def __init__(
        self,
        use_uncertainty: bool = True,
        thermocline_weight: float = 0.01,
        thermocline_temperature: float = 1.0,
        thermocline_use_soft_argmax: bool = True,
        depth_smooth_weight: float = 0.001,
    ):
        super().__init__()
        self.use_uncertainty = use_uncertainty
        self.primary_loss = GaussianNLLLoss() if use_uncertainty else MSELoss()
        self.thermo_loss = ThermoclineLoss(
            weight=thermocline_weight,
            temperature=thermocline_temperature,
            use_soft_argmax=thermocline_use_soft_argmax
        )
        self.depth_smooth_weight = depth_smooth_weight

    def forward(
        self,
        pred_mean: torch.Tensor,
        pred_log_var: torch.Tensor,
        target: torch.Tensor,
        depths: torch.Tensor | None = None,
    ) -> dict[str, torch.Tensor]:
        """Compute combined loss.

        Returns dict of {'total', 'primary', 'thermo', 'smooth'}.
        """
        if self.use_uncertainty:
            primary = self.primary_loss(pred_mean, pred_log_var, target)
        else:
            primary = self.primary_loss(pred_mean, target)

        # Thermocline loss (requires depths tensor)
        if depths is not None and self.thermo_loss.weight > 0:
            thermo = self.thermo_loss(pred_mean, target, depths)
        else:
            thermo = torch.tensor(0.0, device=pred_mean.device)

        # Depth smoothness: penalize large jumps in predicted profile
        if self.depth_smooth_weight > 0:
            diffs = pred_mean[:, 1:, :, :] - pred_mean[:, :-1, :, :]
            smooth = self.depth_smooth_weight * (diffs ** 2).mean()
        else:
            smooth = torch.tensor(0.0, device=pred_mean.device)

        total = primary + thermo + smooth

        return {
            "total": total,
            "primary": primary,
            "thermo": thermo,
            "smooth": smooth,
        }
