"use client";

import { useMemo, useState } from "react";

function saveBlob(filename, content, mime = "text/plain;charset=utf-8") {
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

function saveBase64Zip(filename, base64) {
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

export default function StudioPage() {
  const year = useMemo(() => new Date().getFullYear(), []);
  const [gateKey, setGateKey] = useState("");
  const [gateMsg, setGateMsg] = useState("");
  const [gateErr, setGateErr] = useState("");
  const [isWorking, setIsWorking] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [duration, setDuration] = useState("12");
  const [includeCopyright, setIncludeCopyright] = useState(true);
  const [exportMode, setExportMode] = useState("local");
  const [dropboxToken, setDropboxToken] = useState("");
  const [dropboxFolder, setDropboxFolder] = useState("/ViralPack");
  const [viralPack, setViralPack] = useState(null);
  const [copyrightPack, setCopyrightPack] = useState(null);
  const [adPlan, setAdPlan] = useState(null);
  const [renderJob, setRenderJob] = useState(null);
  const [form, setForm] = useState({
    brand_name: "ViralPack.ai",
    product: "SaaS that generates short-form hooks and content concepts",
    offer: "Early access waitlist",
    website: "https://viralpack.ai",
    market: "Creators, agencies, small businesses",
  });

  function onChange(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function verifyGate() {
    setGateMsg("");
    setGateErr("");
    try {
      const res = await fetch("/api/beta/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: gateKey.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Verification failed");
      setGateMsg("Access granted. Cookie set.");
    } catch (e) {
      setGateErr(e?.message || String(e));
    }
  }

  async function generatePromptsOnly() {
    setMsg("");
    setErr("");
    setRenderJob(null);
    setAdPlan(null);
    setIsWorking(true);
    try {
      const planRes = await fetch("/api/ad/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: {
            brand_name: form.brand_name,
            product: form.product,
            offer: form.offer,
            website: form.website,
            audience: form.market,
          },
          duration: Number(duration),
          viralPack: viralPack || null,
        }),
      });
      const planData = await planRes.json().catch(() => null);
      if (!planRes.ok || !planData?.ok) throw new Error(planData?.error || "Plan failed");
      setAdPlan(planData.plan);

      if (includeCopyright) {
        const cr = await fetch("/api/copyright/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, reference_text: JSON.stringify(planData.plan, null, 2), asset_description: `Ad prompt plan for ${duration}s run.` }),
        });
        const cdata = await cr.json().catch(() => null);
        if (!cr.ok || !cdata?.ok) throw new Error(cdata?.error || "Copyright pack failed");
        setCopyrightPack(cdata);
      }
      setMsg("Prompts generated.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setIsWorking(false);
    }
  }

  async function renderFromPlan() {
    setMsg("");
    setErr("");
    if (!adPlan) return setErr("No plan yet. Generate prompts first.");
    setIsWorking(true);
    try {
      const res = await fetch("/api/ad/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: adPlan }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Render failed");
      setRenderJob(data);
      setMsg("Render job finished.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setIsWorking(false);
    }
  }

  async function generateFullPackage() {
    setMsg("");
    setErr("");
    setRenderJob(null);
    setAdPlan(null);
    setCopyrightPack(null);
    setIsWorking(true);
    try {
      const packRes = await fetch("/api/produce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const packData = await packRes.json().catch(() => null);
      if (!packRes.ok || !packData?.ok) throw new Error(packData?.error || "Produce failed");
      setViralPack(packData.output || null);

      const planRes = await fetch("/api/ad/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: {
            brand_name: form.brand_name,
            product: form.product,
            offer: form.offer,
            website: form.website,
            audience: form.market,
          },
          duration: Number(duration),
          viralPack: packData.output || null,
        }),
      });
      const planData = await planRes.json().catch(() => null);
      if (!planRes.ok || !planData?.ok) throw new Error(planData?.error || "Plan failed");
      setAdPlan(planData.plan);

      if (includeCopyright) {
        const cr = await fetch("/api/copyright/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, reference_text: JSON.stringify({ viralPack: packData.output, adPlan: planData.plan }, null, 2), asset_description: `Full package with hooks plus ${duration}s ad plan.` }),
        });
        const cdata = await cr.json().catch(() => null);
        if (!cr.ok || !cdata?.ok) throw new Error(cdata?.error || "Copyright pack failed");
        setCopyrightPack(cdata);
      }

      setMsg("Full package complete: Viral Pack + prompts" + (includeCopyright ? " + copyright pack." : "."));
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setIsWorking(false);
    }
  }

  async function exportCopyrightPack() {
    if (!copyrightPack && !viralPack && !adPlan) return;
    const res = await fetch("/api/copyright/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: exportMode,
        brand_name: form.brand_name,
        claimant_name: form.brand_name,
        author_name: form.brand_name,
        website: form.website,
        market: form.market,
        work_title: `${form.brand_name} Studio Output`,
        work_type_hint: "text",
        publication_status: "unpublished",
        additional_notes: `Packet generated from studio outputs for a ${duration}s run.`,
        dropbox_access_token: dropboxToken,
        dropbox_folder: dropboxFolder,
        virtual_files: [
          { name: "viral-pack.json", content: JSON.stringify(viralPack || {}, null, 2), type: "application/json" },
          { name: "ad-plan.json", content: JSON.stringify(adPlan || {}, null, 2), type: "application/json" },
          { name: "copyright-pack.json", content: JSON.stringify(copyrightPack?.output || {}, null, 2), type: "application/json" },
        ],
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error(data?.error || "Export failed");
    if (data.mode === "local") {
      saveBase64Zip(data.filename, data.zip_base64);
      setMsg("Downloaded copyright filing packet locally.");
    } else {
      setMsg(`Uploaded to Dropbox: ${data.uploaded?.path_display || data.filename}`);
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <img src="/logo.png" alt="ViralPack.ai" style={{ width: 38, height: 38, borderRadius: 10 }} />
          <div><h1>ViralPack.ai</h1><div className="badge">Studio</div></div>
        </div>
        <div className="navActions">
          <a className="btn" href="/">Landing</a>
          <a className="btn" href="/generator">Generator</a>
          <a className="btn" href="/copyright">Copyright tab</a>
        </div>
      </div>

      <main className="hero">
        <div className="heroGrid">
          <div className="card">
            <p className="kicker">Beta access required</p>
            <h2 className="h1">Studio</h2>
            <p className="sub">Modular flow: generate hooks/prompts, add copyright as a checkbox, then export a human filing packet ZIP locally or to Dropbox when linked.</p>
            <div className="hr" />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="input" placeholder="Enter beta key" value={gateKey} onChange={(e) => setGateKey(e.target.value)} />
              <button className="btn" onClick={verifyGate} disabled={isWorking}>Verify key</button>
            </div>
            {gateMsg ? <div className="toastOk">{gateMsg}</div> : null}
            {gateErr ? <div className="toastErr">{gateErr}</div> : null}

            <div className="hr" />
            <div style={{ display: "grid", gap: 10 }}>
              {Object.entries(form).map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>{k.replaceAll("_", " ")}</div>
                  <input className="input" value={v} onChange={(e) => onChange(k, e.target.value)} style={{ width: "100%" }} />
                </div>
              ))}
            </div>

            <div className="hr" />
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Duration</div>
                <select className="input" value={duration} onChange={(e) => setDuration(e.target.value)}>
                  <option value="12">12s</option>
                  <option value="20">20s</option>
                  <option value="24">24s</option>
                </select>
              </div>
              <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={includeCopyright} onChange={(e) => setIncludeCopyright(e.target.checked)} />
                <span>Include copyright pack while generating hooks/video prompts</span>
              </label>
            </div>

            <div className="hr" />
            <div className="ctaRow">
              <button className="btn btnPrimary" onClick={generateFullPackage} disabled={isWorking}>Generate Viral Pack</button>
              <button className="btn" onClick={generatePromptsOnly} disabled={isWorking}>Generate prompts</button>
              <button className="btn" onClick={renderFromPlan} disabled={isWorking || !adPlan}>Render from prompts</button>
            </div>

            <div className="hr" />
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>Copyright packet export</div>
              <select className="input" value={exportMode} onChange={(e) => setExportMode(e.target.value)}>
                <option value="local">Local only</option>
                <option value="dropbox">Dropbox upload</option>
              </select>
              {exportMode === "dropbox" ? (
                <>
                  <input className="input" placeholder="Dropbox access token or wire OAuth later" value={dropboxToken} onChange={(e) => setDropboxToken(e.target.value)} />
                  <input className="input" placeholder="Dropbox folder, ex: /ViralPack" value={dropboxFolder} onChange={(e) => setDropboxFolder(e.target.value)} />
                </>
              ) : null}
              <button className="btn" onClick={exportCopyrightPack} disabled={(!copyrightPack && !viralPack && !adPlan) || isWorking}>Export copyright packet .zip</button>
            </div>

            {msg ? <div className="toastOk">{msg}</div> : null}
            {err ? <div className="toastErr">{err}</div> : null}
          </div>

          <div className="card">
            <p className="kicker">Output</p>
            <div className="exampleBox"><div className="mono">{viralPack ? JSON.stringify(viralPack, null, 2) : "No Viral Pack yet."}</div></div>
            <div className="section" style={{ marginTop: 12 }}>
              <p className="stepTitle">Ad plan</p>
              <div className="exampleBox"><div className="mono">{adPlan ? JSON.stringify(adPlan, null, 2) : "No ad plan yet."}</div></div>
            </div>
            <div className="section" style={{ marginTop: 12 }}>
              <p className="stepTitle">Copyright pack</p>
              <div className="exampleBox"><div className="mono">{copyrightPack ? JSON.stringify(copyrightPack.output, null, 2) : "No copyright pack yet."}</div></div>
            </div>
            <div className="section" style={{ marginTop: 12 }}>
              <p className="stepTitle">Render job</p>
              <div className="exampleBox"><div className="mono">{renderJob ? JSON.stringify(renderJob, null, 2) : "No render yet."}</div></div>
            </div>
          </div>
        </div>
      </main>

      <footer className="section"><div className="smallNote">© {year} ViralPack.ai</div></footer>
    </div>
  );
}
