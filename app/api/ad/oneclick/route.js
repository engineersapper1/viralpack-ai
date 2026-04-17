//app/api/ad/oneclick/route.js

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { POST as producePOST } from "../../produce/route.js";
import { POST as planPOST } from "../plan/route.js";
import { POST as generateClipsPOST } from "../generate_clips/route.js";
import { POST as renderPOST } from "../render/route.js";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing env var: ${name}`);
  }
  return String(v).trim();
}

async function readBody(req) {
  const ct = req.headers.get("content-type") || "";

  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const durationRaw = fd.get("duration");
    const inputsRaw = fd.get("inputs");

    let inputs = {};
    try {
      inputs = inputsRaw ? JSON.parse(String(inputsRaw)) : {};
    } catch {
      inputs = {};
    }

    return {
      duration: durationRaw ? Number(durationRaw) : null,
      inputs,
    };
  }

  const b = await req.json().catch(() => ({}));
  return b || {};
}

function clamp(n, lo, hi) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.max(lo, Math.min(hi, v));
}

export async function POST(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const internalSecret = mustEnv("BETA_COOKIE_SECRET");

    const body = await readBody(req);

    const inputs = body?.inputs || body || {};
    const durationSeconds = clamp(body?.duration, 3, 6) ?? 6;

    const size = String(body?.size || "720x1280");
    const maxPollSeconds = Number(body?.max_poll_seconds || 180);
    const pollEveryMs = Number(body?.poll_every_ms || 2000);

    const internalHeaders = {
      "Content-Type": "application/json",
      cookie,
      "x-vp-internal": internalSecret,
    };

    // 1) Produce
    const produceReq = new Request("http://local/api/produce", {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({
        mode: "video",
        top_k: 3,
        ...inputs,
      }),
    });

    const produceRes = await producePOST(produceReq);
    const produceJson = await produceRes.json().catch(() => null);

    if (!produceRes.ok || !produceJson?.ok) {
      return json(500, {
        ok: false,
        step: "produce",
        status: produceRes.status,
        error: produceJson,
      });
    }

    // 2) Plan
    const planReq = new Request("http://local/api/ad/plan", {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({
        produce: produceJson,
        inputs,
      }),
    });

    const planRes = await planPOST(planReq);
    const planJson = await planRes.json().catch(() => null);

    if (!planRes.ok || !planJson?.ok) {
      return json(500, {
        ok: false,
        step: "plan",
        status: planRes.status,
        error: planJson,
      });
    }

    const planObj = planJson?.plan || planJson;

    // 3) Generate Clips
    const genReq = new Request("http://local/api/ad/generate_clips", {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({
        plan: planObj,
        size,
        max_poll_seconds: maxPollSeconds,
        poll_every_ms: pollEveryMs,
      }),
    });

    const genRes = await generateClipsPOST(genReq);
    const genJson = await genRes.json().catch(() => null);

    if (!genRes.ok || !genJson?.ok) {
      return json(500, {
        ok: false,
        step: "generate_clips",
        status: genRes.status,
        error: genJson,
      });
    }

    const planWithClips = genJson?.plan || planObj;

    // 4) Render
    const renderReq = new Request("http://local/api/ad/render", {
      method: "POST",
      headers: internalHeaders,
      body: JSON.stringify({
        plan: planWithClips,
        durationSeconds,
      }),
    });

    const renderRes = await renderPOST(renderReq);
    const renderJson = await renderRes.json().catch(() => null);

    if (!renderRes.ok || !renderJson?.ok) {
      return json(500, {
        ok: false,
        step: "render",
        status: renderRes.status,
        error: renderJson,
      });
    }

    return json(200, {
      ok: true,
      produce: produceJson,
      plan: planJson,
      generate_clips: genJson,
      render: renderJson,
      durationSeconds,
    });
  } catch (e) {
    return json(500, {
      ok: false,
      error: String(e?.message || e),
    });
  }
}