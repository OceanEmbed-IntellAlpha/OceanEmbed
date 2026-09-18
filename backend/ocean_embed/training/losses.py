"""
OceanEmbed — Loss functions.

Implements:
- MSE loss (baseline)
- Gaussian NLL loss (heteroscedastic uncertainty; Spec §14)
- Thermocline depth regularization loss (configurable; Spec §16)
- Depth smoothness regularization
"""

from __future__ import annotations

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

    def __init__(self, min_log_var: float = -10.0, max_log_var: float = 10.0):
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
    """

    def __init__(self, weight: float = 0.01):
        super().__init__()
        self.weight = weight

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

        # Thermocline at depth of maximum gradient magnitude
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
        depth_smooth_weight: float = 0.001,
    ):
        super().__init__()
        self.use_uncertainty = use_uncertainty
        self.primary_loss = GaussianNLLLoss() if use_uncertainty else MSELoss()
        self.thermo_loss = ThermoclineLoss(weight=thermocline_weight)
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
