// app/api/ad/render/route.js
// app/api/ad/render/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import path from "path";
import fs from "fs";

import { ensureRunDir, writeJson, writeText } from "../../../../lib/vp_runs.js";

import {
  ffprobeDurationSeconds,
  ffmpegConcat,
  ffmpegXfadeStitch,
  detectSceneCuts,
} from "../../../../lib/ffmpeg.js";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req) {
  try {
    // Option A: trusted internal bypass
    const cookie = req.headers.get("cookie") || "";
    const internalSecret = process.env.BETA_COOKIE_SECRET || "";
    const internalHeader = String(req.headers.get("x-vp-internal") || "").trim();
    const isInternal = internalSecret && internalHeader === internalSecret;

    if (!isInternal && !cookie.includes("vp_beta=")) {
      return json(401, { ok: false, error: "Access denied (missing beta cookie)" });
    }

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;
    if (!plan) return json(400, { ok: false, error: "Missing plan" });

    const runId =
      plan?.run_id ||
      `VP2_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

    const runRoot = ensureRunDir(runId);
    const genDir = ensureRunDir(runId, "generation");
    const metaDir = ensureRunDir(runId, "meta");

    writeJson(path.join(metaDir, "plan.json"), plan);

    // Expected: plan.clips = [{ id, path }] or plan.render.clips = [...]
    const clips = Array.isArray(plan?.clips)
      ? plan.clips
      : Array.isArray(plan?.render?.clips)
      ? plan.render.clips
      : null;

    if (!clips || clips.length < 1) {
      return json(400, { ok: false, error: "Plan has no clips to stitch" });
    }

    // Collect clip paths
    const inputPaths = [];
    for (const c of clips) {
      const p = c?.path || c?.file || c?.mp4;
      if (p) inputPaths.push(p);
    }

    if (inputPaths.length < 1) {
      return json(400, { ok: false, error: "No valid clip paths in plan" });
    }

    const outMp4 = path.join(genDir, "stitched.mp4");

    // Prefer concat, fallback to xfade chain
    let stitched = null;
    try {
      stitched = await ffmpegConcat({ inputPaths, outputPath: outMp4, fps: 30 });
    } catch (e) {
      let cur = inputPaths[0];
      for (let i = 1; i < inputPaths.length; i++) {
        const next = inputPaths[i];
        const tmpOut = path.join(genDir, `xfade_${i}.mp4`);
        await ffmpegXfadeStitch({
          inputA: cur,
          inputB: next,
          outputPath: tmpOut,
          xfadeSeconds: 0.25,
          fps: 30,
        });
        cur = tmpOut;
      }
      fs.copyFileSync(cur, outMp4);
      stitched = outMp4;
    }

    const dur = await ffprobeDurationSeconds(stitched);
    writeText(path.join(metaDir, "stitched_duration.txt"), String(dur ?? ""));

    // Keep export alive, ignore failures
    try {
      await detectSceneCuts({ inputPath: stitched });
    } catch {
      // no-op
    }

    return json(200, {
      ok: true,
      run_id: runId,
      stitched_path: stitched,
      stitched_duration: dur,
      run_root: runRoot,
    });
  } catch (e) {
    return json(500, {
      ok: false,
      error: String(e?.message || e),
      cause: String(e?.cause || ""),
    });
  }
}