"use client";

import { useMemo, useState } from "react";

const PRESETS = [
  "Hidden relationship pattern",
  "What secretly drains your energy",
  "Your social aura",
  "The shadow trait people notice first",
  "Your decision-making flaw",
  "What makes you hard to forget",
];

export default function GeneratorClient() {
  const [form, setForm] = useState({
    quiz_theme: "Hidden relationship pattern",
    audience_vibe: "women 18-34, self-aware, emotionally curious, TikTok-native, shareable",
    tone: "addictive, intimate, cinematic, a little invasive, clever, not corporate",
    trend_hint: "short-form self-discovery trends, attachment language, aura quizzes, dark feminine psychology, personality archetypes",
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

  function usePreset(theme) {
    setForm((prev) => ({
      ...prev,
      quiz_theme: theme,
      title_title: titleFromTheme(theme),
    }));
  }

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
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Quiz pack generation failed");
      setResult(data);
    } catch (err) {
      setError(err?.message || "Quiz pack generation failed");
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
            <div className="badge">Quiz Pack Forge</div>
          </div>
        </div>
        <div className="row">
          <a className="btn secondary" href="/studio">Studio</a>
          <a className="btn secondary" href="/">Lock screen</a>
        </div>
      </div>

      <main className="hero">
        <div className="heroGrid">
          <section className="card">
            <p className="kicker">Build addictive OracleLoom quizzes</p>
            <h2 className="h1">Generate one complete quiz pack.</h2>
            <p className="sub">
              ViralPack now creates quiz experiences, not business ads. Each run produces a self-contained folder with a
              manifest, quiz data, tile image, and promo-video instructions. Drop that whole folder into OracleLoom’s
              local <code>content/packs</code> intake folder, then push OracleLoom.
            </p>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
              {PRESETS.map((preset) => (
                <button key={preset} className="btn secondary" type="button" onClick={() => usePreset(preset)}>
                  {preset}
                </button>
              ))}
            </div>

            <form onSubmit={generate} style={{ marginTop: 18 }}>
              <div className="grid" style={{ gap: 14 }}>
                <Field label="Quiz theme" value={form.quiz_theme} onChange={(v) => update("quiz_theme", v)} />
                <Field label="Tile title, short hook shown on OracleLoom" value={form.title_title} onChange={(v) => update("title_title", v)} />
                <Field label="Audience / vibe" value={form.audience_vibe} onChange={(v) => update("audience_vibe", v)} />
                <Field label="Tone" value={form.tone} onChange={(v) => update("tone", v)} />
                <Field label="Trend hint, later Grok will fill this" value={form.trend_hint} onChange={(v) => update("trend_hint", v)} />
                <Field label="Question count" type="number" value={form.question_count} onChange={(v) => update("question_count", Number(v || 0))} />
                <Field label="Result archetype count" type="number" value={form.archetype_count} onChange={(v) => update("archetype_count", Number(v || 0))} />
                <Field label="Unlock price" type="number" step="0.01" value={form.price_usd} onChange={(v) => update("price_usd", Number(v || 0))} />
              </div>

              <div className="row" style={{ marginTop: 18 }}>
                <button className="btn" type="submit" disabled={busy}>
                  {busy ? "Forging quiz pack..." : "Generate quiz pack"}
                </button>
              </div>
            </form>

            {error ? <p className="error" style={{ marginTop: 12 }}>{error}</p> : null}
          </section>

          <section className="card">
            <h3>Drop-folder contract</h3>
            <div className="pre" style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>
{`ViralPack V3\\vp_runs\\<run_id>\\<pack_slug>\\
  manifest.json
  quiz.json
  tile-image.svg
  tile-image.prompt.txt
  promo-video.prompt.txt
  promo-script.txt
  promo-video.mp4, when video succeeds

Drop the whole <pack_slug> folder into:
OracleLoom\\content\\packs\\`}
            </div>
            <p className="muted" style={{ marginTop: 12 }}>
              Each pack becomes one tile. Tile click opens its quiz. Every quiz uses the same teaser → $1 full reading path.
            </p>
          </section>
        </div>

        {result ? (
          <section className="grid" style={{ marginTop: 22 }}>
            <div className="card" style={{ gridColumn: "span 7" }}>
              <div className="kicker">Pack ready</div>
              <h2>{result?.quiz?.title_title || result?.quiz?.title}</h2>
              <p>{result?.quiz?.short_hook}</p>
              <div className="pre" style={{ marginTop: 16 }}>{result?.pack_dir}</div>
              <p className="muted" style={{ marginTop: 12 }}>
                Drag that whole folder into OracleLoom\\content\\packs\\, then commit and push OracleLoom.
              </p>
            </div>
            <div className="card" style={{ gridColumn: "span 5" }}>
              <h3>Files in this pack</h3>
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

function titleFromTheme(theme) {
  const clean = String(theme || "Your Hidden Pattern").trim();
  if (/^what/i.test(clean)) return clean;
  return `What ${clean.replace(/^your\s+/i, "")} Reveals About You`;
}
