import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Always allow Next internals
  if (pathname.startsWith("/_next/")) return NextResponse.next();

  // Always allow API routes, but protect /api/produce behind beta cookie
  if (pathname.startsWith("/api/")) {
    // Allow verification route so users can obtain cookie
    if (pathname.startsWith("/api/beta/verify")) return NextResponse.next();

    // Protect producer endpoint(s)
    if (pathname.startsWith("/api/produce")) {
      const hasCookie = req.cookies.get("vp_beta");
      if (!hasCookie) {
        return NextResponse.json(
          { ok: false, error: "Access denied (missing beta cookie)" },
          { status: 401 }
        );
      }
    }

    return NextResponse.next();
  }

  // Critical: allow /generator to load so user can verify key on new devices
  if (pathname.startsWith("/generator")) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|bg.jpg|logo.png).*)"],
};
