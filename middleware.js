import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Always allow Next internals
  if (pathname.startsWith("/_next/")) return NextResponse.next();

  // Always allow public assets
  if (pathname === "/favicon.ico" || pathname === "/bg.jpg" || pathname === "/logo.png") {
    return NextResponse.next();
  }

  // Always allow API routes, but protect /api/produce behind beta cookie
  if (pathname.startsWith("/api/")) {
    // Always allow key verification
    if (pathname.startsWith("/api/beta/verify")) {
      return NextResponse.next();
    }

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

  // ✅ Critical fix: allow /generator to load even without cookie
  // The page itself has the "Verify key" form, so users can get access.
  if (pathname.startsWith("/generator")) {
    return NextResponse.next();
  }

  // Everything else: allow (landing stays public)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
