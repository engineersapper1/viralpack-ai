import { NextResponse } from "next/server";
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

function verifyToken(token, secret) {
  if (!token || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payloadB64, sig] = parts;
  const payloadStr = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");

  const expected = sign(payloadStr, secret);
  if (sig !== expected) return false;

  try {
    const payload = JSON.parse(payloadStr);
    if (!payload?.exp) return false;
    if (Date.now() > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function middleware(req) {
  const url = req.nextUrl;

  const isProtected =
    url.pathname.startsWith("/generator") ||
    url.pathname.startsWith("/api/produce");

  if (!isProtected) return NextResponse.next();

  // Allow the verify endpoint itself
  if (url.pathname.startsWith("/api/beta/verify")) return NextResponse.next();

  const secret = process.env.BETA_COOKIE_SECRET || "";
  if (!secret) {
    // Fail-closed in production. In dev, you’ll see this immediately.
    return NextResponse.json(
      { ok: false, error: "Server misconfigured: missing BETA_COOKIE_SECRET" },
      { status: 500 }
    );
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const ok = verifyToken(token, secret);

  if (ok) return NextResponse.next();

  // If they hit /api/produce without auth, return JSON
  if (url.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Access denied" }, { status: 401 });
  }

  // Otherwise redirect to /generator gate
  const gateUrl = req.nextUrl.clone();
  gateUrl.pathname = "/generator";
  gateUrl.searchParams.set("gate", "1");
  return NextResponse.redirect(gateUrl);
}

export const config = {
  matcher: ["/generator/:path*", "/api/produce/:path*"],
};
