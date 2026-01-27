import crypto from "crypto";

const COOKIE_NAME = "vp_beta";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function sign(payloadStr, secret) {
  return base64url(crypto.createHmac("sha256", secret).update(payloadStr).digest());
}

function mintToken({ ttlSeconds, secret }) {
  const exp = Date.now() + ttlSeconds * 1000;
  const payloadStr = JSON.stringify({ exp });
  const payloadB64 = base64url(payloadStr);
  const sig = sign(payloadStr, secret);
  return `${payloadB64}.${sig}`;
}

export async function POST(req) {
  try {
    const { key } = await req.json();

    const secret = process.env.BETA_COOKIE_SECRET || "";
    const allow = (process.env.BETA_KEYS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!secret) {
      return Response.json({ ok: false, error: "Missing BETA_COOKIE_SECRET" }, { status: 500 });
    }

    if (!allow.length) {
      return Response.json({ ok: false, error: "No beta keys configured" }, { status: 500 });
    }

    const k = String(key || "").trim();
    if (!k || !allow.includes(k)) {
      return Response.json({ ok: false, error: "Invalid key" }, { status: 401 });
    }

    const token = mintToken({ ttlSeconds: DEFAULT_TTL_SECONDS, secret });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // HttpOnly so it can’t be stolen by frontend JS.
        "Set-Cookie": `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DEFAULT_TTL_SECONDS}; Secure`,
      },
    });
  } catch {
    return Response.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}
