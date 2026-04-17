"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function HomePage() {
  const year = useMemo(() => new Date().getFullYear(), []);
  const [authorized, setAuthorized] = useState(false);
  const [gateKey, setGateKey] = useState("");
  const [gateMsg, setGateMsg] = useState("");
  const [gateErr, setGateErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAuthorized(document.cookie.includes("vp_beta=1"));
  }, []);

  async function verifyKey(e) {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (submitting) return;

    setGateErr("");
    setGateMsg("");

    const key = String(gateKey || "").trim();
    if (!key) {
      setGateErr("Enter your dev key.");
      return;
    }

    try {
      setSubmitting(true);
      const r = await fetch("/api/beta/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({ key }),
      });

      const text = await r.text();
      let j = null;
      try {
        j = JSON.parse(text);
      } catch {}

      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `Verify failed (${r.status})`);
      }

      setAuthorized(true);
      setGateKey("");
      setGateMsg("Access granted.");
      window.location.href = "/generator";
    } catch (err) {
      setGateErr(err?.message || "Couldn’t verify key.");
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    document.cookie = "vp_beta=; Path=/; Max-Age=0; SameSite=Lax";
    setAuthorized(false);
    setGateMsg("");
    setGateErr("");
  }

  if (!authorized) {
    return (
      <main className="shell">
        <section className="hero heroHome" style={{ maxWidth: 760, margin: "32px auto" }}>
          <div className="kicker">ViralPack V3, private dev entry</div>
          <h1>Enter your dev key to open the forge.</h1>
          <p>
            This app is private. Use your dev key to unlock Studio and generator access.
          </p>
          <form className="row" style={{ gap: 12, marginTop: 18, flexWrap: "wrap" }} onSubmit={verifyKey}>
            <input
              type="password"
              value={gateKey}
              onChange={(e) => setGateKey(e.target.value)}
              placeholder="Enter dev key"
              className="input"
              style={{ minWidth: 280 }}
              autoComplete="current-password"
            />
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Verifying..." : "Unlock ViralPack"}
            </button>
          </form>
          {gateMsg ? <p style={{ marginTop: 12, color: "#7ef0b8" }}>{gateMsg}</p> : null}
          {gateErr ? <p style={{ marginTop: 12, color: "#ff8d8d" }}>{gateErr}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="hero heroHome">
        <div className="kicker">ViralPack V3, private generator</div>
        <h1>Turn curiosity into clicks, and clicks into paid psychology readings.</h1>
        <p>
          ViralPack builds premium-feeling, shareable personality quizzes for Instagram and TikTok traffic.
          People click the banner, take the quiz, preview the pattern, and unlock the full styled report.
        </p>
        <div className="row" style={{ marginTop: 18, gap: 12, flexWrap: "wrap" }}>
          <Link className="btn" href="/studio">Open Studio</Link>
          <Link className="btn secondary" href="/generator">Open Generator</Link>
          <button className="btn ghost" type="button" onClick={signOut}>Lock Portal</button>
        </div>
      </section>

      <section className="grid" style={{ marginBottom: 28 }}>
        <div className="card" style={{ gridColumn: "span 7" }}>
          <h2>The market-ready loop</h2>
          <div className="pre">Instagram / TikTok post = click banner = land on quiz = answer questions = preview result = pay $1 = unlock styled report = share result</div>
          <div className="resultBullets" style={{ marginTop: 18 }}>
            <div className="resultBullet"><strong>Fast conversion</strong><span>$1 is friction-light and curiosity-friendly.</span></div>
            <div className="resultBullet"><strong>Premium tone</strong><span>Psychology feel, not cheap clickbait sludge.</span></div>
            <div className="resultBullet"><strong>Backend wired</strong><span>Stripe Checkout plus webhook unlock path.</span></div>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 5" }}>
          <h2>What is live in this package</h2>
          <div className="pill">Supabase-ready persistence</div>
          <div className="pill">Stripe payment route</div>
          <div className="pill">Webhook unlock flow</div>
          <div className="pill">Result share actions</div>
          <div className="pill">Quiz + preview + full reading</div>
          <div className="pill">Private dev key gate</div>
        </div>
      </section>

      <footer style={{ opacity: 0.65, paddingBottom: 20 }}>© {year} ViralPack</footer>
    </main>
  );
}
