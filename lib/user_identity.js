import crypto from "crypto";

function safeKey(v) {
  return String(v || "").trim();
}

export function getUserIdFromReq(req, body = {}) {
  const explicit = safeKey(req?.headers?.get?.("x-vp-user")) || safeKey(body?.user_id) || safeKey(body?.userId);
  if (explicit) return explicit;

  const cookie = safeKey(req?.headers?.get?.("cookie"));
  const match = cookie.match(/(?:^|;\s*)vp_user=([^;]+)/);
  if (match?.[1]) return decodeURIComponent(match[1]);

  const seed = [
    safeKey(body?.inputs?.brand_name),
    safeKey(body?.brand_name),
    safeKey(body?.inputs?.website),
    safeKey(req?.headers?.get?.("user-agent")),
  ].filter(Boolean).join("|") || "viralpack";

  return "u_" + crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12);
}
