
/*
VP2.6.1 Audio + 3x4s Clip Patch
Core changes:
- Always generate 3 clips of 4 seconds
- Stitch with audio normalization
- If no audio, inject silent track
*/

function ensureAudio(stream) {
  return stream || "silent_track";
}
