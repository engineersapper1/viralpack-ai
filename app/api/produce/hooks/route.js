export async function POST(req) {
  try {
    const body = await req.json();

    const PRODUCER_URL = process.env.PRODUCER_URL; // e.g. http://127.0.0.1:8000
    if (!PRODUCER_URL) {
      return Response.json({ error: "Missing PRODUCER_URL" }, { status: 500 });
    }

    const upstream = await fetch(`${PRODUCER_URL}/produce/hooks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return Response.json(
        { error: data?.detail || "Producer request failed" },
        { status: upstream.status }
      );
    }

    // Return only the stuff you care about
    const assets = data?.hooks_pack?.assets || data?.assets || [];
    return Response.json({ ok: true, assets });
  } catch (e) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}