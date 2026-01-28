import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Always allow Next internals
  if (pathname.startsWith("/_next/")) return NextResponse.next();

  // Allow public assets
  if (
    pathname === "/favicon.ico" ||
    pathname === "/bg.jpg" ||
    pathname === "/logo.png" ||
    pathname.startsWith("/favicon-")
  ) {
    return NextResponse.next();
  }

  // Always allow the generator page to load (so users can enter the beta key)
  if (pathname.startsWith("/generator")) {
    return NextResponse.next();
  }

  // API routes
  if (pathname.startsWith("/api/")) {
    // Always allow verification endpoint
    if (pathname.startsWith("/api/beta/verify")) {
      return NextResponse.next();
    }

    // Protect all produce routes
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

  // Everything else is public
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
