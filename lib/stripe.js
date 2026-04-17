import Stripe from "stripe";

let stripeClient = null;

export function getStripe() {
  const key = String(process.env.STRIPE_SECRET_KEY || "").trim();
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }

  return stripeClient;
}

export function getSiteUrl() {
  const url = String(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim();
  return url.replace(/\/$/, "");
}
