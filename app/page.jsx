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
  const [topOnly, setTopOnly] = useState(true);
  const TOP_K = 5;

  // Producer tester state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  const [genErr, setGenErr] = useState("");
  const [assets, setAssets] = useState([]);
  const [lastResponse, setLastResponse] = useState(null);

  const buckets = useMemo(() => {
    const list = Array.isArray(assets) ? assets : [];

    const hooks = [];
    const overlays = [];
    const captions = [];
    const hashtags = [];

    for (const a of list) {
      const h = cleanLine(a?.hook);
      const o = cleanLine(a?.on_screen_overlay);
      const c = cleanLine(a?.caption);
      const tags = Array.isArray(a?.hashtags) ? a.hashtags : [];

      if (h) hooks.push(h);
      if (o) overlays.push(o);
      if (c) captions.push(c);

      for (const t of tags) {
        const tag = cleanLine(t);
        if (tag) hashtags.push(tag);
      }
    }

    // Dedupe while preserving order
    const dedupe = (arr) => {
      const seen = new Set();
      const out = [];
      for (const x of arr) {
        const key = x.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(x);
      }
      return out;
    };

    const h2 = dedupe(hooks);
    const o2 = dedupe(overlays);
    const c2 = dedupe(captions);
    const t2 = dedupe(hashtags);

    // Top K trimming, per bucket
    const cut = (arr) => (topOnly ? arr.slice(0, TOP_K) : arr);

    return {
      hooks: cut(h2),
      overlays: cut(o2),
      captions: cut(c2),
      hashtags: cut(t2),
    };
  }, [assets, topOnly]);

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

  function cleanLine(v) {
    const s = safeText(v).replace(/\s+/g, " ").trim();
    return s || "";
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

  function buildBucketText({ hooks, overlays, captions, hashtags }) {
    const lines = [];
    lines.push("ViralPack.ai, Producer Output");
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

    lines.push("TOP HOOKS");
    (hooks || []).forEach((h) => lines.push(`- ${h}`));
    lines.push("");

    lines.push("ON SCREEN OVERLAYS");
    (overlays || []).forEach((o) => lines.push(`- ${o}`));
    lines.push("");

    lines.push("CAPTIONS");
    (captions || []).forEach((c) => lines.push(`- ${c}`));
    lines.push("");

    lines.push("HASHTAGS");
    (hashtags || []).forEach((t) => lines.push(`${t}`));
    lines.push("");

    lines.push("------------------------------------------------------------");
    lines.push("");

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
    const txt = buildBucketText(buckets);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(`viralpack-pack-${stamp}.txt`, txt, "text/plain;charset=utf-8");
  }

  // Versioned JSON export wrapper (includes raw + derived buckets)
  function buildExportJson() {
    const stamp = new Date().toISOString();
    return {
      schema_version: "vp_pack_export_v2",
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
        raw_assets: assets,
        buckets: {
          schema_version: "vp_buckets_v1",
          hooks: buckets.hooks,
          on_screen_overlays: buckets.overlays,
          captions: buckets.captions,
          hashtags: buckets.hashtags,
        },
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

      const rawList = Array.isArray(data?.assets)
        ? data.assets
        : Array.isArray(data?.hooks_pack?.assets)
        ? data.hooks_pack.assets
        : [];

      // Keep raw assets as-is, buckets will top-k themselves
      setAssets(rawList);
      setGenMsg(rawList.length ? "Generated output." : "No output returned.");
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

  function hasAnyOutput() {
    return (
      buckets.hooks.length ||
      buckets.overlays.length ||
      buckets.captions.length ||
      buckets.hashtags.length
    );
  }

  function copySection(title, arr, formatter) {
    const lines = [];
    lines.push(title);
    lines.push("");
    (arr || []).forEach((x) => lines.push(formatter ? formatter(x) : x));
    return copyText(lines.join("\n"));
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
              <span className="pill">On-screen overlays</span>
              <span className="pill">Captions</span>
              <span className="pill">Top hashtags</span>
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
                      Return top {TOP_K} only (per category)
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
                    onClick={() => copyText(buildBucketText(buckets))}
                    disabled={!hasAnyOutput() || isGenerating}
                    title="Copy the full generated pack as text."
                  >
                    Copy full pack
                  </button>

                  <button
                    className="btn"
                    onClick={exportTxt}
                    disabled={!hasAnyOutput() || isGenerating}
                    title="Download a .txt file of the generated pack."
                  >
                    Export .txt
                  </button>

                  <button
                    className="btn"
                    onClick={exportJson}
                    disabled={!hasAnyOutput() || isGenerating}
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

              {/* Results, bucketed */}
              {hasAnyOutput() ? (
                <div style={{ marginTop: 14 }}>
                  <div className="exampleBox" style={{ marginTop: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 800 }}>Generated Picks</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className="btn" onClick={() => copyText(buildBucketText(buckets))}>
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

                    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                      <BucketBlock
                        title="Top hooks"
                        items={buckets.hooks}
                        onCopyAll={() => copySection("TOP HOOKS", buckets.hooks, (x) => `- ${x}`)}
                        onCopyItem={(x) => copyText(x)}
                      />

                      <BucketBlock
                        title="On-screen overlays"
                        items={buckets.overlays}
                        onCopyAll={() =>
                          copySection("ON SCREEN OVERLAYS", buckets.overlays, (x) => `- ${x}`)
                        }
                        onCopyItem={(x) => copyText(x)}
                      />

                      <BucketBlock
                        title="Captions"
                        items={buckets.captions}
                        onCopyAll={() => copySection("CAPTIONS", buckets.captions, (x) => `- ${x}`)}
                        onCopyItem={(x) => copyText(x)}
                        multiline
                      />

                      <HashtagBucket
                        title="Hashtags"
                        tags={buckets.hashtags}
                        onCopyAll={() => copyText(buckets.hashtags.join(" "))}
                        onCopyTag={(t) => copyText(t)}
                      />
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
          <p className="stepBody">
            This is a trimmed preview. Your real output includes the full script, shot list, overlays, captions, and hashtags.
          </p>
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

function BucketBlock({ title, items, onCopyAll, onCopyItem, multiline }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <button className="btn" onClick={onCopyAll} disabled={!list.length}>
          Copy all
        </button>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {list.length ? (
          list.map((x, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "start",
              }}
            >
              <div
                className="mono"
                style={{
                  borderRadius: 12,
                  padding: 10,
                  background: "rgba(0,0,0,0.35)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  whiteSpace: multiline ? "pre-wrap" : "normal",
                }}
              >
                {x}
              </div>
              <button className="btn" onClick={() => onCopyItem(x)}>
                Copy
              </button>
            </div>
          ))
        ) : (
          <div className="smallNote">No items returned.</div>
        )}
      </div>
    </div>
  );
}

function HashtagBucket({ title, tags, onCopyAll, onCopyTag }) {
  const list = Array.isArray(tags) ? tags : [];
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 14,
        padding: 12,
        background: "rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800 }}>{title}</div>
        <button className="btn" onClick={onCopyAll} disabled={!list.length}>
          Copy all
        </button>
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {list.length ? (
          list.map((t, idx) => (
            <span
              key={idx}
              className="pill"
              style={{ cursor: "pointer" }}
              title="Click to copy"
              onClick={() => onCopyTag(t)}
            >
              {t}
            </span>
          ))
        ) : (
          <div className="smallNote">No hashtags returned.</div>
        )}
      </div>
    </div>
  );
}
