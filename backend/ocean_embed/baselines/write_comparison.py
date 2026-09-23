"""Write the Phase 5 comparison markdown from persisted test metrics."""
from __future__ import annotations

import json
from pathlib import Path


def load(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def row(name: str, data: dict) -> str:
    overall = data["overall"]
    bands = data["depth_bands"]
    return (
        f"| {name} | {overall['rmse']:.3f} | {overall['r2']:.3f} | {overall['bias']:+.3f} | "
        f"{bands['ML_0-50m']['rmse']:.3f} | {bands['thermocline_50-200m']['rmse']:.3f} | {bands['deep_200-1000m']['rmse']:.3f} |"
    )


def main() -> None:
    root = Path(__file__).resolve().parents[3]
    base = root / "runs" / "_baselines"
    v0 = load(root / "runs" / "_final_v0" / "test_metrics.json")
    global_mean = load(base / "global_mean_metrics.json")
    climatology = load(base / "climatology_metrics.json")
    unet = load(base / "unet" / "test_metrics.json")
    content = "\n".join([
        "# Phase 5 baseline comparison",
        "",
        "| Model | Test RMSE (°C) | Test R² | Test Bias (°C) | ML RMSE | Thermocline RMSE | Deep RMSE |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
        row("Global mean", global_mean),
        row("Climatology", climatology),
        row("BaselineModel (U-Net)", unet),
        row("OceanEmbedModel v0", v0),
        "| Published (Su 2018, reference target) | ~1.5 | ~0.9 | ~0.0 | ~1.0 | ~1.5 | ~0.5 |",
        "",
        "## Interpretation",
        "",
        "All data-driven model metrics must be judged against the train-only climatology, "
        "which is a strong seasonal/spatial baseline for this reanalysis target.",
        "",
    ])
    (base / "comparison.md").write_text(content, encoding="utf-8")
    print(content)


if __name__ == "__main__":
    main()
