import copernicusmarine

catalogue = copernicusmarine.read_catalogue()

print("OSTIA SST:")
for p in catalogue.products:
    if "SST_GLO_SST_L4_REP_OBSERVATIONS" in p.product_id or "ostia" in p.product_id.lower() or "moi-00168" in str(p.doi):
        print(f"Product: {p.product_id}")
        for ds in p.datasets:
            print(f"  Dataset: {ds.dataset_id}")

print("\nSMAP/SMOS SSS:")
for p in catalogue.products:
    if "SSS_GLO_SSS_L4_REP_OBSERVATIONS" in p.product_id or "moi-00051" in str(p.doi):
        print(f"Product: {p.product_id}")
        for ds in p.datasets:
            print(f"  Dataset: {ds.dataset_id}")

print("\nDUACS SSH:")
for p in catalogue.products:
    if "SEALEVEL_GLO_PHY_L4_MY" in p.product_id or "moi-00145" in str(p.doi):
        print(f"Product: {p.product_id}")
        for ds in p.datasets:
            print(f"  Dataset: {ds.dataset_id}")

print("\nGLORYS Target:")
for p in catalogue.products:
    if "GLOBAL_MULTIYEAR_BGC" in p.product_id or "GLOBAL_REANALYSIS_PHY" in p.product_id or "moi-00021" in str(p.doi):
        print(f"Product: {p.product_id}")
        for ds in p.datasets:
            print(f"  Dataset: {ds.dataset_id}")
