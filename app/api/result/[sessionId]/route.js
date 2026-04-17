import { getSession } from "@/lib/quiz_store";

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export async function GET(_req, { params }) {
  try {
    const { sessionId } = await params;
    const session = await getSession(sessionId);

    if (!session) {
      return json({ ok: false, error: "Session not found" }, { status: 404 });
    }

    return json({
      ok: true,
      session_id: session.session_id,
      unlocked: Boolean(session.unlocked),
      unlocked_at: session.unlocked_at || null,
      stripe_payment_status: session.stripe_payment_status || null,
      result_url: `/result/${session.session_id}`,
      preview: session.preview || {},
      premium: session.unlocked ? session.premium || {} : null,
    });
  } catch (error) {
    return json({ ok: false, error: error?.message || "Failed to load result" }, { status: 500 });
  }
}
