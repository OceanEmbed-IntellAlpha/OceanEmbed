"""Train/evaluate the MSE-only BaselineModel U-Net on the Phase 5 protocol."""

from __future__ import annotations

import json
import logging
import random
import sys
import time
from pathlib import Path
from typing import Any

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import torch
import xarray as xr
import yaml
from torch.amp import GradScaler, autocast
from torch.utils.data import DataLoader

_BACKEND = Path(__file__).resolve().parents[2]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from ocean_embed.data import OceanEmbedDataset, denormalize_target, load_normalization_stats
from ocean_embed.data.splits import make_date_range_split
from ocean_embed.grid import SIH_DEPTHS
from ocean_embed.models.baseline import BaselineModel

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s - %(message)s")
logger = logging.getLogger("train_unet")


class RunningMetrics:
    def __init__(self) -> None:
        self.n = 0; self.sse = self.sae = self.se = 0.0; self.sp = self.st = self.sp2 = self.st2 = self.spt = 0.0

    def update(self, p: np.ndarray, t: np.ndarray) -> None:
        p, t = p.ravel().astype(np.float64), t.ravel().astype(np.float64)
        ok = np.isfinite(p) & np.isfinite(t); p, t = p[ok], t[ok]; e = p - t
        self.n += len(p); self.sse += float(np.dot(e,e)); self.sae += float(np.abs(e).sum()); self.se += float(e.sum())
        self.sp += float(p.sum()); self.st += float(t.sum()); self.sp2 += float(np.dot(p,p)); self.st2 += float(np.dot(t,t)); self.spt += float(np.dot(p,t))

    def result(self) -> dict[str, float]:
        n=max(self.n,1); mp,mt=self.sp/n,self.st/n; vp,vt=self.sp2-n*mp**2,self.st2-n*mt**2; cov=self.spt-n*mp*mt
        return {"rmse":float(np.sqrt(self.sse/n)),"mae":float(self.sae/n),"bias":float(self.se/n),"pearson_r":float(cov/np.sqrt(vp*vt)) if vp>0 and vt>0 else float("nan"),"r2":float(1-self.sse/vt) if vt>0 else float("nan")}


def evaluate(model: BaselineModel, loader: DataLoader, device: torch.device, stats: dict) -> dict[str, Any]:
    model.eval(); overall=RunningMetrics(); pd=[RunningMetrics() for _ in SIH_DEPTHS]
    bands={"ML_0-50m":(0,50),"thermocline_50-200m":(50,200),"deep_200-1000m":(200,1000)}; bm={k:RunningMetrics() for k in bands}; depths=np.asarray(SIH_DEPTHS)
    with torch.no_grad():
        for batch in loader:
            x=batch["input"].to(device,non_blocking=True); t=batch["target"].to(device,non_blocking=True)
            with autocast("cuda",enabled=device.type=="cuda"): p=model(x)
            p=denormalize_target(p.float().cpu().numpy(),stats); t=denormalize_target(t.float().cpu().numpy(),stats)
            overall.update(p,t)
            for i in range(15): pd[i].update(p[:,i],t[:,i])
            for name,(lo,hi) in bands.items(): bm[name].update(p[:,(depths>=lo)&(depths<=hi)],t[:,(depths>=lo)&(depths<=hi)])
    return {"overall":overall.result(),"depth_bands":{k:v.result() for k,v in bm.items()},"per_depth_rmse":{str(z):pd[i].result()["rmse"] for i,z in enumerate(SIH_DEPTHS)}}


def main() -> None:
    root=Path(__file__).resolve().parents[3]; out=root/"runs"/"_baselines"/"unet"; out.mkdir(parents=True,exist_ok=True)
    random.seed(42); np.random.seed(42); torch.manual_seed(42); torch.cuda.manual_seed_all(42)
    device=torch.device("cuda" if torch.cuda.is_available() else "cpu")
    with open(root/"backend/ocean_embed/configs/data_config.yaml",encoding="utf-8") as f: sc=yaml.safe_load(f)["splits"]
    sf=xr.open_zarr(root/"data/processed/surface_features.zarr"); splits=make_date_range_split(sf.time.values,sc["train_range"],sc["val_range"],sc["test_range"]); sf.close()
    stats_path=root/"data/processed/normalization_stats_v3.json"; stats=load_normalization_stats(stats_path)
    train_ds=OceanEmbedDataset(root/"data/processed/surface_features.zarr",root/"data/processed/target_glorys.zarr",stats_path,indices=splits["train"],mode="train",crop_size=(51,121))
    val_ds=OceanEmbedDataset(root/"data/processed/surface_features.zarr",root/"data/processed/target_glorys.zarr",stats_path,indices=splits["val"],mode="eval")
    test_ds=OceanEmbedDataset(root/"data/processed/surface_features.zarr",root/"data/processed/target_glorys.zarr",stats_path,indices=splits["test"],mode="eval")
    # Workers intentionally disabled: xarray/Zarr handles are not spawn-safe on Windows.
    train_loader=DataLoader(train_ds,batch_size=2,shuffle=True,num_workers=0,pin_memory=device.type=="cuda")
    val_loader=DataLoader(val_ds,batch_size=2,shuffle=False,num_workers=0,pin_memory=device.type=="cuda")
    test_loader=DataLoader(test_ds,batch_size=2,shuffle=False,num_workers=0,pin_memory=device.type=="cuda")
    model=BaselineModel(in_channels=7,out_depths=15,base_channels=32,encoder_depth=4,dropout=0.2).to(device)
    optimizer=torch.optim.AdamW(model.parameters(),lr=1e-3,weight_decay=3e-4); scaler=GradScaler("cuda",enabled=device.type=="cuda")
    best=float("inf"); history=[]; peak=0.0
    logger.info("Device=%s parameters=%d",device,model.count_parameters())
    for epoch in range(20):
        t0=time.perf_counter(); model.train(); optimizer.zero_grad(set_to_none=True); losses=[]
        for step,batch in enumerate(train_loader):
            x=batch["input"].to(device,non_blocking=True); y=batch["target"].to(device,non_blocking=True)
            with autocast("cuda",enabled=device.type=="cuda"):
                loss=((model(x)-y)**2).mean()
            scaler.scale(loss/4).backward(); losses.append(float(loss))
            if (step+1)%4==0 or step+1==len(train_loader):
                scaler.unscale_(optimizer); torch.nn.utils.clip_grad_norm_(model.parameters(),1.0); scaler.step(optimizer); scaler.update(); optimizer.zero_grad(set_to_none=True)
        if device.type=="cuda": peak=max(peak,torch.cuda.max_memory_allocated()/1024**3)
        val=evaluate(model,val_loader,device,stats); rec={"epoch":epoch,"train_loss":float(np.mean(losses)),"val":val,"epoch_seconds":time.perf_counter()-t0,"peak_vram_gb":peak}; history.append(rec)
        logger.info("epoch=%d train_loss=%.5f val_rmse=%.5f val_r2=%.5f (%.1fs)",epoch,rec["train_loss"],val["overall"]["rmse"],val["overall"]["r2"],rec["epoch_seconds"])
        torch.save({"epoch":epoch,"model_state_dict":model.state_dict(),"optimizer_state_dict":optimizer.state_dict(),"history":history},out/"checkpoint_last.pt")
        if val["overall"]["rmse"]<best:
            best=val["overall"]["rmse"]; torch.save({"epoch":epoch,"model_state_dict":model.state_dict(),"optimizer_state_dict":optimizer.state_dict(),"history":history},out/"checkpoint_best.pt")
        with open(out/"metrics.json","w",encoding="utf-8") as f: json.dump({"history":history,"peak_vram_gb":peak},f,indent=2)
    ckpt=torch.load(out/"checkpoint_best.pt",map_location=device,weights_only=False); model.load_state_dict(ckpt["model_state_dict"]); test=evaluate(model,test_loader,device,stats)
    with open(out/"test_metrics.json","w",encoding="utf-8") as f: json.dump(test,f,indent=2)
    fig,ax=plt.subplots(figsize=(8,5)); ax.plot(SIH_DEPTHS,list(test["per_depth_rmse"].values()),marker="o"); ax.set(xlabel="Depth (m)",ylabel="Test RMSE (°C)",title="Baseline U-Net — Test RMSE vs depth"); ax.grid(alpha=.3); fig.savefig(out/"test_rmse_vs_depth.png",dpi=140,bbox_inches="tight"); plt.close(fig)
    train_ds.close();val_ds.close();test_ds.close(); print(json.dumps(test,indent=2))


if __name__=="__main__": main()
