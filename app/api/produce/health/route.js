export async function GET() {
  const PRODUCER_URL = process.env.PRODUCER_URL;
  if (!PRODUCER_URL) return Response.json({ ok: false, error: "Missing PRODUCER_URL" }, { status: 500 });

  try {
    const r = await fetch(`${PRODUCER_URL}/health`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    return Response.json({ ok: r.ok, upstream: j }, { status: r.ok ? 200 : 502 });
  } catch (e) {
    return Response.json({ ok: false, error: "Cannot reach Producer" }, { status: 502 });
  }
}