export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env var: ${name}`);
  return String(v).trim();
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function makeId(prefix = "stitch") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
}

async function fetchOpenAIVideoContentToFile({ apiKey, videoId, outPath }) {
  const res = await fetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to fetch content for ${videoId}: ${res.status} ${txt}`);
  }

  const ab = await res.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(ab));
}

function runFfmpegConcat({ inputPaths, outputPath, fps = 30 }) {
  return new Promise((resolve, reject) => {
    // Use concat demuxer with a list file
    const listFile = outputPath.replace(/\.mp4$/i, ".txt");
    const lines = inputPaths.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
    fs.writeFileSync(listFile, lines, "utf8");

    // Re-encode for reliability (copy can fail if streams differ)
    // Most Sora clips have no audio. We force -an to avoid audio concat issues.
    const args = [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFile,
      "-an",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-r",
      String(fps),
      "-movflags",
      "+faststart",
      outputPath,
    ];

    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve({ ok: true });
      else reject(new Error(`ffmpeg failed (code ${code}): ${stderr.slice(-2000)}`));
    });
  });
}

export async function POST(req) {
  try {
    // Beta gate
    const cookie = req.headers.get("cookie") || "";
    if (!cookie.includes("vp_beta=")) {
      return json(401, { ok: false, error: "Access denied (missing beta cookie)" });
    }

    const OPENAI_API_KEY = mustEnv("OPENAI_API_KEY");
    mustEnv("BETA_COOKIE_SECRET");

    const body = await req.json().catch(() => null);
    if (!body?.clip_ids || !Array.isArray(body.clip_ids) || body.clip_ids.length < 2) {
      return json(400, { ok: false, error: "clip_ids must be an array of 2+ video ids" });
    }

    const clipIds = body.clip_ids.map((x) => String(x || "").trim()).filter(Boolean);
    if (clipIds.length < 2) return json(400, { ok: false, error: "clip_ids are empty" });

    // Temp work dir
    const workDir = path.join(os.tmpdir(), "viralpack_stitch");
    ensureDir(workDir);

    const stitchId = makeId("stitch");
    const outMp4 = path.join(workDir, `${stitchId}.mp4`);

    // Download clip mp4s to local temp files
    const inputPaths = [];
    for (let i = 0; i < clipIds.length; i++) {
      const vid = clipIds[i];
      const inPath = path.join(workDir, `${stitchId}_clip${String(i + 1).padStart(2, "0")}.mp4`);
      await fetchOpenAIVideoContentToFile({ apiKey: OPENAI_API_KEY, videoId: vid, outPath: inPath });
      inputPaths.push(inPath);
    }

    // Stitch
    await runFfmpegConcat({ inputPaths, outputPath: outMp4, fps: 30 });

    // Return URL to stream stitched mp4
    const video_url = `/api/ad/stitch/content/${stitchId}`;

    return json(200, {
      ok: true,
      stitch_id: stitchId,
      clip_ids: clipIds,
      video_url,
      note: "Stitched MP4 generated locally via ffmpeg.",
    });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
