"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const initialForm = {
  brand_name: "MindMirror",
  niche: "psychological identity quizzes",
  audience: "TikTok and Reels users who obsess over self-analysis, labels, and hidden-trait content",
  monetization: "Sell premium horoscope-style result unlocks after completion",
  result_price: "1",
  trend_hint:
    "Focus on trending identity quizzes like autism type, overthinker type, attention style, emotional masking",
};

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
}

function collectVideoAssets(payload) {
  const out = [];
  const seen = new Set();

  function pushAsset(label, url, extra = {}) {
    if (!url || typeof url !== "string") return;
    const clean = url.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push({ label, url: clean, ...extra });
  }

  function walk(node, path = "root") {
    if (!node) return;

    if (typeof node === "string") {
      const s = node.trim();
      if (
        s.startsWith("http://") ||
        s.startsWith("https://") ||
        s.endsWith(".mp4") ||
        s.endsWith(".mov") ||
        s.endsWith(".webm")
      ) {
        pushAsset(path, s);
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }

    if (typeof node === "object") {
      const directKeys = [
        "video_url",
        "url",
        "download_url",
        "stream_url",
        "file_url",
        "output_url",
        "public_url",
        "final_video_url",
        "stitched_video_url",
        "stitched_url",
      ];

      directKeys.forEach((key) => {
        if (typeof node[key] === "string") {
          pushAsset(key, node[key], { sourceKey: key });
        }
      });

      Object.entries(node).forEach(([key, value]) => {
        walk(value, `${path}.${key}`);
      });
    }
  }

  walk(payload);
  return out;
}

export default function StudioPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState(null);

  const pricePreview = useMemo(() => Number(form.result_price || 0), [form.result_price]);
  const videoAssets = useMemo(() => collectVideoAssets(result), [result]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function buildCampaign() {
    setLoading(true);
    setError("");
    setStatus("Building full campaign, quiz, and video output...");
    setResult(null);

    try {
      const res = await fetch("/api/v3/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Campaign build failed");
      }

      setResult(data);

      const foundVideos = collectVideoAssets(data);
      if (foundVideos.length > 0) {
        setStatus(`Full campaign built. Quiz route is live, and ${foundVideos.length} video asset(s) were found.`);
      } else {
        setStatus("Full campaign built. Quiz route is live, but no surfaced video URL was found in the run payload.");
      }
    } catch (e) {
      setError(e?.message || String(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function buildQuizOnly() {
    setLoading(true);
    setError("");
    setStatus("Building quiz only, skipping video generation...");
    setResult(null);

    try {
      const res = await fetch("/api/v3/quiz-only", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Quiz-only build failed");
      }

      setResult(data);
      setStatus("Quiz-only build complete. No video was generated.");
    } catch (e) {
      setError(e?.message || String(e));
      setStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function copyJson(value, message = "Copied JSON to clipboard.") {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    setStatus(message);
    setTimeout(() => {
      setStatus("");
    }, 1600);
  }

  const quizUrl = result?.quiz_url || null;
  const resultPreviewUrl = result?.result_preview_url || null;
  const trendTopics = asArray(result?.trend_packet?.topics);
  const isQuizOnly = result?.mode === "quiz_only";

  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">Studio • build funnel assets</div>
        <h1>Generate the quiz fast, or run the full campaign.</h1>
        <p>
          Use quiz-only mode when you want to tune questions, result flow, and paywall without waiting on video generation.
        </p>
      </section>

      <section className="grid" style={{ marginBottom: 18 }}>
        <div className="card" style={{ gridColumn: "span 7" }}>
          <h2>Campaign inputs</h2>

          <label className="label">Brand name</label>
          <input
            className="input"
            value={form.brand_name}
            onChange={(e) => update("brand_name", e.target.value)}
          />

          <div className="row" style={{ marginTop: 14 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <label className="label">Niche</label>
              <input className="input" value={form.niche} onChange={(e) => update("niche", e.target.value)} />
            </div>

            <div style={{ width: 180 }}>
              <label className="label">Premium result price</label>
              <input
                className="input"
                value={form.result_price}
                onChange={(e) => update("result_price", e.target.value)}
              />
            </div>
          </div>

          <label className="label" style={{ marginTop: 14 }}>
            Audience
          </label>
          <textarea
            className="textarea"
            value={form.audience}
            onChange={(e) => update("audience", e.target.value)}
          />

          <label className="label" style={{ marginTop: 14 }}>
            Monetization goal
          </label>
          <textarea
            className="textarea"
            value={form.monetization}
            onChange={(e) => update("monetization", e.target.value)}
          />

          <label className="label" style={{ marginTop: 14 }}>
            Trend steering hint
          </label>
          <textarea
            className="textarea"
            value={form.trend_hint}
            onChange={(e) => update("trend_hint", e.target.value)}
          />

          <div className="row" style={{ marginTop: 18, flexWrap: "wrap", gap: 12 }}>
            <button className="btn" disabled={loading} onClick={buildCampaign}>
              {loading ? "Working..." : "Build Full Campaign"}
            </button>

            <button className="btn secondary" disabled={loading} onClick={buildQuizOnly}>
              {loading ? "Working..." : "Build Quiz Only"}
            </button>
          </div>

          {status ? <p className="good">{status}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </div>

        <div className="card" style={{ gridColumn: "span 5" }}>
          <h2>Modes</h2>
          <div className="stat">
            Quiz-only
            <strong>fast iteration</strong>
          </div>
          <div className="stat" style={{ marginTop: 12 }}>
            Full campaign
            <strong>quiz + video</strong>
          </div>
          <div className="stat" style={{ marginTop: 12 }}>
            Premium result gate
            <strong>${Number.isFinite(pricePreview) ? pricePreview.toFixed(0) : "7"}</strong>
          </div>
        </div>
      </section>

      {result ? (
        <section className="grid" style={{ marginBottom: 30 }}>
          <div className="card" style={{ gridColumn: "span 7" }}>
            <h2>Live output</h2>
            <p className="muted">
              {isQuizOnly
                ? "Quiz-only mode skipped video generation."
                : "Open the route exactly like a real user would."}
            </p>

            <div className="row" style={{ marginBottom: 10, flexWrap: "wrap" }}>
              {quizUrl ? (
                <Link className="btn" href={quizUrl}>
                  Open quiz
                </Link>
              ) : null}

              {resultPreviewUrl ? (
                <Link className="btn secondary" href={resultPreviewUrl}>
                  Open result preview
                </Link>
              ) : null}

              <button className="btn secondary" onClick={() => copyJson(result.quiz, "Copied quiz JSON.")}>
                Copy quiz JSON
              </button>

              <button className="btn ghost" onClick={() => copyJson(result, "Copied full run JSON.")}>
                Copy full run JSON
              </button>
            </div>

            <div className="pre">
              {JSON.stringify(
                {
                  mode: result?.mode || "full_campaign",
                  quiz_url: quizUrl,
                  result_preview_url: resultPreviewUrl,
                  run_id: result?.run_id || null,
                },
                null,
                2
              )}
            </div>
          </div>

          <div className="card" style={{ gridColumn: "span 5" }}>
            <h2>Selected topic</h2>
            <p>
              <strong>{result?.quiz?.title || "Untitled quiz"}</strong>
            </p>
            <p className="muted">{result?.quiz?.short_hook || ""}</p>
            <div>
              {trendTopics.map((topic) => (
                <span key={topic} className="pill">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          {!isQuizOnly ? (
            <div className="card" style={{ gridColumn: "span 12" }}>
              <h2>Video output</h2>

              {videoAssets.length > 0 ? (
                <div style={{ display: "grid", gap: 16 }}>
                  {videoAssets.map((asset, index) => (
                    <div key={`${asset.url}-${index}`} className="card" style={{ padding: 16 }}>
                      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
                        <strong>{asset.label || `video_${index + 1}`}</strong>
                        <a
                          className="btn secondary"
                          href={asset.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open video
                        </a>
                      </div>

                      <video
                        controls
                        playsInline
                        preload="metadata"
                        style={{ width: "100%", borderRadius: 12, background: "#000" }}
                      >
                        <source src={asset.url} />
                      </video>

                      <div className="pre" style={{ marginTop: 10 }}>
                        {JSON.stringify(asset, null, 2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="warn">
                    No surfaced video URL was found in the returned payload.
                  </p>
                </div>
              )}
            </div>
          ) : null}

          <div className="card" style={{ gridColumn: "span 6" }}>
            <h2>Trend packet</h2>
            <div className="pre">{JSON.stringify(result?.trend_packet || {}, null, 2)}</div>
          </div>

          <div className="card" style={{ gridColumn: "span 6" }}>
            <h2>Quiz</h2>
            <div className="pre">{JSON.stringify(result?.quiz || {}, null, 2)}</div>
          </div>
        </section>
      ) : null}
    </main>
  );
}