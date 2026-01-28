import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Allow Next internals + static
  if (pathname.startsWith("/_next/")) return NextResponse.next();

  // Public assets
  if (pathname === "/favicon.ico" || pathname === "/bg.jpg" || pathname === "/logo.png") {
    return NextResponse.next();
  }

  // Always allow generator page to load so new devices can verify key
  if (pathname.startsWith("/generator")) {
    return NextResponse.next();
  }

  // API routes
  if (pathname.startsWith("/api/")) {
    // Allow verification always
    if (pathname.startsWith("/api/beta/verify")) {
      return NextResponse.next();
    }

    // Protect generation routes
    if (pathname.startsWith("/api/produce")) {
      const hasCookie = req.cookies.get("vp_beta")?.value;
      if (!hasCookie) {
        return NextResponse.json(
          { ok: false, error: "Access denied (missing beta cookie)" },
          { status: 401 }
        );
      }
    }

    return NextResponse.next();
  }

  // Everything else public
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};