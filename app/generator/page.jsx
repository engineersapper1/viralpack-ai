"use client";

import { useMemo, useState } from "react";

function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadBase64Zip(filename, base64) {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function GeneratorPage() {
  const year = useMemo(() => new Date().getFullYear(), []);
  const [gateKey, setGateKey] = useState("");
  const [gateMsg, setGateMsg] = useState("");
  const [gateErr, setGateErr] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");
  const [genErr, setGenErr] = useState("");
  const [includeCopyright, setIncludeCopyright] = useState(true);
  const [result, setResult] = useState(null);
  const [copyrightPack, setCopyrightPack] = useState(null);
  const [form, setForm] = useState({
    brand_name: "ViralPack.ai",
    product: "SaaS that generates short-form hooks and content concepts",
    offer: "Early access waitlist",
    website: "https://viralpack.ai",
    market: "Creators, agencies, small businesses",
  });

  const TOP_K = 5;
  const buckets = useMemo(() => {
    const out = result?.output || {};
    return {
      hooks: Array.isArray(out.hooks) ? out.hooks.slice(0, TOP_K) : [],
      overlays: Array.isArray(out.on_screen_overlays) ? out.on_screen_overlays.slice(0, TOP_K) : [],
      captions: Array.isArray(out.captions) ? out.captions.slice(0, TOP_K) : [],
      hashtags: Array.isArray(out.hashtags) ? out.hashtags.slice(0, TOP_K) : [],
    };
  }, [result]);

  function onChangeField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function verifyKey(e) {
    e?.preventDefault?.();
    setGateErr("");
    setGateMsg("");
    try {
      const r = await fetch("/api/beta/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: gateKey.trim() }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Verify failed");
      setGateMsg("Access granted.");
      setGateKey("");
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      setGateErr(err?.message || "Couldn’t verify key.");
    }
  }

  async function generate(e) {
    e?.preventDefault?.();
    if (isGenerating) return;
    setIsGenerating(true);
    setGenErr("");
    setGenMsg("Generating...");
    setResult(null);
    setCopyrightPack(null);

    try {
      const payload = { ...form, top_k: TOP_K };
      const r = await fetch("/api/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) throw new Error(data?.error || "Generate failed");
      setResult(data);

      if (includeCopyright) {
        const cr = await fetch("/api/copyright/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...form,
            asset_description: `Primary use case: hooks, short-form ad scripts, overlays, captions, hashtags.`,
            reference_text: JSON.stringify(data?.output || {}, null, 2),
          }),
        });
        const cdata = await cr.json().catch(() => null);
        if (!cr.ok || !cdata?.ok) throw new Error(cdata?.error || "Copyright pack failed");
        setCopyrightPack(cdata);
        setGenMsg("Generated output + copyright pack.");
      } else {
        setGenMsg("Generated output.");
      }
    } catch (err) {
      setGenErr(err?.message || "Couldn’t generate.");
      setGenMsg("");
    } finally {
      setIsGenerating(false);
    }
  }

  function exportTxt() {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const lines = [
      "ViralPack.ai, Producer Output",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Brand: ${form.brand_name}`,
      `Product: ${form.product}`,
      `Offer: ${form.offer}`,
      `Website: ${form.website}`,
      `Market: ${form.market}`,
      "",
      "TOP HOOKS",
      ...buckets.hooks.map((x) => `- ${x}`),
      "",
      "ON-SCREEN OVERLAYS",
      ...buckets.overlays.map((x) => `- ${x}`),
      "",
      "CAPTIONS",
      ...buckets.captions.map((x) => `- ${x}`),
      "",
      "HASHTAGS",
      ...buckets.hashtags.map((x) => x),
    ];
    if (copyrightPack?.output) lines.push("", "COPYRIGHT PACK", JSON.stringify(copyrightPack.output, null, 2));
    downloadFile(`viralpack-pack-${stamp}.txt`, lines.join("\n"));
  }

  async function exportCopyrightPacketZip() {
    if (!result) return;
    const res = await fetch("/api/copyright/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        brand_name: form.brand_name,
        claimant_name: form.brand_name,
        author_name: form.brand_name,
        website: form.website,
        market: form.market,
        work_title: `${form.brand_name} Viral Pack Output`,
        work_type_hint: "text",
        publication_status: "unpublished",
        additional_notes: "Packet generated from ViralPack generator outputs.",
        virtual_files: [
          { name: "hooks.txt", content: buckets.hooks.join("\n") },
          { name: "overlays.txt", content: buckets.overlays.join("\n") },
          { name: "captions.txt", content: buckets.captions.join("\n\n") },
          { name: "hashtags.txt", content: buckets.hashtags.join(" ") },
          { name: "source-output.json", content: JSON.stringify(result?.output || {}, null, 2), type: "application/json" },
        ],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Packet export failed");
    downloadBase64Zip(data.filename, data.zip_base64);
    setGenMsg("Downloaded copyright filing packet ZIP.");
  }

  const hasOutput = buckets.hooks.length || buckets.overlays.length || buckets.captions.length || buckets.hashtags.length;

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
        <div className="navActions">
          <a className="btn" href="/">Landing</a>
          <a className="btn" href="/studio">Studio</a>
          <a className="btn" href="/copyright">Copyright tab</a>
        </div>
      </div>

      <main className="hero">
        <div className="heroGrid">
          <div className="card">
            <p className="kicker">Beta access required</p>
            <h2 className="h1">Generator</h2>
            <p className="sub">Top 5 by bucket, with an optional copyright layer baked into the same run and a ZIP filing packet export for human use.</p>
            <div className="hr" />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input className="input" value={gateKey} onChange={(e) => setGateKey(e.target.value)} placeholder="Enter beta key" style={{ minWidth: 260 }} />
              <button type="button" className="btn btnPrimary" onClick={verifyKey} disabled={isGenerating}>Verify key</button>
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
            <label style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14 }}>
              <input type="checkbox" checked={includeCopyright} onChange={(e) => setIncludeCopyright(e.target.checked)} />
              <span>Include copyright pack with hooks output</span>
            </label>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="button" className="btn btnPrimary" onClick={generate} disabled={isGenerating}>{isGenerating ? "Generating..." : "Generate"}</button>
              <button type="button" className="btn" onClick={exportTxt} disabled={!hasOutput || isGenerating}>Export .txt</button>
              <button type="button" className="btn" onClick={() => exportCopyrightPacketZip().catch((e) => setGenErr(e?.message || String(e)))} disabled={!hasOutput || isGenerating}>Copyright packet .zip</button>
              <button type="button" className="btn" onClick={() => navigator.clipboard.writeText(JSON.stringify({ result, copyrightPack }, null, 2))} disabled={!result || isGenerating}>Copy JSON</button>
            </div>

            {genMsg ? <div className="toastOk">{genMsg}</div> : null}
            {genErr ? <div className="toastErr">{genErr}</div> : null}
            <p className="smallNote">Protected by middleware. Re-verify if you lose the beta cookie.</p>
          </div>

          <div className="card">
            <p className="kicker">Output</p>
            <Bucket title="TOP HOOKS (5)" items={buckets.hooks} />
            <Bucket title="ON-SCREEN OVERLAYS (5)" items={buckets.overlays} />
            <Bucket title="CAPTIONS (5)" items={buckets.captions} />
            <Bucket title="HASHTAGS (5)" items={buckets.hashtags} />
            <Bucket title="COPYRIGHT RIGHTS FLAGS" items={copyrightPack?.output?.rights_flags || []} />
            <Bucket title="COPYRIGHT ORIGINALITY MOVES" items={copyrightPack?.output?.originality_moves || []} />
          </div>
        </div>
      </main>

      <footer className="section"><div className="smallNote">© {year} ViralPack.ai</div></footer>
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

function Bucket({ title, items }) {
  const list = Array.isArray(items) ? items : [];
  return (
    <div className="section" style={{ marginTop: 12 }}>
      <p className="stepTitle">{title}</p>
      <div className="exampleBox" style={{ marginTop: 8 }}>
        <div className="mono">{list.length ? list.map((x, i) => `${i + 1}. ${x}`).join("\n") : "(none yet)"}</div>
      </div>
    </div>
  );
}
