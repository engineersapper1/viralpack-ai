"use client";

import { useMemo, useState } from "react";

const demoExport = {
  client_name: "Acme Marine",
  posts: [
    {
      id: "IG-3001",
      platform: "Instagram",
      status: "published",
      title: "Sunrise Launch",
      description: "Harbor sunrise launch reel with motion graphics.",
      media_type: "photo",
      asset_path: "social_copyright_pack/examples/post1.jpg",
      caption_text: "Meet the new season at sunrise.",
      published_at: "2026-03-27T09:15:00Z",
      rights_owner: "Acme Marine",
      author: "ViralPack Studio",
      work_for_hire: "yes",
      url: "https://example.com/posts/IG-3001",
      location: { label: "Clearwater Harbor", city: "Clearwater", state: "FL", country: "USA" },
      tags: ["launch", "sunrise", "marina"],
      notes: "Campaign = Spring Splash"
    }
  ]
};

export default function CopyrightPackPage() {
  const year = useMemo(() => new Date().getFullYear(), []);
  const [form, setForm] = useState({
    client_name: "Acme Marine",
    rights_owner: "Acme Marine",
    author: "ViralPack Studio",
    work_for_hire: "yes",
    location_text: "Clearwater, FL, USA",
    city: "Clearwater",
    state: "FL",
    country: "USA",
    cloud_provider: "none",
    cloud_remote_root: "copyright-packs",
    source_root: ".",
  });
  const [exportText, setExportText] = useState(JSON.stringify(demoExport, null, 2));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);

  function onChange(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function buildPack() {
    setBusy(true);
    setMsg("");
    setErr("");
    setResult(null);
    try {
      const export_json = JSON.parse(exportText);
      const res = await fetch("/api/copyright-pack/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, export_json }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Build failed");
      setResult(data);
      setMsg("Copyright pack built.");
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <img src="/logo.png" alt="ViralPack.ai" style={{ width: 38, height: 38, borderRadius: 10 }} />
          <div>
            <h1>ViralPack.ai</h1>
            <div className="badge">Copyright Pack</div>
          </div>
        </div>
        <div className="navActions">
          <a className="btn" href="/">Home</a>
          <a className="btn" href="/generator">Generator</a>
          <a className="btn" href="/studio">Studio</a>
        </div>
      </div>

      <main className="hero">
        <div className="heroGrid">
          <div className="card">
            <p className="kicker">Archive, batch, cloud-drop</p>
            <h2 className="h1">Build a copyright packet from your publish export.</h2>
            <p className="sub">
              Paste a ViralPack-style publish export, choose Dropbox or Google Drive if you want,
              and generate a filing-ready bundle with worksheet, guide, vault, and batch ZIPs.
            </p>

            <div className="pills" style={{ marginTop: 14 }}>
              <span className="pill">Derived manifest</span>
              <span className="pill">Filing worksheet</span>
              <span className="pill">Step guide</span>
              <span className="pill">Cloud receipt</span>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Run settings</h2>
            <div className="formStack" style={{ marginTop: 12 }}>
              <input className="input" value={form.client_name} onChange={(e) => onChange("client_name", e.target.value)} placeholder="Client name" />
              <input className="input" value={form.rights_owner} onChange={(e) => onChange("rights_owner", e.target.value)} placeholder="Rights owner" />
              <input className="input" value={form.author} onChange={(e) => onChange("author", e.target.value)} placeholder="Author" />
              <input className="input" value={form.work_for_hire} onChange={(e) => onChange("work_for_hire", e.target.value)} placeholder="Work for hire, yes or no" />
              <input className="input" value={form.location_text} onChange={(e) => onChange("location_text", e.target.value)} placeholder="Default location" />
              <div className="twoCol">
                <input className="input" value={form.city} onChange={(e) => onChange("city", e.target.value)} placeholder="City" />
                <input className="input" value={form.state} onChange={(e) => onChange("state", e.target.value)} placeholder="State" />
              </div>
              <div className="twoCol">
                <input className="input" value={form.country} onChange={(e) => onChange("country", e.target.value)} placeholder="Country" />
                <input className="input" value={form.source_root} onChange={(e) => onChange("source_root", e.target.value)} placeholder="Source root on server" />
              </div>
              <div className="twoCol">
                <select className="input" value={form.cloud_provider} onChange={(e) => onChange("cloud_provider", e.target.value)}>
                  <option value="none">No cloud drop</option>
                  <option value="dropbox">Dropbox</option>
                  <option value="gdrive">Google Drive</option>
                </select>
                <input className="input" value={form.cloud_remote_root} onChange={(e) => onChange("cloud_remote_root", e.target.value)} placeholder="Remote folder root" />
              </div>
            </div>
            <div className="ctaRow" style={{ marginTop: 14 }}>
              <button className="btn btnPrimary" onClick={buildPack} disabled={busy}>{busy ? "Building..." : "Build Copyright Pack"}</button>
            </div>
            {msg ? <div className="toastOk">{msg}</div> : null}
            {err ? <div className="toastErr">{err}</div> : null}
          </div>
        </div>
      </main>

      <section className="section">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Publish export JSON</h2>
          <p className="stepDesc">Paste the same kind of structured output your publish pipeline can emit after posting.</p>
          <textarea className="bigTextArea" value={exportText} onChange={(e) => setExportText(e.target.value)} />
        </div>
      </section>

      {result ? (
        <section className="section" style={{ paddingBottom: 26 }}>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Run output</h2>
            <div className="mono">
{`run_id = ${result.run_id}
client = ${result.client_name}
items = ${result.item_count}
buckets = ${result.bucket_count}
cloud = ${result.cloud?.provider || "none"}
remote = ${result.cloud?.remote_path || ""}`}
            </div>
            <div className="ctaRow" style={{ marginTop: 14 }}>
              <a className="btn btnPrimary" href={result.download}>Download package ZIP</a>
              <a className="btn" href={result.guide_download}>Guide</a>
              <a className="btn" href={result.worksheet_download}>Worksheet</a>
              <a className="btn" href={result.report_download}>Report JSON</a>
            </div>
          </div>
        </section>
      ) : null}

      <footer className="footer">
        <div className="footerRow">
          <div>© {year} ViralPack.ai</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href="/">Home</a>
            <a href="/studio">Studio</a>
            <a href="/copyright-pack">Copyright Pack</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
