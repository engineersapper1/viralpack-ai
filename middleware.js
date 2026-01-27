import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // ✅ Always allow these public paths
  const PUBLIC_PATHS = [
    "/",
    "/generator", // allow page to load (UI handles access)
    "/bg.jpg",
    "/logo.png",
    "/favicon.ico",
  ];

  // ✅ Always allow Next internals
  if (pathname.startsWith("/_next/")) return NextResponse.next();

  // ✅ Always allow API routes
  // But we still block /api/produce if user is not verified
  if (pathname.startsWith("/api/")) {
    // Always allow beta verify route
    if (pathname.startsWith("/api/beta/verify")) {
      return NextResponse.next();
    }

    // Protect /api/produce (and anything under it)
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

  // ✅ Allow public pages & assets
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  // ✅ Optional: protect any future private routes here
  // Example: /dashboard etc.
  // const hasCookie = req.cookies.get("vp_beta");
  // if (!hasCookie) return NextResponse.redirect(new URL("/", req.url));

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
      Run middleware on everything EXCEPT:
      - _next (static)
      - _next/image
    */
    "/((?!_next/static|_next/image).*)",
  ],
};
