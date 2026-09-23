import copernicusmarine
import os
from dotenv import load_dotenv

load_dotenv()

dataset_ids = [
    "METOFFICE-GLO-SST-L4-REP-OBS-SST",
    "cmems_obs-mob_glo_phy-sss_my_multi_P1D",
    "c3s_obs-sl_glo_phy-ssh_my_twosat-l4-duacs-0.25deg_P1D"
]

for ds_id in dataset_ids:
    try:
        copernicusmarine.subset(
            dataset_id=ds_id,
            username=os.getenv("COPERNICUSMARINE_SERVICE_USERNAME"),
            password=os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD"),
            start_datetime="2020-01-01",
            end_datetime="2020-01-01",
            minimum_longitude=45.0,
            maximum_longitude=45.1,
            minimum_latitude=5.0,
            maximum_latitude=5.1,
            output_filename=f"test_{ds_id}.nc",
            output_directory="./data/raw",
            force_download=True
        )
        print(f"SUCCESS with {ds_id}")
    except Exception as e:
        print(f"FAILED with {ds_id}:", e)
