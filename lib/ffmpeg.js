// lib/ffmpeg.js
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      if (code === 0) return resolve({ out, err });
      const e = new Error(`${cmd} failed (code ${code})\n${err || out}`);
      e.code = code;
      e.stderr = err;
      e.stdout = out;
      reject(e);
    });
  });
}

// Convert paths for ffmpeg concat demuxer
function normalizeForFfmpeg(p) {
  let s = String(p || "");
  if (s.startsWith("pipe:")) s = s.slice("pipe:".length);
  // IMPORTANT: convert backslashes to forward slashes (this was your unterminated regex bug)
  s = s.replace(/\\/g, "/");
  return s;
}

export async function ffprobeDurationSeconds(inputPath) {
  const args = [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    inputPath,
  ];
  const { out } = await run("ffprobe", args);
  const v = parseFloat(String(out || "").trim());
  return Number.isFinite(v) ? v : null;
}

export async function ffmpegConcat({ inputPaths, outputPath, fps = 30 }) {
  if (!Array.isArray(inputPaths) || inputPaths.length < 1) {
    throw new Error("ffmpegConcat: inputPaths must be a non-empty array");
  }

  const outDir = path.dirname(outputPath);
  fs.mkdirSync(outDir, { recursive: true });

  // Write concat list file next to output
  const concatPath = path.join(outDir, `concat_${Date.now()}.txt`);
  const lines = inputPaths.map((p) => `file '${normalizeForFfmpeg(p).replace(/'/g, "'\\''")}'`);
  fs.writeFileSync(concatPath, lines.join("\n"), "utf8");

  try {
    const args = [
      "-y",
      "-hide_banner",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatPath,
      "-r",
      String(fps),
      "-c",
      "copy",
      outputPath,
    ];
    await run("ffmpeg", args);
    return outputPath;
  } finally {
    // best-effort cleanup
    try {
      fs.unlinkSync(concatPath);
    } catch {}
  }
}

export async function ffmpegXfadeStitch({
  inputA,
  inputB,
  outputPath,
  xfadeSeconds = 0.25,
  fps = 30,
}) {
  const outDir = path.dirname(outputPath);
  fs.mkdirSync(outDir, { recursive: true });

  const durA = await ffprobeDurationSeconds(inputA);
  if (!durA || durA <= xfadeSeconds) {
    throw new Error(`ffmpegXfadeStitch: bad duration for A (${durA})`);
  }

  const offset = Math.max(0, durA - xfadeSeconds);

  const args = [
    "-y",
    "-hide_banner",
    "-i",
    inputA,
    "-i",
    inputB,
    "-filter_complex",
    [
      `[0:v][1:v]xfade=transition=fade:duration=${xfadeSeconds}:offset=${offset},format=yuv420p[v]`,
      `[0:a][1:a]acrossfade=d=${xfadeSeconds}[a]`,
    ].join(";"),
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-r",
    String(fps),
    outputPath,
  ];

  await run("ffmpeg", args);
  return outputPath;
}

export async function ffmpegForceDuration12s({ inputPath, outputPath, fps = 30 }) {
  const outDir = path.dirname(outputPath);
  fs.mkdirSync(outDir, { recursive: true });

  const args = [
    "-y",
    "-hide_banner",
    "-i",
    inputPath,
    "-t",
    "12",
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
  ];
  await run("ffmpeg", args);
  return outputPath;
}

export async function detectSceneCuts({ inputPath }) {
  // Optional helper, safe “exists” export to satisfy imports.
  // You can expand later. For now, return empty.
  return [];
}