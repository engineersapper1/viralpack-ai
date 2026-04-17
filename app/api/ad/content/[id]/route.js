export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mustEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env var: ${name}`);
  return String(v).trim();
}

export async function GET(req, { params }) {
  try {
    const cookie = req.headers.get("cookie") || "";
    if (!cookie.includes("vp_beta=")) {
      return new Response("Access denied", { status: 401 });
    }

    const apiKey = mustEnv("OPENAI_API_KEY");
    const id = String(params?.id || "").trim();
    if (!id) return new Response("Missing id", { status: 400 });

    const res = await fetch(`https://api.openai.com/v1/videos/${id}/content`, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return new Response(txt || "Failed", { status: res.status });
    }

    const ab = await res.arrayBuffer();
    return new Response(ab, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(e?.message || String(e), { status: 500 });
  }
}
