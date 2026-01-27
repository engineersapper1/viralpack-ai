export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- helpers ---
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

function clampStr(v, max = 400) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function clampArr(a, topK) {
  return Array.isArray(a)
    ? a.map((x) => String(x).trim()).filter(Boolean).slice(0, topK)
    : [];
}

// Best-effort extract TEXT from OpenAI Responses payload
function extractOutputText(resJson) {
  if (!resJson) return "";
  if (typeof resJson.output_text === "string" && resJson.output_text.trim()) {
    return resJson.output_text;
  }

  const out = resJson.output;
  if (!Array.isArray(out) || !out.length) return "";

  const parts = [];
  for (const item of out) {
    const content = item?.content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (typeof c?.text === "string") parts.push(c.text);
      if (c?.type === "output_text" && typeof c?.text === "string") parts.push(c.text);
      if (typeof c?.content === "string") parts.push(c.content);
    }
  }
  return parts.join("\n");
}

// Pull the FIRST valid JSON object from a string.
// Handles "}{", extra text, duplicated objects, etc.
function parseFirstJsonObject(text) {
  const s = String(text || "").trim();
  if (!s) return null;

  const firstBrace = s.indexOf("{");
  if (firstBrace < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      const candidate = s.slice(firstBrace, i + 1);
      try {
        return JSON.parse(candidate);
      } catch {
        return null;
      }
    }
  }

  return null;
}

// --- OpenAI (Responses API) ---
async function callOpenAIResponses({ apiKey, model, inputText }) {
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: inputText,
    }),
  });

  const data = await r.json().catch(() => null);

  if (!r.ok) {
    const msg =
      data?.error?.message ||
      data?.error?.type ||
      `OpenAI request failed (${r.status})`;
    throw new Error(msg);
  }

  const text = extractOutputText(data);
  return { raw: data, text };
}

// --- xAI (OpenAI-compatible chat completions) ---
async function callXaiChatCompletions({ apiKey, model, messages }) {
  const r = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
    }),
  });

  const data = await r.json().catch(() => null);

  if (!r.ok) {
    const msg =
      data?.error?.message ||
      data?.error ||
      `xAI request failed (${r.status})`;
    throw new Error(msg);
  }

  const text = data?.choices?.[0]?.message?.content || "";
  return { raw: data, text };
}

// --- route ---
export async function POST(req) {
  const startedAt = Date.now();

  try {
    // Fail-closed if cookie missing (middleware should enforce too)
    const cookie = req.headers.get("cookie") || "";
    if (!cookie.includes("vp_beta=")) {
      return json(401, { ok: false, error: "Access denied (missing beta cookie)" });
    }

    // Required env vars
    const OPENAI_API_KEY = mustEnv("OPENAI_API_KEY");
    const XAI_API_KEY = mustEnv("XAI_API_KEY");
    mustEnv("BETA_COOKIE_SECRET");

    // Optional model overrides
    const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4.1-mini").trim();
    const XAI_MODEL = (process.env.XAI_MODEL || "grok-4-fast-non-reasoning").trim();

    // Body parse
    const body = await req.json().catch(() => null);
    if (!body) return json(400, { ok: false, error: "Bad JSON body" });

    const top_k = Math.min(Math.max(parseInt(body?.top_k ?? 5, 10), 1), 5);

    const input = {
      brand_name: clampStr(body?.brand_name, 120),
      product: clampStr(body?.product, 280),
      offer: clampStr(body?.offer, 280),
      website: clampStr(body?.website, 200),
      market: clampStr(body?.market, 280),
      top_k,
    };

    const missing = Object.entries(input)
      .filter(([k, v]) => k !== "top_k" && !v)
      .map(([k]) => k);

    if (missing.length) {
      return json(400, { ok: false, error: `Missing fields: ${missing.join(", ")}` });
    }

    // 1) Planner (Chat) -> decide Grok queries
    const plannerPrompt = `
Return ONLY a valid JSON object. No markdown, no commentary, no extra text.

Schema:
{
  "trend_queries": ["... up to 5 strings ..."],
  "angle_notes": "short string"
}

Rules:
- Exactly ONE JSON object.
- trend_queries should be concrete and specific for TikTok/IG Reels right now.

Inputs:
brand_name: ${input.brand_name}
product: ${input.product}
offer: ${input.offer}
website: ${input.website}
market: ${input.market}
`.trim();

    const planner = await callOpenAIResponses({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL,
      inputText: plannerPrompt,
    });

    // Robust parse (handles duplicated JSON)
    const planJson = parseFirstJsonObject(planner.text) || {
      trend_queries: [],
      angle_notes: "",
    };

    const trendQueries = Array.isArray(planJson.trend_queries)
      ? planJson.trend_queries.slice(0, 5).map((s) => String(s).trim()).filter(Boolean)
      : [];
    const angleNotes = clampStr(planJson.angle_notes || "", 600);

    // 2) Grok trend scan
    const grokPrompt = `
You are doing trend reconnaissance for short-form video.
Return concise bullets only.

Market: ${input.market}
Product: ${input.product}
Offer: ${input.offer}
Brand: ${input.brand_name}

Trend queries:
${trendQueries.length ? trendQueries.map((q, i) => `${i + 1}. ${q}`).join("\n") : "- (no queries provided)"}

Deliver:
- 8 to 12 trend bullet insights
- 6 to 10 phrases, hook styles currently performing
- 10 to 20 relevant hashtags (not generic)
`.trim();

    const grok = await callXaiChatCompletions({
      apiKey: XAI_API_KEY,
      model: XAI_MODEL,
      messages: [
        { role: "system", content: "You are a trend analyst. Be concise and concrete." },
        { role: "user", content: grokPrompt },
      ],
    });

    // 3) Final pack (Chat) -> strict JSON
    const finalPrompt = `
Return ONLY a valid JSON object. No markdown, no code fences, no commentary, no leading or trailing text.
If you repeat or emit more than one JSON object, the output will be rejected.

Generate output that exactly matches this schema:

{
  "schema_version": "vp_pack_v1",
  "input": { "brand_name": "...", "product": "...", "offer": "...", "website": "...", "market": "...", "top_k": ${top_k} },
  "output": {
    "hooks": [${top_k} strings],
    "on_screen_overlays": [${top_k} strings],
    "captions": [${top_k} strings],
    "hashtags": [${top_k} strings]
  }
}

Hard rules:
- Exactly ${top_k} items per array, no more, no less.
- Each item must be a plain string, no numbering, no bullets.
- Hashtags must include the # symbol.

Inputs:
${JSON.stringify(input, null, 2)}

Angle notes from planner:
${angleNotes}

Trend insights (from Grok):
${grok.text}
`.trim();

    // Responses API JSON enforcement (current format: text.format)
    const finalRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: finalPrompt,
        text: {
          format: { type: "json_object" },
        },
      }),
    });

    const finalData = await finalRes.json().catch(() => null);

    if (!finalRes.ok) {
      const msg =
        finalData?.error?.message ||
        finalData?.error?.type ||
        `OpenAI request failed (${finalRes.status})`;
      throw new Error(msg);
    }

    const finalText = extractOutputText(finalData);

    // Robust parse (handles duplicated JSON if it somehow happens anyway)
    const pack = parseFirstJsonObject(finalText);

    if (!pack?.output) {
      return json(502, {
        ok: false,
        error: "Final model did not return valid JSON",
        debug: {
          planner_text: planner.text,
          grok_text: grok.text,
          final_text: finalText,
        },
      });
    }

    // Normalize and clamp to top_k
    const out = pack.output || {};
    const response = {
      ok: true,
      schema_version: "vp_pack_v1",
      generated_at: new Date().toISOString(),
      input,
      output: {
        hooks: clampArr(out.hooks, top_k),
        on_screen_overlays: clampArr(out.on_screen_overlays, top_k),
        captions: clampArr(out.captions, top_k),
        hashtags: clampArr(out.hashtags, top_k),
      },
      debug: {
        timings_ms: { total: Date.now() - startedAt },
        models: { openai: OPENAI_MODEL, xai: XAI_MODEL },
      },
    };

    return json(200, response);
  } catch (e) {
    return json(500, {
      ok: false,
      error: e?.message || String(e),
    });
  }
}
