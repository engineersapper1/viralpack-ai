"use client";

import { useMemo, useState } from "react";

export default function GeneratorPage() {
  const year = useMemo(() => new Date().getFullYear(), []);

  const [gateKey, setGateKey] = useState("");
  const [gateMsg, setGateMsg] = useState("");
  const [gateErr, setGateErr] = useState("");

  // Editable inputs
  const [form, setForm] = useState({
    brand_name: "ViralPack.ai",
    product: "SaaS that generates short-form hooks and content concepts",
    offer: "Early access waitlist",
    website: "https://viralpack.ai",
    market: "Creators, agencies, small businesses",
  });

  const TOP_K = 5;

  const [isGenerating, setIsGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  const [genErr, setGenErr] = useState("");
  const [result, setResult] = useState(null);

  const buckets = useMemo(() => {
    const out = result?.output || {};
    return {
      hooks: Array.isArray(out.hooks) ? out.hooks.slice(0, TOP_K) : [],
      overlays: Array.isArray(out.on_screen_overlays) ? out.on_screen_overlays.slice(0, TOP_K) : [],
      captions: Array.isArray(out.captions) ? out.captions.slice(0, TOP_K) : [],
      hashtags: Array.isArray(out.hashtags) ? out.hashtags.slice(0, TOP_K) : [],
    };
  }, [result]);

  function safeText(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  async function copyText(text) {
    const t = safeText(text).trim();
    if (!t) return;

    try {
      await navigator.clipboard.writeText(t);
      setGenMsg("Copied to clipboard.");
      setTimeout(() => setGenMsg(""), 1200);
    } catch {
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
      } catch {
        setGenErr("Copy failed in this browser.");
        setTimeout(() => setGenErr(""), 2000);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  function buildTxtExport() {
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
    lines.push("");
    lines.push("============================================================");
    lines.push("");

    lines.push("TOP HOOKS (5)");
    buckets.hooks.forEach((h) => lines.push(`- ${h}`));
    lines.push("");

    lines.push("ON-SCREEN OVERLAYS (5)");
    buckets.overlays.forEach((o) => lines.push(`- ${o}`));
    lines.push("");

    lines.push("CAPTIONS (5)");
    buckets.captions.forEach((c) => lines.push(`- ${c}`));
    lines.push("");

    lines.push("HASHTAGS (5)");
    buckets.hashtags.forEach((t) => lines.push(`${t}`));
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
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(`viralpack-pack-${stamp}.txt`, buildTxtExport(), "text/plain;charset=utf-8");
  }

  function exportJson() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(
      `viralpack-pack-${stamp}.json`,
      JSON.stringify(result, null, 2),
      "application/json;charset=utf-8"
    );
  }

  async function verifyKey() {
    setGateErr("");
    setGateMsg("");

    const key = (gateKey || "").trim();
    if (!key) {
      setGateErr("Enter your beta key.");
      return;
    }

    try {
      const r = await fetch("/api/beta/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Invalid key");

      setGateMsg("Access granted. You can generate now.");
      setGateKey("");
      setTimeout(() => setGateMsg(""), 1200);

      // Middleware will now allow /api/produce and this page on refresh.
      // Not required, but feels good:
      window.location.reload();
    } catch (e) {
      setGateErr(e?.message || "Couldn’t verify key.");
    }
  }

  async function generate() {
    if (isGenerating) return;

    setIsGenerating(true);
    setGenErr("");
    setGenMsg("Generating, please wait…");
    setResult(null);

    try {
      const payload = { ...form, top_k: TOP_K };

      const r = await fetch("/api/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => null);

      if (!r.ok) {
        const msg = data?.error || data?.detail || "Request failed";
        throw new Error(msg);
      }

      setResult(data);
      setGenMsg("Generated output.");
    } catch (e) {
      setGenErr(e?.message || "Couldn’t generate. Confirm keys + server logs.");
      setGenMsg("");
    } finally {
      setIsGenerating(false);
    }
  }

  function onChangeField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const hasOutput =
    buckets.hooks.length || buckets.overlays.length || buckets.captions.length || buckets.hashtags.length;

  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <img src="/logo.png" alt="ViralPack.ai" style={{ width: 38, height: 38, borderRadius: 10 }} />
          <div>
            <h1>ViralPack.ai</h1>
            <div className="badge">Beta generator</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a className="btn" href="/">
            Landing
          </a>
        </div>
      </div>

      <main className="hero">
        <div className="heroGrid">
          <div className="card">
            <p className="kicker">Beta access required</p>
            <h2 className="h1">Generator</h2>
            <p className="sub">
              This runs the full pipeline: Chat → Grok → Chat. Output is top 5 per category.
            </p>

            <div className="hr" />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                className="input"
                value={gateKey}
                onChange={(e) => setGateKey(e.target.value)}
                placeholder="Enter beta key"
                style={{ minWidth: 260 }}
                disabled={isGenerating}
              />
              <button className="btn btnPrimary" onClick={verifyKey} disabled={isGenerating}>
                Verify key
              </button>
            </div>

            {gateMsg ? <div className="toastOk">{gateMsg}</div> : null}
            {gateErr ? <div className="toastErr">{gateErr}</div> : null}

            <div className="hr" />

            <div style={{ display: "grid", gap: 10 }}>
              <Field label="Brand name" value={form.brand_name} onChange={(v) => onChangeField("brand_name", v)} />
              <Field label="Product" value={form.product} onChange={(v) => onChangeField("product", v)} />
              <Field label="Offer" value={form.offer} onChange={(v) => onChangeField("offer", v)} />
              <Field label="Website" value={form.website} onChange={(v) => onChangeField("website", v)} />
              <Field label="Market" value={form.market} onChange={(v) => onChangeField("market", v)} />
            </div>

            <div className="hr" />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button className="btn btnPrimary" onClick={generate} disabled={isGenerating}>
                {isGenerating ? "Generating…" : "Generate"}
              </button>

              <button className="btn" onClick={() => copyText(buildTxtExport())} disabled={!hasOutput || isGenerating}>
                Copy all
              </button>

              <button className="btn" onClick={exportTxt} disabled={!hasOutput || isGenerating}>
                Export .txt
              </button>

              <button className="btn" onClick={exportJson} disabled={!result || isGenerating}>
                Export JSON
              </button>
            </div>

            {genMsg ? <div className="toastOk">{genMsg}</div> : null}
            {genErr ? <div className="toastErr">{genErr}</div> : null}

            <p className="smallNote">
              Protected by middleware, requires beta cookie. If you see “Access denied”, re-verify your key.
            </p>
          </div>

          <div className="card">
            <p className="kicker">Output</p>

            <Bucket title="TOP HOOKS (5)" items={buckets.hooks} onCopyAll={() => copyText(buckets.hooks.join("\n"))} />
            <Bucket title="ON-SCREEN OVERLAYS (5)" items={buckets.overlays} onCopyAll={() => copyText(buckets.overlays.join("\n"))} />
            <Bucket title="CAPTIONS (5)" items={buckets.captions} onCopyAll={() => copyText(buckets.captions.join("\n"))} />
            <Bucket title="HASHTAGS (5)" items={buckets.hashtags} onCopyAll={() => copyText(buckets.hashtags.join(" "))} />
          </div>
        </div>
      </main>

      {result ? (
        <div className="card" style={{ marginTop: 14 }}>
          <p className="kicker">Raw JSON (debug)</p>
          <div className="exampleBox">
            <div className="mono">{JSON.stringify(result, null, 2)}</div>
          </div>
        </div>
      ) : null}

      <footer className="footer">
        <div className="footerRow">
          <div>© {year} ViralPack.ai</div>
          <div className="mono">schema_version: {safeText(result?.schema_version || "—")}</div>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: "100%" }} />
    </div>
  );
}

function Bucket({ title, items, onCopyAll }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="section" style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <p className="stepTitle">{title}</p>
        <button className="btn" onClick={onCopyAll} disabled={!list.length}>
          Copy
        </button>
      </div>
      <div className="exampleBox" style={{ marginTop: 8 }}>
        <div className="mono">{list.length ? list.map((x, i) => `${i + 1}. ${x}`).join("\n") : "(none yet)"}</div>
      </div>
    </div>
  );
}
