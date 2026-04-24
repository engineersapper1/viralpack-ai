import { NextResponse } from "next/server";

const VALID_KEYS = (process.env.BETA_KEYS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export async function POST(req) {
  try {
    const { key } = await req.json();

    if (!key || !VALID_KEYS.includes(String(key).trim())) {
      return NextResponse.json({ success: false, error: "Invalid access key" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set("vp_beta", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return res;
  } catch {
    return NextResponse.json({ success: false, error: "Bad request" }, { status: 400 });
  }
}
