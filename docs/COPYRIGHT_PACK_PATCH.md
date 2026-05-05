# Copyright Pack Patch

This patch adds a website-native Copyright Pack flow to ViralPack.

## New routes

- `GET /copyright-pack`
- `POST /api/copyright-pack/build`
- `GET /api/copyright-pack/download?run_id=...`

## What it builds

- `derived_manifest.csv`
- `filing_worksheet.csv`
- `STEP_BY_STEP.md`
- `NEXT_STEPS.md`
- `run_report.json`
- `cloud_receipt.json`
- `copyright_vault/...`
- `batches/<bucket>/<bucket>.zip`
- root package zip for the full run

## Cloud setup

### Dropbox

Set:
- `DROPBOX_ACCESS_TOKEN`

### Google Drive

Set:
- `GDRIVE_ACCESS_TOKEN`
- `GDRIVE_FOLDER_ID` optional

Google Drive in this patch uses a bearer access token, not service-account signing.
That keeps the site-side mesh light, but you will want a proper OAuth refresh flow next.

## Notes

- The route expects a ViralPack-style publish export JSON payload.
- It supports local server asset paths, remote asset URLs, and caption-only text posts.
- ZIP creation is handled locally in `lib/zip.js`, no extra dependency required.
