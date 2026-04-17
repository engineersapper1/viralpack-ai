# ViralPack V3, Quiz Funnel Build

ViralPack V3 pivots the product around short-form quiz funnels.

## What it does

* Generates a quiz-centered viral pack
* Builds a two-segment video plan by default
* Uses the longest practical single-clip duration for the selected provider
* Defaults to OpenAI video generation, because it currently offers the longest single API clip among the providers tracked in this project
* Stores every run locally under `vp\\\\\\\_runs/`
* Exposes a direct route to the final stitched video

## Default funnel shape

* Segment 1 = hook and introduce the quiz
* Segment 2 = demonstrate the quiz or game mechanic, then CTA

## Supported planning providers

* `openai`, default operational path
* `runway`, planning cap tracked, rendering stub unless you wire your own API route
* `xai`, planning cap tracked, rendering stub unless you wire your own API route

## Quick start, fresh desktop

1. Install Node.js 20+
2. Copy `.env.example` to `.env.local`
3. Fill in at least:

   * `OPENAI\\\\\\\_API\\\\\\\_KEY`
   * `XAI\\\\\\\_API\\\\\\\_KEY`
   * `BETA\\\\\\\_KEYS`
   * `BETA\\\\\\\_COOKIE\\\\\\\_SECRET`
4. In PowerShell:

   * `npm install`
   * `npm run dev`
5. Open `http://localhost:3000`
6. Verify beta key in Studio
7. Generate pack, then plan, then render

## Windows note

FFmpeg and FFprobe must be installed and available on PATH for stitching.

## Run output

Every render writes files into:

* `vp\\\\\\\_runs/<run\\\\\\\_id>/meta`
* `vp\\\\\\\_runs/<run\\\\\\\_id>/clips`
* `vp\\\\\\\_runs/<run\\\\\\\_id>/assembly`

## Routes

* `/` landing page
* `/generator` pack generator
* `/studio` quiz funnel studio
* `/api/produce` generate quiz-centered pack
* `/api/ad/plan` build segmented video plan
* `/api/ad/generate\\\\\\\_clips` render clips
* `/api/ad/render` stitch clips
* `/api/runs/\\\\\\\[run\\\\\\\_id]/final` stream the stitched mp4

