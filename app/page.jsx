"use client";

import { useMemo, useState } from "react";

export default function Page() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", msg: "" });
  const year = useMemo(() => new Date().getFullYear(), []);

  // Editable Producer inputs
  const [form, setForm] = useState({
    brand_name: "ViralPack.ai",
    product: "SaaS that generates short-form hooks and content concepts",
    offer: "Early access waitlist",
    website: "https://viralpack.ai",
    market: "Creators, agencies, small businesses",
  });

  // Top K controls
  const [topOnly, setTopOnly] = useState(true); // if true, request/trim to top 5
  const TOP_K = 5;

  // Producer tester state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  const [genErr, setGenErr] = useState("");
  const [assets, setAssets] = useState([]); // array of concept objects
  const [lastResponse, setLastResponse] = useState(null); // raw response for JSON export metadata

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
    } catch (err) {
      setStatus({ type: "err", msg: "Couldn’t submit right now. Try again in a minute." });
    }
  }

  function safeText(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  function clampTopK(list, k) {
    if (!Array.isArray(list)) return [];
    if (!k || k <= 0) return list;
    return list.slice(0, k);
  }

  async function copyText(text) {
    const t = safeText(text).trim();
    if (!t) return;

    try {
      await navigator.clipboard.writeText(t);
      setGenMsg("Copied to clipboard.");
      setTimeout(() => setGenMsg(""), 1200);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        setGenMsg("Copied to clipboard.");
        setTimeout(() => setGenMsg(""), 1200);
      } catch (err) {
        setGenErr("Copy failed in this browser.");
        setTimeout(() => setGenErr(""), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  function buildPackText(list) {
    const lines = [];
    lines.push("ViralPack.ai, Producer Test Output");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("INPUTS");
    lines.push(`brand_name: ${safeText(form.brand_name)}`);
    lines.push(`product: ${safeText(form.product)}`);
    lines.push(`offer: ${safeText(form.offer)}`);
    lines.push(`website: ${safeText(form.website)}`);
    lines.push(`market: ${safeText(form.market)}`);
    lines.push(`top_k: ${topOnly ? TOP_K : "none"}`);
    lines.push("");
    lines.push("============================================================");
    lines.push("");

    (list || []).forEach((a, idx) => {
      const n = idx + 1;
      const conceptTitle = a?.concept_title || a?.title || "Untitled";

      lines.push(`CONCEPT ${n}, ${conceptTitle}`);
      lines.push("");
      lines.push("TOP HOOK");
      lines.push(safeText(a?.hook));
      lines.push("");
      lines.push("ON SCREEN OVERLAY");
      lines.push(safeText(a?.on_screen_overlay));
      lines.push("");
      lines.push("CAPTION");
      lines.push(safeText(a?.caption));
      lines.push("");
      lines.push("HASHTAGS");
      const tags = Array.isArray(a?.hashtags) ? a.hashtags : [];
      lines.push(tags.join(" "));
      lines.push("");
      lines.push("------------------------------------------------------------");
      lines.push("");
    });

    return lines.join("\n");
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportTxt() {
    const txt = buildPackText(assets);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(`viralpack-pack-${stamp}.txt`, txt, "text/plain;charset=utf-8");
  }

  // Stable, versioned JSON export wrapper (future-proof)
  function buildExportJson() {
    const stamp = new Date().toISOString();
    return {
      schema_version: "vp_pack_export_v1",
      generated_at: stamp,
      request: {
        schema_version: "vp_request_v1",
        ...form,
        top_k: topOnly ? TOP_K : null,
      },
      response: {
        schema_version: "vp_response_v1",
        upstream: {
          schema_version: safeText(lastResponse?.schema_version || ""),
        },
        assets: assets,
      },
    };
  }

  function exportJson() {
    const obj = buildExportJson();
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(`viralpack-pack-${stamp}.json`, JSON.stringify(obj, null, 2), "application/json;charset=utf-8");
  }

  async function generateHooks() {
    if (isGenerating) return;

    setIsGenerating(true);
    setGenErr("");
    setGenMsg("Generating, please wait…");
    setAssets([]);
    setLastResponse(null);

    try {
      // Send editable inputs + optional top_k
      const payload = {
        ...form,
        ...(topOnly ? { top_k: TOP_K } : {}),
      };

      const r = await fetch("/api/produce/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        const msg = data?.error || data?.detail || "Producer request failed";
        throw new Error(msg);
      }

      setLastResponse(data);

      // Accept either { assets: [...] } OR { hooks_pack: { assets: [...] } }
      const rawList = Array.isArray(data?.assets)
        ? data.assets
        : Array.isArray(data?.hooks_pack?.assets)
        ? data.hooks_pack.assets
        : [];

      // Safety trim client-side too
      const list = topOnly ? clampTopK(rawList, TOP_K) : rawList;

      setAssets(list);
      setGenMsg(list.length ? `Generated ${list.length} concepts.` : "No concepts returned.");
    } catch (e) {
      setGenErr(e?.message || "Couldn’t generate right now. Make sure Producer is running.");
      setGenMsg("");
    } finally {
      setIsGenerating(false);
    }
  }

  function onChangeField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <img
            src="/logo.png"
            alt="ViralPack.ai"
            style={{ width: 38, height: 38, borderRadius: 10 }}
          />
          <div>
            <h1>ViralPack.ai</h1>
            <div className="badge">Landing, Beta soon</div>
          </div>
        </div>
        <a className="btn" href="#waitlist">
          Join waitlist
        </a>
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
              <a className="btn btnPrimary" href="#waitlist">
                Get early access
              </a>
              <a className="btn" href="#example">
                See an example
              </a>
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

            {/* Editable inputs */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                  <Field
                    label="Brand name"
                    value={form.brand_name}
                    onChange={(v) => onChangeField("brand_name", v)}
                    placeholder="ViralPack.ai"
                  />
                  <Field
                    label="Website"
                    value={form.website}
                    onChange={(v) => onChangeField("website", v)}
                    placeholder="https://viralpack.ai"
                  />
                </div>

                <Field
                  label="Product"
                  value={form.product}
                  onChange={(v) => onChangeField("product", v)}
                  placeholder="What are you selling?"
                />
                <Field
                  label="Offer"
                  value={form.offer}
                  onChange={(v) => onChangeField("offer", v)}
                  placeholder="Early access waitlist"
                />
                <Field
                  label="Market"
                  value={form.market}
                  onChange={(v) => onChangeField("market", v)}
                  placeholder="Creators, agencies, small businesses"
                />

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={topOnly}
                      onChange={(e) => setTopOnly(e.target.checked)}
                      disabled={isGenerating}
                    />
                    <span className="smallNote" style={{ margin: 0 }}>
                      Return top {TOP_K} only
                    </span>
                  </label>

                  <div className="smallNote" style={{ margin: 0 }}>
                    Local dev only, uses <span className="mono">/api/produce/hooks</span>.
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    className="btn btnPrimary"
                    onClick={generateHooks}
                    disabled={isGenerating}
                    aria-busy={isGenerating ? "true" : "false"}
                    title="Generate from local Producer"
                  >
                    {isGenerating ? "Generating…" : "Generate"}
                  </button>

                  <button
                    className="btn"
                    onClick={() => copyText(buildPackText(assets))}
                    disabled={!assets.length || isGenerating}
                    title="Copy the full generated pack as text."
                  >
                    Copy full pack
                  </button>

                  <button
                    className="btn"
                    onClick={exportTxt}
                    disabled={!assets.length || isGenerating}
                    title="Download a .txt file of the generated pack."
                  >
                    Export .txt
                  </button>

                  <button
                    className="btn"
                    onClick={exportJson}
                    disabled={!assets.length || isGenerating}
                    title="Download a versioned JSON export for future compatibility."
                  >
                    Export JSON
                  </button>
                </div>

                {genMsg ? (
                  <div className="toastOk" style={{ marginTop: 6 }}>
                    {genMsg} {isGenerating ? <span className="mono">⏳</span> : null}
                  </div>
                ) : null}

                {genErr ? (
                  <div className="toastErr" style={{ marginTop: 6 }}>
                    {genErr}
                  </div>
                ) : null}
              </div>

              {/* Results */}
              {assets.length ? (
                <div style={{ marginTop: 14 }}>
                  <div className="exampleBox" style={{ marginTop: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 800 }}>Generated Concepts</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => copyText(buildPackText(assets))}>
                          Copy all
                        </button>
                        <button className="btn" onClick={exportTxt}>
                          Export .txt
                        </button>
                        <button className="btn" onClick={exportJson}>
                          Export JSON
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                      {assets.map((a, i) => {
                        const tags = Array.isArray(a?.hashtags) ? a.hashtags : [];
                        const conceptTitle = a?.concept_title || a?.title || "Untitled";

                        const sectionHook = safeText(a?.hook);
                        const sectionOverlay = safeText(a?.on_screen_overlay);
                        const sectionCaption = safeText(a?.caption);
                        const sectionTags = tags.join(" ");

                        const conceptText =
                          [
                            `CONCEPT ${i + 1}, ${conceptTitle}`,
                            "",
                            "TOP HOOK",
                            sectionHook,
                            "",
                            "ON SCREEN OVERLAY",
                            sectionOverlay,
                            "",
                            "CAPTION",
                            sectionCaption,
                            "",
                            "HASHTAGS",
                            sectionTags,
                          ].join("\n");

                        return (
                          <div
                            key={i}
                            style={{
                              border: "1px solid rgba(255,255,255,0.10)",
                              borderRadius: 14,
                              padding: 12,
                              background: "rgba(0,0,0,0.25)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 800 }}>
                                Concept {i + 1}, {conceptTitle}
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button className="btn" onClick={() => copyText(conceptText)}>
                                  Copy concept
                                </button>
                              </div>
                            </div>

                            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                              <SectionBlock
                                title="Top hook"
                                body={sectionHook}
                                onCopy={() => copyText(sectionHook)}
                              />
                              <SectionBlock
                                title="On-screen overlay"
                                body={sectionOverlay}
                                onCopy={() => copyText(sectionOverlay)}
                              />
                              <SectionBlock
                                title="Caption"
                                body={sectionCaption}
                                onCopy={() => copyText(sectionCaption)}
                              />

                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                  <div style={{ fontWeight: 700 }}>Hashtags</div>
                                  <button className="btn" onClick={() => copyText(sectionTags)} disabled={!sectionTags.trim()}>
                                    Copy
                                  </button>
                                </div>

                                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  {tags.length ? (
                                    tags.map((t, idx) => (
                                      <span
                                        key={idx}
                                        className="pill"
                                        style={{ cursor: "pointer" }}
                                        title="Click to copy"
                                        onClick={() => copyText(t)}
                                      >
                                        {t}
                                      </span>
                                    ))
                                  ) : (
                                    <div className="smallNote">No hashtags returned.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
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
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("Add Privacy Policy later, before Stripe.");
              }}
            >
              Privacy
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                alert("Add Terms later, before Stripe.");
              }}
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <input
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: "100%" }}
      />
    </div>
  );
}

function SectionBlock({ title, body, onCopy }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <button className="btn" onClick={onCopy} disabled={!String(body || "").trim()}>
          Copy
        </button>
      </div>
      <div
        className="mono"
        style={{
          marginTop: 8,
          borderRadius: 12,
          padding: 10,
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.08)",
          whiteSpace: "pre-wrap",
        }}
      >
        {String(body || "").trim() || "No content returned."}
      </div>
    </div>
  );
}
