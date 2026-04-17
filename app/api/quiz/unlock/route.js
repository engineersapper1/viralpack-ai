import { getSession, saveSession } from "@/lib/quiz_store";

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.session_id || "").trim();

    if (!sessionId) {
      return json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    const session = await getSession(sessionId);

    if (!session) {
      return json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    const updated = await saveSession({
      ...session,
      unlocked: true,
      unlocked_at: new Date().toISOString(),
    });

    return json({
      ok: true,
      result_url: `/result/${updated.session_id}`,
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || "Premium unlock failed",
      },
      { status: 500 }
    );
  }
}