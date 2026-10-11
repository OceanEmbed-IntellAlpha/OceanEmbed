"""
OceanEmbed — Graph Neural Network (GNN) Baseline Model (Phase 9B).

Architecture: Spatial GraphSAGE baseline on subsampled regular grid.
Input:
  - Surface variables (7) + validity masks (7) + normalized coords (lat, lon = 2) -> 16 node features
  - Precomputed symmetric k-NN spatial graph (k=8) over subsampled (lat, lon) coordinates
Output:
  - Temperature anomaly predictions at 15 depth levels: [B, 15, H_sub, W_sub]
Helper:
  - upsample_to_full_grid: Bilinear interpolation from [B, 15, H_sub, W_sub] to full grid [B, 15, 101, 241]

Specification:
  - Subsampling: take every 4th lat and 4th lon index -> 26 x 61 = 1,586 nodes per daily graph
  - k-NN graph: k=8 in (lat, lon) Euclidean space, symmetric, unit weights with mean aggregation
  - Message passing: 3 layers of GraphSAGE (SAGEConv, aggr='mean', hidden_dim=128)
  - LayerNorm after each layer, ReLU activation, Dropout 0.1
  - Output head: Per-node MLP [128 -> 128 -> 15]
"""

from __future__ import annotations

from typing import List, Optional, Tuple

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from scipy.spatial import cKDTree
from torch_geometric.nn import SAGEConv


def build_knn_graph(
    lats: np.ndarray,
    lons: np.ndarray,
    subsample_factor: int = 4,
    k: int = 8,
) -> Tuple[torch.Tensor, Tuple[int, int], np.ndarray, np.ndarray]:
    """Construct a symmetric k-NN graph in (lat, lon) Euclidean space over subsampled grid.

    Args:
        lats: 1D array of native latitude coordinates (e.g., length 101).
        lons: 1D array of native longitude coordinates (e.g., length 241).
        subsample_factor: Grid stride factor (default 4 -> 26 x 61 = 1,586 nodes).
        k: Number of nearest neighbors per node (default 8).

    Returns:
        edge_index: LongTensor of shape [2, E] containing symmetric edges.
        grid_shape: Tuple (H_sub, W_sub) of the subsampled grid.
        sub_lats: Subsampled 1D latitude array.
        sub_lons: Subsampled 1D longitude array.
    """
    sub_lats = np.asarray(lats[::subsample_factor], dtype=np.float32)
    sub_lons = np.asarray(lons[::subsample_factor], dtype=np.float32)
    h_sub = len(sub_lats)
    w_sub = len(sub_lons)
    num_nodes = h_sub * w_sub

    lat_mesh, lon_mesh = np.meshgrid(sub_lats, sub_lons, indexing="ij")
    coords = np.stack([lat_mesh.ravel(), lon_mesh.ravel()], axis=1)

    tree = cKDTree(coords)
    # query k+1 because query point itself is at index 0 with distance 0
    _, indices = tree.query(coords, k=k + 1)

    edges = set()
    for i in range(num_nodes):
        for neighbor in indices[i, 1:]:
            edges.add((i, int(neighbor)))
            edges.add((int(neighbor), i))  # Enforce symmetry

    edge_list = sorted(list(edges))
    src = [e[0] for e in edge_list]
    dst = [e[1] for e in edge_list]
    edge_index = torch.tensor([src, dst], dtype=torch.long)

    return edge_index, (h_sub, w_sub), sub_lats, sub_lons


def upsample_to_full_grid(
    node_preds: torch.Tensor,
    subsample_factor: int = 4,
    target_size: Tuple[int, int] = (101, 241),
) -> torch.Tensor:
    """Bilinearly upsample subsampled node predictions to the full grid resolution.

    Using align_corners=True ensures exact spatial correspondence with the
    subsampled grid points (since indices [0, 4, 8, ..., 100] and [0, 4, 8, ..., 240]
    align perfectly with endpoint corners).

    Args:
        node_preds: Tensor of shape [B, 15, H_sub, W_sub].
        subsample_factor: Subsample stride (default 4).
        target_size: Full grid resolution (H, W), default (101, 241).

    Returns:
        Tensor of shape [B, 15, target_size[0], target_size[1]].
    """
    return F.interpolate(node_preds, size=target_size, mode="bilinear", align_corners=True)


class GNNBaseline(nn.Module):
    """OceanEmbed Phase 9B Baseline: Graph Neural Network (GraphSAGE).

    Maps 16 surface node features:
      (7 normalized surface variables + 7 validity masks + 2 normalized lat/lon)
    to 15 subsurface temperature anomaly channels per node via 3 message-passing layers.

    Args:
        in_channels: Input node feature dimension (default 16).
        hidden_dim: Hidden feature dimension (default 128).
        num_layers: Number of GraphSAGE message passing layers (default 3).
        k: Number of nearest neighbors in spatial graph (default 8).
        out_depths: Number of output depth levels (default 15).
        dropout: Dropout rate (default 0.1).
        subsample_factor: Spatial subsample factor (default 4).
        grid_shape: Subsampled spatial dimensions (H_sub, W_sub), default (26, 61).
    """

    def __init__(
        self,
        in_channels: int = 16,
        hidden_dim: int = 128,
        num_layers: int = 3,
        k: int = 8,
        out_depths: int = 15,
        dropout: float = 0.1,
        subsample_factor: int = 4,
        grid_shape: Tuple[int, int] = (26, 61),
    ):
        super().__init__()
        self.in_channels = in_channels
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        self.k = k
        self.out_depths = out_depths
        self.dropout = dropout
        self.subsample_factor = subsample_factor
        self.grid_shape = grid_shape
        self.num_nodes = grid_shape[0] * grid_shape[1]

        # 3 GraphSAGE message passing layers with LayerNorm
        self.convs = nn.ModuleList()
        self.norms = nn.ModuleList()

        # Layer 1: in_channels -> hidden_dim
        self.convs.append(SAGEConv(in_channels, hidden_dim, aggr="mean"))
        self.norms.append(nn.LayerNorm(hidden_dim))

        # Layers 2..num_layers: hidden_dim -> hidden_dim
        for _ in range(num_layers - 1):
            self.convs.append(SAGEConv(hidden_dim, hidden_dim, aggr="mean"))
            self.norms.append(nn.LayerNorm(hidden_dim))

        self.act = nn.ReLU()
        self.drop = nn.Dropout(p=dropout)

        # Output head: per-node MLP [hidden_dim, hidden_dim] -> out_depths
        self.mlp = nn.Sequential(
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Dropout(p=dropout),
            nn.Linear(hidden_dim, out_depths),
        )

    def count_parameters(self) -> int:
        """Count trainable parameters."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)

    def forward(
        self,
        x_nodes: torch.Tensor,
        edge_index: torch.Tensor,
    ) -> torch.Tensor:
        """Forward pass.

        Args:
            x_nodes: Tensor of node features. Can have shape:
                     - [B, C, H_sub, W_sub] (subsampled grid image tensor)
                     - [B, N, C] (batched node feature tensor)
                     - [N, C] (single graph node feature tensor)
            edge_index: LongTensor of shape [2, E] representing graph edges.

        Returns:
            Tensor of shape [B, out_depths, H_sub, W_sub] representing
            temperature anomaly predictions on the subsampled grid.
        """
        # Determine batch size B and node dimension
        if x_nodes.dim() == 4:
            # Shape [B, C, H_sub, W_sub]
            b_sz, c_dim, h_sub, w_sub = x_nodes.shape
            x_flat = x_nodes.permute(0, 2, 3, 1).reshape(b_sz, h_sub * w_sub, c_dim)
        elif x_nodes.dim() == 3:
            # Shape [B, N, C]
            b_sz, n_nodes, c_dim = x_nodes.shape
            h_sub, w_sub = self.grid_shape
            x_flat = x_nodes
        elif x_nodes.dim() == 2:
            # Shape [N, C] -> treat as B=1
            b_sz = 1
            n_nodes, c_dim = x_nodes.shape
            h_sub, w_sub = self.grid_shape
            x_flat = x_nodes.unsqueeze(0)
        else:
            raise ValueError(f"Unsupported x_nodes shape: {x_nodes.shape}")

        num_nodes_per_graph = h_sub * w_sub

        if b_sz == 1:
            # Single graph pass
            h = x_flat.squeeze(0)  # [N, C]
            cur_edge_index = edge_index
            for conv, norm in zip(self.convs, self.norms):
                h = conv(h, cur_edge_index)
                h = norm(h)
                h = self.act(h)
                h = self.drop(h)
            out = self.mlp(h)  # [N, out_depths]
            # Reshape to [1, out_depths, H_sub, W_sub]
            out = out.view(1, h_sub, w_sub, self.out_depths).permute(0, 3, 1, 2).contiguous()
            return out

        # Batched graphs: offset edge indices for each element
        x_batched = x_flat.reshape(b_sz * num_nodes_per_graph, c_dim)
        batched_edge_index = torch.cat(
            [edge_index + b * num_nodes_per_graph for b in range(b_sz)],
            dim=1,
        )

        h = x_batched
        for conv, norm in zip(self.convs, self.norms):
            h = conv(h, batched_edge_index)
            h = norm(h)
            h = self.act(h)
            h = self.drop(h)

        out = self.mlp(h)  # [B * N, out_depths]
        out = out.view(b_sz, h_sub, w_sub, self.out_depths).permute(0, 3, 1, 2).contiguous()
        return out
