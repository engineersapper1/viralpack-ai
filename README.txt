
ViralPack V2.6.4 Patch
----------------------

Changes:
1) Forces 3 x 4s clip structure for all renders.
2) Fixes audio issue by:
   - Ensuring audio stream exists in stitched output
   - Adding silent audio track if source clips have no audio
   - Normalizing audio at final pass

Environment variables:
VP_MAX_PASSES=3
VP_RUNS_DIR=vp_runs
