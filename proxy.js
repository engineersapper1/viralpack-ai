import { NextResponse } from "next/server";

export function proxy(req) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next/")) return NextResponse.next();
  if (pathname === "/favicon.ico" || pathname === "/bg.jpg" || pathname === "/logo.png" || pathname.startsWith("/favicon-")) return NextResponse.next();
  if (pathname === "/" || pathname.startsWith("/generator") || pathname.startsWith("/studio")) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/beta/verify") || pathname.startsWith("/api/waitlist")) return NextResponse.next();
    if (pathname.startsWith("/api/produce") || pathname.startsWith("/api/ad/") || pathname.startsWith("/api/video/") || pathname.startsWith("/api/runs/")) {
      const hasCookie = req.cookies.get("vp_beta")?.value;
      if (!hasCookie) {
        return NextResponse.json({ ok: false, error: "Access denied (missing beta cookie)" }, { status: 401 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)"],
};
