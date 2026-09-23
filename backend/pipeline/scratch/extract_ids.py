import subprocess
import json

def get_cmems_dataset_id(doi, keyword=""):
    result = subprocess.run(
        ["copernicusmarine", "describe", "--contains", doi, "--return-fields", "dataset_id"],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"Error for {doi}: {result.stderr}")
        return None
    try:
        data = json.loads(result.stdout)
        # Parse the JSON to find the dataset_id
        for product in data.get("products", []):
            for dataset in product.get("datasets", []):
                ds_id = dataset.get("dataset_id", "")
                if keyword in ds_id.lower() or not keyword:
                    print(f"Found {doi} -> {ds_id}")
                    return ds_id
    except json.JSONDecodeError:
        print(f"Failed to decode JSON for {doi}")
    return None

if __name__ == "__main__":
    get_cmems_dataset_id("moi-00168", "my") # SST OSTIA Reprocessed
    get_cmems_dataset_id("moi-00051", "my") # SSS Reprocessed
    get_cmems_dataset_id("moi-00145", "my") # SSH DUACS Reprocessed
    get_cmems_dataset_id("moi-00021", "")   # Target GLORYS
