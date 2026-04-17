//app/api/ad/generate_clips/

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "fs";
import path from "path";

import { ensureRunDir, writeJson, writeText } from "../../../../lib/vp_runs.js";

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function secondsToString(s) {
  const n = Number(s);
  if (!Number.isFinite(n)) return "4";
  if (n === 4 || n === 8 || n === 12) return String(n);
  return n < 6 ? "4" : n < 10 ? "8" : "12";
}

function clampInt(n, lo, hi, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, Math.trunc(v)));
}

async function openaiCreateVideo({ apiKey, model, prompt, seconds, size }) {
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("seconds", seconds);
  form.append("size", size);

  const r = await fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const data = await r.json().catch(() => null);

  if (!r.ok) {
    const msg = data?.error?.message || `OpenAI /videos failed (${r.status})`;
    throw new Error(msg);
  }

  if (!data?.id) throw new Error("OpenAI /videos returned no id");
  return data;
}

async function openaiGetVideoStatus({ apiKey, videoId }) {
  const r = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await r.json().catch(() => null);

  if (!r.ok) {
    const msg = data?.error?.message || `OpenAI get video failed (${r.status})`;
    throw new Error(msg);
  }
  return data;
}

async function openaiDownloadVideo({ apiKey, videoId }) {
  const r = await fetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!r.ok) {
    let msg = `OpenAI download video failed (${r.status})`;
    try {
      const data = await r.json();
      msg = data?.error?.message || msg;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  const buf = Buffer.from(await r.arrayBuffer());
  return buf;
}

export async function POST(req) {
  try {
    const isProd = process.env.NODE_ENV === "production";

    if (isProd) {
      const cookie = req.headers.get("cookie") || "";
      const internalSecret = mustEnv("BETA_COOKIE_SECRET");
      const internalHeader = String(req.headers.get("x-vp-internal") || "").trim();
      const isInternal = internalHeader && internalHeader === internalSecret;

      if (!isInternal && !cookie.includes("vp_beta=1")) {
        return json(401, { ok: false, error: "Access denied (missing beta cookie)" });
      }
    }

    const body = await req.json().catch(() => ({}));
    const plan = body?.plan;

    if (!plan) return json(400, { ok: false, error: "Missing plan" });

    const OPENAI_API_KEY = mustEnv("OPENAI_API_KEY");

    // Respect your env naming: OPENAI_VIDEO_MODEL
    const VIDEO_MODEL = String(process.env.OPENAI_VIDEO_MODEL || process.env.VIDEO_MODEL || "sora-2").trim();
    const size = String(body?.size || "720x1280");

    // Default to 10 minutes, clamp to 30 seconds .. 20 minutes
    const maxPollSeconds = clampInt(body?.max_poll_seconds, 30, 1200, 600);

    // Polling cadence: start fast, then slow down after ~60s
    const pollEveryMsFast = clampInt(body?.poll_every_ms, 1000, 10000, 2000);
    const pollEveryMsSlow = clampInt(body?.poll_every_ms_slow, 2000, 30000, 5000);

    const runId =
      plan?.run_id ||
      plan?.ad_id ||
      `VP2_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;

    plan.run_id = runId;

    const runRoot = ensureRunDir(runId);
    const clipsDir = ensureRunDir(runId, "clips");
    const metaDir = ensureRunDir(runId, "meta");

    writeJson(path.join(metaDir, "plan_in.json"), plan);

    const planClips = Array.isArray(plan?.clips) ? plan.clips : [];
    if (!planClips.length) return json(400, { ok: false, error: "Plan has no clips" });

    const results = [];

    for (let i = 0; i < planClips.length; i++) {
      const c = planClips[i] || {};
      const prompt = String(c.prompt || "").trim();

      if (!prompt) {
        results.push({ ok: false, clip_index: i, error: "Missing clip prompt" });
        continue;
      }

      const seconds = secondsToString(c.seconds || 4);

      const created = await openaiCreateVideo({
        apiKey: OPENAI_API_KEY,
        model: VIDEO_MODEL,
        prompt,
        seconds,
        size,
      });

      const videoId = created.id;

      const deadline = Date.now() + maxPollSeconds * 1000;
      let statusObj = created;

      const pollStart = Date.now();

      while (Date.now() < deadline) {
        statusObj = await openaiGetVideoStatus({ apiKey: OPENAI_API_KEY, videoId });

        const st = String(statusObj?.status || "");
        if (st === "completed") break;
        if (st === "failed" || st === "canceled") {
          throw new Error(`Video job ${videoId} ${st}`);
        }

        const elapsed = Date.now() - pollStart;
        const wait = elapsed > 60000 ? pollEveryMsSlow : pollEveryMsFast;
        await sleep(wait);
      }

      if (String(statusObj?.status) !== "completed") {
        // Persist useful debug so you can resume later
        writeJson(path.join(metaDir, `clip_${String(i + 1).padStart(2, "0")}_timeout.json`), {
          clip_index: i,
          seconds,
          video_id: videoId,
          size,
          model: VIDEO_MODEL,
          prompt,
          max_poll_seconds: maxPollSeconds,
          last_status: statusObj,
        });

        throw new Error(`Video job ${videoId} timed out after ${maxPollSeconds}s`);
      }

      const mp4Buf = await openaiDownloadVideo({ apiKey: OPENAI_API_KEY, videoId });

      const filename = `clip_${String(i + 1).padStart(2, "0")}_${seconds}s.mp4`;
      const outPath = path.join(clipsDir, filename);
      fs.writeFileSync(outPath, mp4Buf);

      results.push({
        ok: true,
        clip_index: i,
        seconds,
        video_id: videoId,
        path: outPath,
      });

      writeJson(path.join(metaDir, `clip_${String(i + 1).padStart(2, "0")}.json`), {
        clip_index: i,
        seconds,
        video_id: videoId,
        size,
        model: VIDEO_MODEL,
        prompt,
        output_path: outPath,
      });
    }

    const okAll = results.every((r) => r.ok);

    plan.render = plan.render || {};
    plan.render.clips = results
      .filter((r) => r.ok && r.path)
      .map((r) => ({
        clip_index: r.clip_index,
        seconds: r.seconds,
        video_id: r.video_id,
        path: r.path,
      }));

    writeJson(path.join(metaDir, "plan_with_clips.json"), plan);
    writeText(path.join(metaDir, "run_root.txt"), String(runRoot));

    if (!okAll) {
      return json(500, {
        ok: false,
        error: "One or more clips failed",
        run_id: runId,
        results,
        plan,
      });
    }

    return json(200, {
      ok: true,
      run_id: runId,
      run_root: runRoot,
      clips_dir: clipsDir,
      results,
      plan,
    });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
}