"use client";

import { useMemo, useState } from "react";

export default function Page() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", msg: "" });
  const year = useMemo(() => new Date().getFullYear(), []);

  async function submitWaitlist(e) {
    e.preventDefault();
    setStatus({ type: "", msg: "" });

    const val = (email || "").trim();
    if (!val || !val.includes("@")) {
      setStatus({ type: "err", msg: "Please enter a valid email." });
      return;
    }

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: val })
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Request failed");
      }

      setEmail("");
      setStatus({ type: "ok", msg: "You’re on the list. We’ll email you when beta opens." });
    } catch (err) {
      setStatus({ type: "err", msg: "Couldn’t submit right now. Try again in a minute." });
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <div className="logo" aria-hidden="true" />
          <div>
            <h1>ViralPack.ai</h1>
            <div className="badge">Landing, Beta soon</div>
          </div>
        </div>
        <a className="btn" href="#waitlist">Join waitlist</a>
      </div>

      <main className="hero">
        <div className="heroGrid">
          <div className="card">
            <p className="kicker">For agencies, local businesses, creators</p>
            <h2 className="h1">Generate viral content packs in minutes.</h2>
            <p className="sub">
              Enter 5 details. Get an agency-ready pack: hooks, scripts, shot lists, overlays, captions, and top hashtags.
              Built to be fast, specific, and shootable.
            </p>

            <div className="ctaRow">
              <a className="btn btnPrimary" href="#waitlist">Get early access</a>
              <a className="btn" href="#example">See an example</a>
            </div>

            <div className="pills" aria-label="What you get">
              <span className="pill">Top hooks</span>
              <span className="pill">Scripts</span>
              <span className="pill">Shot lists</span>
              <span className="pill">On-screen overlays</span>
              <span className="pill">Captions</span>
              <span className="pill">Top 5 hashtags</span>
            </div>

            <p className="smallNote">No install. Runs online. Pay-to-play coming after beta.</p>
          </div>

          <div className="card">
            <h2 style={{ margin: 0, fontSize: 18 }}>How it works</h2>
            <hr className="hr" />
            <div className="grid3" style={{ gridTemplateColumns: "1fr", gap: 10 }}>
              <div>
                <p className="stepTitle">1) Enter 5 inputs</p>
                <p className="stepBody">Brand, product, offer, website, market. Nothing else.</p>
              </div>
              <div>
                <p className="stepTitle">2) Generate the pack</p>
                <p className="stepBody">Trend-aware structure, creative execution, no fluff.</p>
              </div>
              <div>
                <p className="stepTitle">3) Download and shoot</p>
                <p className="stepBody">Hand the pack to your editor or film it yourself.</p>
              </div>
            </div>

            <hr className="hr" />
            <h2 style={{ margin: 0, fontSize: 18 }}>Pricing</h2>
            <p className="stepBody" style={{ marginTop: 8 }}>
              Credits + subscriptions are coming. Beta users get founder pricing.
            </p>
          </div>
        </div>
      </main>

      <section className="section" id="example">
        <div className="card">
          <h2>Example pack preview</h2>
          <p className="stepBody">
            This is a trimmed preview. Your real output includes the full script, shot list, overlays, captions, and hashtags.
          </p>
          <div className="exampleBox" style={{ marginTop: 12 }}>
            <div className="mono">
{`SECTION D, Final hooks (Top 5)
1) “Your AC shouldn’t tap out at 3pm.”
2) “If your unit sounds like this, stop scrolling.”
3) “The $79 diagnostic that saves you $1,200.”
4) “Tampa Bay homeowners: do this before summer hits.”
5) “This one mistake cooks your compressor.”

SECTION E, Concept (1 of 3)
Title: “86° to 72° in 18 Minutes”
Format: Proof + timer + price transparency
Shots: Thermostat closeup → unit sound → tech diagnostic → before/after → receipt overlay
Overlays: “No upsell”, “Flat price”, “Same-day when available”, “Tampa Bay” ...`}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="waitlist">
        <div className="card">
          <h2>Join the waitlist</h2>
          <p className="stepBody">
            We’ll email you when beta opens. One email, no spam.
          </p>

          <form onSubmit={submitWaitlist} style={{ marginTop: 12 }}>
            <div className="formRow">
              <input
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@agency.com"
                type="email"
                autoComplete="email"
              />
              <button className="btn btnPrimary" type="submit">Notify me</button>
            </div>

            {status.type === "ok" && <div className="toastOk">{status.msg}</div>}
            {status.type === "err" && <div className="toastErr">{status.msg}</div>}
          </form>
        </div>
      </section>

      <footer className="footer">
        <div className="footerRow">
          <div>© {year} ViralPack.ai</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href="mailto:hello@viralpack.ai">hello@viralpack.ai</a>
            <a href="#" onClick={(e) => { e.preventDefault(); alert("Add Privacy Policy later, before Stripe."); }}>
              Privacy
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); alert("Add Terms later, before Stripe."); }}>
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

