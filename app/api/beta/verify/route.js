export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(status, obj, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function mustEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env var: ${name}`);
  return String(v).trim();
}

function parseKeysList(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function POST(req) {
  try {
    mustEnv("BETA_COOKIE_SECRET"); // sanity check per your design

    const allowed = parseKeysList(process.env.BETA_KEYS || "");
    if (!allowed.length) {
      return json(500, { ok: false, error: "Server misconfigured (BETA_KEYS missing)" });
    }

    const body = await req.json().catch(() => null);
    const key = String(body?.key || "").trim();
    if (!key) return json(400, { ok: false, error: "Missing key" });

    if (!allowed.includes(key)) {
      return json(401, { ok: false, error: "Invalid key" });
    }

    // Mobile-safe cookie attributes:
    // SameSite=Lax plays nicely with Safari, and still works for same-site fetch.
    const isProd = process.env.NODE_ENV === "production";
    const cookie =
      `vp_beta=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}` +
      (isProd ? "; Secure" : "");

    return json(200, { ok: true }, { "Set-Cookie": cookie });
  } catch (e) {
    return json(500, { ok: false, error: e?.message || String(e) });
  }
}
