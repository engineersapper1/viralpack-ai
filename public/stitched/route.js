/**
 * public/stitched/route.js
 *
 * NOTE: This file is not a Next.js App Router API route (it's under /public).
 * It exists as a helper module for stitching clips in some local workflows.
 *
 * If you want a real API route, it should live under /app/api/.../route.js.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";

function ffmpegBin() {
  // Allow explicit override on Windows.
  return process.env.FFMPEG_PATH || "ffmpeg";
}

function normalizeForConcat(p) {
  if (!p) return p;
  let s = String(p).trim();
  if (s.startsWith("pipe:")) s = s.slice("pipe:".length);
  return s.replace(/\\/g, "/");
}

export async function runFfmpegConcat({ inputPaths, outputPath, fps = 30 }) {
  const listFile = path.join(
    os.tmpdir(),
    `vp_concat_${Date.now()}_${Math.random().toString(16).slice(2)}.txt`
  );

  const content = inputPaths
    .filter(Boolean)
    .map((p) => `file '${normalizeForConcat(p).replace(/'/g, "'\\''")}'`)
    .join("\n");

  fs.writeFileSync(listFile, content, "utf8");

  try {
    await new Promise((resolve, reject) => {
      const args = [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-protocol_whitelist",
        "file,pipe,crypto,data",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        listFile,
        "-r",
        String(fps),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        outputPath,
      ];

      const child = spawn(ffmpegBin(), args, { stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) return resolve();
        reject(new Error(`ffmpeg concat failed (code ${code}): ${stderr}`));
      });
    });

    return outputPath;
  } finally {
    try {
      fs.unlinkSync(listFile);
    } catch {
      // ignore
    }
  }
}
