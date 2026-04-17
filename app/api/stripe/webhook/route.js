import { markSessionPaid } from "@/lib/quiz_store";
import { getStripe } from "@/lib/stripe";

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
  const webhookSecret = String(process.env.STRIPE_WEBHOOK_SECRET || "").trim();
  if (!webhookSecret) {
    return json({ ok: false, error: "Missing STRIPE_WEBHOOK_SECRET" }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return json({ ok: false, error: "Missing stripe-signature header" }, { status: 400 });
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    if (event.type === "checkout.session.completed") {
      const checkoutSession = event.data.object;
      const sessionId = String(checkoutSession?.metadata?.session_id || "").trim();

      if (sessionId) {
        await markSessionPaid(
          sessionId,
          checkoutSession.id,
          checkoutSession.payment_status || "paid"
        );
      }
    }

    return json({ received: true });
  } catch (error) {
    return json({ ok: false, error: error?.message || "Webhook error" }, { status: 400 });
  }
}
