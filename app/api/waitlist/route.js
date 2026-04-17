export async function POST(request) {
  try {
    // -- INSERT HERE --
    const body = await request.json();
    const email = (body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@") || email.length > 254) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    const endpoint = process.env.SHEETS_WEBAPP_URL;
    if (!endpoint) {
      return Response.json({ error: "Missing SHEETS_WEBAPP_URL" }, { status: 500 });
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "";

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "viralpack.ai", ip })
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok || !data?.ok) {
      console.log("[WAITLIST_UPSTREAM_FAIL]", { status: upstream.status, data });
      return Response.json({ error: data?.error || "Sheets write failed" }, { status: 502 });
    }

    console.log("[WAITLIST_OK]", email);
    return Response.json({ ok: true });
    // -- INSERT HERE --
  } catch (e) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}