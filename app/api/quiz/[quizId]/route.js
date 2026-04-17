import { getQuiz } from "@/lib/quiz_store";

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
  const { quizId } = await params;
  const quiz = await getQuiz(quizId);

  if (!quiz) {
    return json(
      {
        ok: false,
        error: "Quiz not found",
      },
      { status: 404 }
    );
  }

  return json({
    ok: true,
    quiz,
  });
}
