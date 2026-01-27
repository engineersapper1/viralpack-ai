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
        body: JSON.stringify({ email: val }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Request failed");
      }

      setEmail("");
      setStatus({ type: "ok", msg: "You’re on the list. We’ll email you when beta opens." });
    } catch {
      setStatus({ type: "err", msg: "Couldn’t submit right now. Try again in a minute." });
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <img src="/logo.png" alt="ViralPack.ai" style={{ width: 38, height: 38, borderRadius: 10 }} />
          <div>
            <h1>ViralPack.ai</h1>
            <div className="badge">Landing, Beta soon</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href="/generator">
            Beta access
          </a>
          <a className="btn btnPrimary" href="#waitlist">
            Join waitlist
          </a>
        </div>
      </div>

      <main className="hero">
        <div className="heroGrid">
          <div className="card">
            <p className="kicker">For agencies, local businesses, creators</p>
            <h2 className="h1">Generate viral content packs in minutes.</h2>
            <p className="sub">
              Enter 5 details. Get an agency-ready pack: hooks, overlays, captions, and top hashtags.
              Built to be fast, specific, and shootable.
            </p>

            <div className="ctaRow">
              <a className="btn btnPrimary" href="/generator">
                Try the beta generator
              </a>
              <a className="btn" href="#example">
                See an example
              </a>
            </div>

            <div className="pills" aria-label="What you get">
              <span className="pill">Top hooks</span>
              <span className="pill">On-screen overlays</span>
              <span className="pill">Captions</span>
              <span className="pill">Top hashtags</span>
            </div>

            <p className="smallNote">Beta requires an access key. Public launch coming soon.</p>
          </div>

          <div className="card">
            <h2 style={{ margin: 0, fontSize: 18 }}>How it works</h2>
            <hr className="hr" />
            <div style={{ display: "grid", gap: 10 }}>
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
                <p className="stepBody">Copy what you want, export what you need.</p>
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
          <p className="stepBody">This is a trimmed preview.</p>
          <div className="exampleBox" style={{ marginTop: 12 }}>
            <div className="mono">
{`TOP HOOKS
- “Your AC shouldn’t tap out at 3pm.”
- “If your unit sounds like this, stop scrolling.”
- “The $79 diagnostic that saves you $1,200.”

ON SCREEN OVERLAYS
- “No upsell”
- “Flat price”
- “Same-day when available”

CAPTIONS
- “Tampa Bay homeowners: do this before summer hits.”

HASHTAGS
#ReelsTips #Homeowners #TampaBay`}
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="waitlist">
        <div className="card">
          <h2>Join the waitlist</h2>
          <p className="stepBody">We’ll email you when beta opens. One email, no spam.</p>

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
              <button className="btn btnPrimary" type="submit">
                Notify me
              </button>
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
            <a href="/generator">Beta</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
