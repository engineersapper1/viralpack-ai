import { getQuiz, getSession, markSessionCheckoutCreated } from "@/lib/quiz_store";
import { getSiteUrl, getStripe } from "@/lib/stripe";

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

    const quiz = await getQuiz(session.quiz_id);
    if (!quiz) {
      return json({ ok: false, error: "Quiz not found" }, { status: 404 });
    }

    const stripe = getStripe();
    const siteUrl = getSiteUrl();
    const amount = Math.max(1, Math.round(Number(session.price || 1) * 100));

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${siteUrl}/checkout/success?session_id=${encodeURIComponent(sessionId)}&stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel?session_id=${encodeURIComponent(sessionId)}`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: `${quiz.title || "Premium psychology reading"}`,
              description: "Full result unlock for the completed quiz session.",
            },
          },
        },
      ],
      metadata: {
        session_id: sessionId,
        quiz_id: session.quiz_id || "",
      },
      payment_intent_data: {
        metadata: {
          session_id: sessionId,
          quiz_id: session.quiz_id || "",
        },
      },
    });

    await markSessionCheckoutCreated(sessionId, checkout.id);

    return json({
      ok: true,
      checkout_url: checkout.url,
      checkout_session_id: checkout.id,
    });
  } catch (error) {
    return json({ ok: false, error: error?.message || "Checkout failed" }, { status: 500 });
  }
}
