export async function POST(req) {
  try {
    const body = await req.json();

    const PRODUCER_URL = process.env.PRODUCER_URL; // e.g. http://127.0.0.1:8000
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
        { ok: false, error: data?.detail || data?.error || "Producer request failed", raw: data },
        { status: upstream.status }
      );
    }

    // Expected python shape: { schema_version, trends, hooks_pack }
    const hooksPack = data?.hooks_pack ?? data;

    return Response.json({
      ok: true,
      schema_version: data?.schema_version,
      trends: data?.trends,
      hooks_pack: hooksPack,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}