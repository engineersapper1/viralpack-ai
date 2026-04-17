import { getQuiz, saveSession } from "@/lib/quiz_store";
import { scoreQuiz } from "@/lib/scoring";

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
    const quizId = String(body?.quiz_id || "").trim();
    const answers = body?.answers && typeof body.answers === "object" ? body.answers : {};

    if (!quizId) {
      return json({ ok: false, error: "Missing quiz_id" }, { status: 400 });
    }

    const quiz = await getQuiz(quizId);

    if (!quiz) {
      return json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    const scoring = scoreQuiz(quiz, answers);

    const session = await saveSession({
      quiz_id: quizId,
      created_at: new Date().toISOString(),
      answers,
      score_map: scoring.score_map,
      primary_archetype: scoring.primary_archetype,
      primary_archetype_id: scoring.primary_archetype_id,
      preview: scoring.preview,
      premium: scoring.premium,
      unlocked: false,
      price: Number(quiz?.paywall?.price || 1),
      stripe_payment_status: "not_started",
    });

    return json({
      ok: true,
      session_id: session.session_id,
      price: session.price,
      preview: session.preview,
      teaser: quiz?.paywall?.teaser || "Unlock the full reading.",
    });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error?.message || "Quiz submission failed",
      },
      { status: 500 }
    );
  }
}
