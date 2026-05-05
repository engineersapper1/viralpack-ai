export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import {
  safeJson,
  mustEnv,
  clampStr,
  callOpenAIResponses,
  parseFirstJsonObject,
  normalizeCopyrightPack,
} from "../../../../lib/copyright/shared.js";

function getInput(body) {
  const b = body && typeof body === "object" ? body : {};
  return {
    brand_name: clampStr(b.brand_name, 140),
    product: clampStr(b.product, 280),
    offer: clampStr(b.offer, 280),
    website: clampStr(b.website, 200),
    market: clampStr(b.market, 280),
    asset_description: clampStr(b.asset_description, 1200),
    reference_text: clampStr(b.reference_text, 6000),
    platform: clampStr(b.platform || "TikTok, Instagram Reels, YouTube Shorts", 140),
    voice: clampStr(b.voice || "Clear, punchy, market-ready", 140),
  };
}

export async function POST(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const internalSecret = mustEnv("BETA_COOKIE_SECRET");
    const internalHeader = String(req.headers.get("x-vp-internal") || "").trim();
    const isInternal = internalHeader && internalHeader === internalSecret;

    if (!isInternal && !cookie.includes("vp_beta=")) {
      return safeJson(401, { ok: false, error: "Access denied (missing beta cookie)" });
    }

    const OPENAI_API_KEY = mustEnv("OPENAI_API_KEY");
    const OPENAI_MODEL = (process.env.OPENAI_MODEL || "gpt-4.1-mini").trim();
    const body = await req.json().catch(() => null);
    if (!body) return safeJson(400, { ok: false, error: "Bad JSON body" });

    const input = getInput(body);
    const missing = ["brand_name", "product", "market"].filter((k) => !input[k]);
    if (missing.length) return safeJson(400, { ok: false, error: `Missing fields: ${missing.join(", ")}` });

    const prompt = `
Return ONLY a valid JSON object, no markdown and no extra commentary.

Schema:
{
  "output": {
    "rights_flags": ["... up to 6 strings ..."],
    "originality_moves": ["... exactly 5 strings ..."],
    "risk_notes": ["... exactly 5 strings ..."],
    "caption_variants": ["... exactly 5 strings ..."],
    "disclaimers": ["... up to 4 strings ..."],
    "clearance_checklist": ["... exactly 8 strings ..."],
    "upload_title_options": ["... exactly 5 strings ..."],
    "notes": "short paragraph"
  }
}

Task:
Generate a market-ready copyright and originality pack for short-form social content. Focus on reducing obvious infringement risk, increasing transformation/originality, and giving the user safer upload copy.

Hard rules:
- Keep every item practical and specific.
- Do not claim legal certainty.
- Do not encourage evasion of valid copyright law.
- Prefer safe, business-ready language.
- Assume the user wants original ads, hooks, captions, and repurposed concepts without copying anyone's exact expression.

Inputs:
${JSON.stringify(input, null, 2)}
`.trim();

    const res = await callOpenAIResponses({
      apiKey: OPENAI_API_KEY,
      model: OPENAI_MODEL,
      inputText: prompt,
      jsonObject: true,
    });

    const parsed = parseFirstJsonObject(res.text);
    if (!parsed) {
      return safeJson(502, { ok: false, error: "Model did not return valid JSON" });
    }

    const output = normalizeCopyrightPack(parsed);
    return safeJson(200, {
      ok: true,
      schema_version: output.schema_version,
      generated_at: new Date().toISOString(),
      input,
      output,
    });
  } catch (e) {
    return safeJson(500, { ok: false, error: String(e?.message || e) });
  }
}
