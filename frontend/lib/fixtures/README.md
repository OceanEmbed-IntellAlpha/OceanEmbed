# Validation fixtures

`regional_validation.json` mirrors the provenance-backed values in
`data/argo/regional_stats.json` as of 2026-09-22. It is a temporary frontend
fallback only. Replace it with a live call to `/api/validation/regional` before
publishing or treating frontend-rendered validation values as authoritative.
