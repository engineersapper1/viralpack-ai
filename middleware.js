import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Always allow Next internals
  if (pathname.startsWith("/_next/")) return NextResponse.next();

  // Always allow public assets
  if (
    pathname === "/favicon.ico" ||
    pathname === "/bg.jpg" ||
    pathname === "/logo.png"
  ) {
    return NextResponse.next();
  }

  // Always allow the generator page to load (so user can enter key on fresh devices)
  if (pathname.startsWith("/generator")) {
    return NextResponse.next();
  }

  // API handling
  if (pathname.startsWith("/api/")) {
    // Always allow verify route (needed to set cookie)
    if (pathname.startsWith("/api/beta/verify")) {
      return NextResponse.next();
    }

    // Protect the paid/spendy route
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
