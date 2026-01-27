export async function POST(req) {
  try {
    const body = await req.json();

    const PRODUCER_URL = process.env.PRODUCER_URL; // http://127.0.0.1:8000
    if (!PRODUCER_URL) {
      return Response.json({ ok: false, error: "Missing PRODUCER_URL" }, { status: 500 });
    }

    const upstream = await fetch(`${PRODUCER_URL}/produce/hooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return Response.json(
        { ok: false, error: data?.detail || data?.error || "Producer request failed" },
        { status: upstream.status }
      );
    }

    const assets = data?.assets || data?.hooks_pack?.assets || [];
    return Response.json({ ok: true, assets });
  } catch (e) {
    return Response.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
}