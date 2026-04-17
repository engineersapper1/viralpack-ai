// app\api\ad\plan\route.js
// app/api/ad/plan/route.js
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function normDuration(d) {
  const s = String(d || "").trim();
  if (s === "12" || s === "20" || s === "24") return s;
  return "12";
}

function clipsForDuration(duration) {
  if (duration === "20") return [12, 8];
  if (duration === "24") return [12, 12];
  return [4, 4, 4];
}

function split3plus2(arr) {
  const a = Array.isArray(arr) ? arr : [];
  return { first: a.slice(0, 3), second: a.slice(3, 5) };
}

function normalizePack(raw) {
  const pack = raw && typeof raw === "object" ? raw : {};
  const hooks = pack.hooks || pack.top_hooks || [];
  const overlays = pack.overlays || pack.on_screen_overlays || [];
  const captions = pack.captions || [];
  const hashtags = pack.hashtags || [];
  const scripts = pack.scripts || [];

  return {
    hooks: Array.isArray(hooks) ? hooks : [],
    overlays: Array.isArray(overlays) ? overlays : [],
    captions: Array.isArray(captions) ? captions : [],
    hashtags: Array.isArray(hashtags) ? hashtags : [],
    scripts: Array.isArray(scripts) ? scripts : [],
  };
}

function slicePackForDuration(pack, duration) {
  const hooks = Array.isArray(pack?.hooks) ? pack.hooks : [];
  const overlays = Array.isArray(pack?.overlays) ? pack.overlays : [];
  const captions = Array.isArray(pack?.captions) ? pack.captions : [];
  const hashtags = Array.isArray(pack?.hashtags) ? pack.hashtags : [];
  const scripts = Array.isArray(pack?.scripts) ? pack.scripts : [];

  if (String(duration) === "12") {
    const out = [];
    for (let i = 0; i < 3; i++) {
      out.push({
        hook: String(hooks[i] || "").trim(),
        script: String(scripts[i] || "").trim(),
        overlay: String(overlays[i] || "").trim(),
        caption: String(captions[i] || "").trim(),
        hashtag: String(hashtags[i] || "").trim(),
      });
    }
    return out;
  }

  if (String(duration) === "20") {
    const h = split3plus2(hooks);
    const o = split3plus2(overlays);
    const c = split3plus2(captions);
    const t = split3plus2(hashtags);
    const s = split3plus2(scripts);
    return [
      { hooks: h.first, overlays: o.first, captions: c.first, hashtags: t.first, scripts: s.first },
      { hooks: h.second, overlays: o.second, captions: c.second, hashtags: t.second, scripts: s.second },
    ];
  }

  const h = split3plus2(hooks);
  const o = split3plus2(overlays);
  const c = split3plus2(captions);
  const t = split3plus2(hashtags);
  const s = split3plus2(scripts);

  return [
    { hooks: h.first, overlays: o.first, captions: c.first, hashtags: t.first, scripts: s.first },
    { hooks: h.second, overlays: o.second, captions: c.second, hashtags: t.second, scripts: s.second },
  ];
}

function makeStyleLock(inputs) {
  const brand = inputs?.brand_name || "Brand";
  return {
    style_name: "vp_congruent_v1",
    brand,
    aspect_ratio: "9:16",
    camera: "steady gimbal, mild push-ins, shallow depth of field",
    lighting: "soft studio lighting, clean highlights",
    mood: "high-energy, premium, modern",
    continuity_rules: [
      "same protagonist look across clips",
      "same setting across clips",
      "same lighting and camera language across clips",
      "text overlays within safe margins",
      "single continuous shot, no jump cuts",
      "slow controlled motion, no fast camera moves",
      "finish early, then hold hero frame",
    ],
  };
}

function endRuleForSeconds(seconds) {
  if (seconds === 12) return "Finish by 10.5s, then HOLD 10.5–12.0s (no new motion).";
  if (seconds === 8) return "Finish by 6.8s, then HOLD 6.8–8.0s (no new motion).";
  if (seconds === 4) return "Finish by 3.2s, then HOLD 3.2–4.0s (no new motion).";
  return "Finish early, then hold to the end.";
}

function timelineForSeconds(seconds) {
  if (seconds === 4) return "Timeline: 0.0–0.5 hold, 0.5–3.5 speak/action, 3.5–4.0 hold stitch frame.";
  if (seconds === 8) return "Timeline: hook, proof, CTA by 6.8s, hold to 8.0s.";
  return "Timeline: hook, proof/demo, CTA by 10.5s, hold to 12.0s.";
}

function buildClipPrompt({ inputs, style_lock, seconds, beat, clip_index, total_clips, pack_slice }) {
  const brand = inputs?.brand_name || "Brand";
  const product = inputs?.product || "";
  const offer = inputs?.offer || "";
  const market = inputs?.market || inputs?.audience || "";

  const isTwelveFlow = String(total_clips) === "3" && Number(seconds) === 4;

  if (isTwelveFlow) {
    const hook = String(pack_slice?.hook || "").trim();
    const script = String(pack_slice?.script || "").trim() || hook;

    const overlayRaw = String(pack_slice?.overlay || "").trim();
    const overlay = overlayRaw && overlayRaw.length <= 42 ? overlayRaw : hook.split(/\s+/).slice(0, 6).join(" ");

    return [
      `Create a 4 second short-form vertical ad CLIP (${clip_index + 1} of 3).`,
      `Brand: ${brand}`,
      product ? `Product: ${product}` : "",
      offer ? `Offer/CTA: ${offer}` : "",
      market ? `Audience: ${market}` : "",
      "",
      `HOOK (concept): ${hook || "(none)"}`,
      `MICRO-SCRIPT (speak 0.5–3.5s): ${script}`,
      `SIMPLE OVERLAY IDEA (do NOT burn in): ${overlay}`,
      "",
      "Continuity lock: same protagonist, outfit, setting, lighting across all 3 clips.",
      "Stitch buffers: HOLD 0.0–0.5s, ACT 0.5–3.5s, HOLD 3.5–4.0s.",
      "",
      "Hard rules:",
      "- Vertical 9:16, steady camera, no jump cuts.",
      "- No burned-in subtitles.",
      "- Only ONE overlay idea, leave safe margins.",
      "- Finish speaking by ~3.3s, then hold.",
    ].filter(Boolean).join("\n").trim();
  }

  const business = [
    `Brand: ${brand}`,
    product ? `Product: ${product}` : null,
    offer ? `Offer/CTA: ${offer}` : null,
    market ? `Audience: ${market}` : null,
  ].filter(Boolean).join("\n");

  return [
    `Create a ${seconds}s short-form ad video.`,
    business,
    "",
    `Style lock: ${style_lock.style_name}, ${style_lock.aspect_ratio}, ${style_lock.mood}.`,
    `Camera: ${style_lock.camera}. Lighting: ${style_lock.lighting}.`,
    "",
    "Rules:",
    "- Vertical 9:16, single continuous shot, no jump cuts.",
    "- No burned-in subtitles. Leave top 10% and bottom 15% clear.",
    "",
    `Beat: ${beat || "hook → proof → CTA"}`,
    timelineForSeconds(seconds),
    `End rule: ${endRuleForSeconds(seconds)}`,
  ].join("\n").trim();
}

async function readBody(req) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  if (ct.includes("application/json")) {
    const b = await req.json().catch(() => null);
    return { kind: "json", body: b || {} };
  }

  if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    const form = await req.formData();
    const obj = {};
    for (const [k, v] of form.entries()) obj[k] = v;
    return { kind: "form", body: obj, form };
  }

  const b = await req.json().catch(() => null);
  return { kind: "json", body: b || {} };
}

export async function POST(req) {
  try {
    const cookie = req.headers.get("cookie") || "";

    // Option A: trusted internal bypass
    const internalSecret = mustEnv("BETA_COOKIE_SECRET");
    const internalHeader = String(req.headers.get("x-vp-internal") || "").trim();
    const isInternal = internalHeader && internalHeader === internalSecret;

    if (!isInternal && !cookie.includes("vp_beta=")) {
      return json(401, { ok: false, error: "Access denied (missing beta cookie)" });
    }

    mustEnv("OPENAI_API_KEY");

    const { body } = await readBody(req);

    // duration can come from body.duration or body.inputs.duration, default 12
    const duration = normDuration(body.duration || body?.inputs?.duration);

    // Inputs can arrive via:
    // - JSON: { inputs: {..} }
    // - FormData: inputs = JSON string
    let inputs = body.inputs || body;
    if (typeof inputs === "string") {
      try { inputs = JSON.parse(inputs); } catch { inputs = null; }
    }
    if (!inputs || typeof inputs !== "object") {
      return json(400, { ok: false, error: "Missing inputs" });
    }

    // pack can arrive via:
    // - { viral_pack }, { viralPack }, { pack }, or body.produce.viral_pack, etc.
    let packRaw =
      body.viral_pack ||
      body.viralPack ||
      body.pack ||
      body?.produce?.viral_pack ||
      body?.produce?.viralPack ||
      body?.produce?.pack ||
      body?.produce?.viral_pack_json ||
      body?.produce?.viral_pack_result ||
      null;

    let pack = { hooks: [], overlays: [], captions: [], hashtags: [], scripts: [] };
    if (packRaw) {
      try {
        pack = normalizePack(typeof packRaw === "string" ? JSON.parse(packRaw) : packRaw);
      } catch {
        pack = { hooks: [], overlays: [], captions: [], hashtags: [], scripts: [] };
      }
    } else if (body?.produce?.ok) {
      // Best-effort: if produce returns hooks/overlays/captions/hashtags at top-level
      pack = normalizePack(body.produce);
    }

    const style_lock = makeStyleLock(inputs);
    const secondsList = clipsForDuration(duration);

    const beats =
      secondsList.length === 1
        ? ["hook → proof → CTA"]
        : secondsList[1] === 8
        ? ["hook → setup", "proof → CTA"]
        : ["hook → setup", "proof → CTA", "proof → CTA"];

    const packSlices = slicePackForDuration(pack, duration);

    const clips = secondsList.map((seconds, i) => ({
      clip_index: i,
      seconds,
      beat: beats[i] || "hook → proof → CTA",
      prompt: buildClipPrompt({
        inputs,
        style_lock,
        seconds,
        beat: beats[i],
        clip_index: i,
        total_clips: secondsList.length,
        pack_slice: packSlices[i] || packSlices[0],
      }),
    }));

    const plan = {
      ad_id: `ad_${Date.now()}`,
      duration,
      created_at: new Date().toISOString(),
      inputs,
      style_lock,
      clips,
      pack_used: packSlices,
    };

    return json(200, { ok: true, plan });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}