"use client";

import { useMemo, useState } from "react";

export default function GeneratorClient() {
  const [form, setForm] = useState({
    quiz_theme: "Hidden relationship pattern",
    audience_vibe: "women 18-34, sharp, self-aware, slightly dark, highly shareable",
    tone: "intimate, cinematic, a little invasive, premium, not cheesy",
    trend_hint: "pattern-recognition, attachment language, internal monologue content, current short-form self-discovery energy",
    title_title: "What Pattern Runs Your Love Life?",
    question_count: 7,
    archetype_count: 4,
    price_usd: 1,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const packPath = result?.pack_dir || "";
  const files = useMemo(() => result?.files || [], [result]);

  async function generate(e) {
    e?.preventDefault?.();
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Generation failed");
      setResult(data);
    } catch (err) {
      setError(err?.message || "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <div>
            <h1>ViralPack.ai</h1>
            <div className="badge">Quiz pack forge</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href="/">Front door</a>
          <a className="btn secondary" href="/studio">Studio</a>
        </div>
      </div>

      <main className="hero">
        <div className="heroGrid">
          <div className="card">
            <p className="kicker">One pack in, one tile out</p>
            <h2 className="h1">Generate an OracleLoom-ready quiz pack.</h2>
            <p className="sub">
              This no longer targets business ads. It builds quiz packs: theme, archetypes, teaser, full-reading scaffolding,
              tile title, tile art, promo-video prompt, and pack manifest. Drop the whole pack folder into OracleLoom’s
              designated intake folder in your local repo.
            </p>

            <form onSubmit={generate} style={{ marginTop: 16 }}>
              <div className="grid" style={{ gap: 14 }}>
                <Field label="Quiz theme" value={form.quiz_theme} onChange={(v) => update("quiz_theme", v)} />
                <Field label="Tile title" value={form.title_title} onChange={(v) => update("title_title", v)} />
                <Field label="Audience / vibe" value={form.audience_vibe} onChange={(v) => update("audience_vibe", v)} />
                <Field label="Tone" value={form.tone} onChange={(v) => update("tone", v)} />
                <Field label="Trend hint" value={form.trend_hint} onChange={(v) => update("trend_hint", v)} />
                <Field label="Question count" type="number" value={form.question_count} onChange={(v) => update("question_count", Number(v || 0))} />
                <Field label="Archetype count" type="number" value={form.archetype_count} onChange={(v) => update("archetype_count", Number(v || 0))} />
                <Field label="Price USD" type="number" step="0.01" value={form.price_usd} onChange={(v) => update("price_usd", Number(v || 0))} />
              </div>
              <div className="row" style={{ marginTop: 18 }}>
                <button className="btn" type="submit" disabled={busy}>{busy ? "Forging pack..." : "Generate quiz pack"}</button>
              </div>
            </form>
            {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
          </div>

          <div className="card">
            <h3>Output contract</h3>
            <div className="pre" style={{ whiteSpace: "pre-wrap" }}>
{`ViralPack V3\\vp_runs\\<run_id>\\<pack_slug>\\
  manifest.json
  quiz.json
  tile-image.svg
  promo-video.prompt.txt
  promo-script.txt
  promo-video.mp4 (when video generation succeeds)

Drop that entire folder into:
Oracle Loom\\content\\packs\\`}
            </div>
          </div>
        </div>

        {result ? (
          <section className="grid" style={{ marginTop: 22 }}>
            <div className="card" style={{ gridColumn: "span 7" }}>
              <div className="kicker">Pack ready</div>
              <h2>{result?.quiz?.title_title || result?.quiz?.title}</h2>
              <p>{result?.quiz?.short_hook}</p>
              <div className="pre" style={{ marginTop: 16 }}>{packPath}</div>
              <p className="muted" style={{ marginTop: 12 }}>
                Drag that whole folder into Oracle Loom\\content\\packs\\ inside your local OracleLoom repo, then git push OracleLoom.
              </p>
            </div>
            <div className="card" style={{ gridColumn: "span 5" }}>
              <h3>Files in the pack</h3>
              <ul style={{ marginTop: 10, paddingLeft: 18 }}>
                {files.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", step }) {
  return (
    <label style={{ display: "block" }}>
      <div className="muted" style={{ marginBottom: 6 }}>{label}</div>
      <input className="input" type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
