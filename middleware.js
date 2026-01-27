import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // ✅ Always allow API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Protect generator page
  if (pathname.startsWith("/generator")) {
    const hasCookie = req.cookies.get("vp_beta");
    if (!hasCookie) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
      Run middleware on everything EXCEPT:
      - _next (static)
      - public files
    */
    "/((?!_next/static|_next/image|favicon.ico|bg.jpg).*)",
  ],
};
