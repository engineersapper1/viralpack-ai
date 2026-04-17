"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

function ResultPreviewCard({ result, onCheckout, checkingOut, error }) {
  const preview = result?.preview || {};

  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">Your result preview</div>
        <h1>{preview.headline || "Something clicked."}</h1>
        <p>
          {preview.summary ||
            "You finished the quiz, and a clear pattern showed up."}
        </p>
      </section>

      <section className="grid" style={{ marginBottom: 28 }}>
        <div className="card" style={{ gridColumn: "span 7" }}>
          <h2>What showed up first</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            This is the quick version. The full reading goes deeper into what drives the pattern, what drains it,
            and how it tends to show up in your day-to-day life.
          </p>

          <div className="resultHeroCard">
            <div className="resultHeroEyebrow">Primary pattern</div>
            <h3 style={{ marginTop: 8 }}>{preview.headline || "Your pattern"}</h3>
            <p style={{ marginTop: 10 }}>
              {preview.summary ||
                "A specific thinking pattern emerged from your answers."}
            </p>
          </div>
        </div>

        <div className="card paywallCard" style={{ gridColumn: "span 5" }}>
          <div className="paywallBadge">Premium reading</div>
          <h2 style={{ marginTop: 8 }}>Unlock the full result</h2>
          <p className="muted">
            Get the full breakdown, including your core drive, your blind spot, what tends to intensify the pattern,
            and the kind of insight that makes people say “yeah, that is exactly me.”
          </p>

          <div className="paywallPrice">
            ${Number(result?.price || 1).toFixed(2)}
          </div>

          <div className="paywallList">
            <div>Core drive behind your pattern</div>
            <div>What quietly throws you off</div>
            <div>How this shows up in relationships and work</div>
            <div>A grounded reset / recharge insight</div>
            <div>Your personal power phrase</div>
          </div>

          <button className="btn" disabled={checkingOut} onClick={onCheckout}>
            {checkingOut ? "Opening checkout..." : "Unlock for $1.00"}
          </button>

          <p className="muted" style={{ marginTop: 12 }}>
            Secure checkout via Stripe. You will return here automatically after payment.
          </p>

          {error ? <p className="error" style={{ marginTop: 10 }}>{error}</p> : null}
        </div>
      </section>
    </main>
  );
}

export default function QuizPage() {
  const params = useParams();
  const quizId = Array.isArray(params?.quizId) ? params.quizId[0] : params?.quizId;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadQuiz() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/quiz/${quizId}`, { method: "GET", cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Quiz not found");
        }

        if (active) setQuiz(data.quiz || null);
      } catch (e) {
        if (active) setError(e?.message || String(e));
      } finally {
        if (active) setLoading(false);
      }
    }

    if (quizId) loadQuiz();
    else {
      setLoading(false);
      setError("Missing quiz ID.");
    }

    return () => {
      active = false;
    };
  }, [quizId]);

  const questionCount = quiz?.questions?.length || 0;
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = questionCount ? Math.round((answeredCount / questionCount) * 100) : 0;

  function choose(questionId, optionId) {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function submitQuiz() {
    try {
      setSubmitting(true);
      setError("");

      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quiz_id: quizId, answers }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) throw new Error(data?.error || "Quiz submission failed");
      setResult(data);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  async function startCheckout() {
    try {
      setCheckingOut(true);
      setError("");

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: result?.session_id }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok || !data?.checkout_url) {
        throw new Error(data?.error || "Could not start checkout");
      }

      window.location.href = data.checkout_url;
    } catch (e) {
      setError(e?.message || String(e));
      setCheckingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="shell">
        <section className="hero">
          <h1>Loading quiz...</h1>
        </section>
      </main>
    );
  }

  if (error && !quiz && !result) {
    return (
      <main className="shell">
        <section className="hero">
          <h1>Quiz unavailable</h1>
          <p className="error">{error}</p>
        </section>
      </main>
    );
  }

  if (result) {
    return <ResultPreviewCard result={result} onCheckout={startCheckout} checkingOut={checkingOut} error={error} />;
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">Premium psychology quiz</div>
        <h1>{quiz?.title || "Untitled quiz"}</h1>
        <p>{quiz?.short_hook || "Answer honestly. The pattern usually appears faster than people expect."}</p>
      </section>

      <section className="card" style={{ marginBottom: 20 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span className="muted">Progress</span>
          <strong>{progress}%</strong>
        </div>
        <div className="progress" style={{ marginTop: 12 }}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        {(quiz?.questions || []).map((question) => (
          <div className="questionCard" key={question.id} style={{ marginBottom: 16 }}>
            <div className="kicker">Question</div>
            <h2 style={{ marginTop: 0 }}>{question.prompt}</h2>
            {question.microcopy ? <p className="muted">{question.microcopy}</p> : null}

            <div style={{ marginTop: 18 }}>
              {(question.options || []).map((option) => {
                const selected = answers[question.id] === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`optionBtn ${selected ? "selected" : ""}`}
                    onClick={() => choose(question.id, option.id)}
                  >
                    <strong>{option.label}</strong>
                    {option.subtext ? <div className="muted" style={{ marginTop: 6 }}>{option.subtext}</div> : null}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="card" style={{ marginBottom: 28 }}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>Ready to score it?</h2>
            <p className="muted" style={{ marginBottom: 0 }}>You can reveal the preview once every question has an answer.</p>
          </div>
          <button className="btn" disabled={submitting || answeredCount < questionCount} onClick={submitQuiz}>
            {submitting ? "Scoring..." : "See my result preview"}
          </button>
        </div>
        {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
      </section>
    </main>
  );
}
