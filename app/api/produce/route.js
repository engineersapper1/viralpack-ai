export const runtime = "nodejs";

function mustEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function clampStr(v, max = 400) {
  const s = String(v || "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

function jsonResponse(obj, status = 200) {
  return Response.json(obj, { status });
}

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
    const msg = data?.error?.message || "OpenAI request failed";
    throw new Error(msg);
  }

  // Extract text safely from Responses API
  const text =
    data?.output?.[0]?.content?.map((c) => c?.text).filter(Boolean).join("\n") ||
    data?.output_text ||
    "";

  return { raw: data, text };
}

async function callXaiChatCompletions({ apiKey, model, messages }) {
  // xAI base URL is https://api.x.ai and supports /v1/chat/completions. :contentReference[oaicite:5]{index=5}
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
    const msg = data?.error?.message || data?.error || "xAI request failed";
    throw new Error(msg);
  }

  const text = data?.choices?.[0]?.message?.content || "";
  return { raw: data, text };
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    // Fail-closed if not behind middleware, or if cookie missing for any reason
    const cookie = req.headers.get("cookie") || "";
    if (!cookie.includes("vp_beta=")) {
      return jsonResponse({ ok: false, error: "Access denied" }, 401);
    }

    const OPENAI_API_KEY = mustEnv("OPENAI_API_KEY");
    const XAI_API_KEY = mustEnv("XAI_API_KEY");

    const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const XAI_MODEL = process.env.XAI_MODEL || "grok-4-fast-non-reasoning";

    const body = await req.json();

    const top_k = Math.min(Math.max(parseInt(body?.top_k || 5, 10), 1), 5);

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
      return jsonResponse({ ok: false, error: `Missing fields: ${missing.join(", ")}` }, 400);
    }

    // 1) Chat (planner) -> decide what to ask Grok
    const plannerPrompt = `
You are the producer/strategist for short-form viral marketing.
Given the inputs, output ONLY a JSON object with:
{
  "trend_queries": [up to 5 strings],
  "angle_notes": "short string"
}
Keep queries specific to the market and what would trend on TikTok/IG Reels right now.
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

    const planJson = safeParseJson(planner.text) || { trend_queries: [], angle_notes: "" };
    const trendQueries = Array.isArray(planJson.trend_queries) ? planJson.trend_queries.slice(0, 5) : [];
    const angleNotes = String(planJson.angle_notes || "").slice(0, 400);

    // 2) Grok (trend scan)
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
- 8-12 trend bullet insights
- 6-10 phrases/hooks styles currently performing
- 10-20 relevant hashtags (not generic)
`.trim();

    const grok = await callXaiChatCompletions({
      apiKey: XAI_API_KEY,
      model: XAI_MODEL,
      messages: [
        { role: "system", content: "You are a trend analyst. Be concise and concrete." },
        { role: "user", content: grokPrompt },
      ],
    });

    // 3) Chat (final pack)
    const finalPrompt = `
You are ViralPack, generating a tight output in strict JSON.
Use the trend insights below to write the final pack.
Return ONLY JSON with this schema:

{
  "schema_version": "vp_pack_v1",
  "input": { "brand_name": "...", "product": "...", "offer": "...", "website": "...", "market": "...", "top_k": 5 },
  "output": {
    "hooks": [${top_k} strings],
    "on_screen_overlays": [${top_k} strings],
    "captions": [${top_k} strings],
    "hashtags": [${top_k} strings]
  }
}

Hard rules:
- Exactly top_k items per array.
- Hooks are 1 line, punchy.
- Overlays are short, readable on screen.
- Captions are 1-2 lines max.
- Hashtags: include the # symbol, not generic junk.

Inputs:
${JSON.stringify(input, null, 2)}

Angle notes from planner:
${angleNotes}

Trend insights (from Grok):
${grok.text}
`.trim();

    const final = await callOpenAIResponses({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL,
      inputText: finalPrompt,
    });

    const pack = safeParseJson(final.text);

    if (!pack?.output) {
      return jsonResponse(
        {
          ok: false,
          error: "Final model did not return valid JSON",
          debug: {
            planner_text: planner.text,
            grok_text: grok.text,
            final_text: final.text,
          },
        },
        502
      );
    }

    // Server-side clamp to top_k, fail-safe
    const out = pack.output || {};
    const clampArr = (a) => (Array.isArray(a) ? a.slice(0, top_k).map((x) => String(x)) : []);

    const response = {
      schema_version: "vp_pack_v1",
      generated_at: new Date().toISOString(),
      input,
      output: {
        hooks: clampArr(out.hooks),
        on_screen_overlays: clampArr(out.on_screen_overlays),
        captions: clampArr(out.captions),
        hashtags: clampArr(out.hashtags),
      },
      debug: {
        planner: { model: OPENAI_MODEL },
        grok: { model: XAI_MODEL },
      },
    };

    return jsonResponse(response, 200);
  } catch (e) {
    return jsonResponse({ ok: false, error: e?.message || "Server error" }, 500);
  }
}
