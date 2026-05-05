"use client";

import { useMemo, useState } from "react";

const TEXTY = /\.(txt|md|csv|json|xml|yaml|yml|html|js|ts|jsx|tsx)$/i;

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

async function fileToPayload(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  let textPreview = "";
  const isText = file.type?.startsWith("text/") || TEXTY.test(file.name || "") || ["application/json", "application/xml"].includes(file.type);
  if (isText) {
    textPreview = await file.text().then((t) => t.slice(0, 4000)).catch(() => "");
  }
  return {
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    last_modified: file.lastModified ? new Date(file.lastModified).toISOString() : null,
    text_preview: textPreview,
    content_base64: btoa(binary),
  };
}

export default function CopyrightPage() {
  const year = useMemo(() => new Date().getFullYear(), []);
  const [gateKey, setGateKey] = useState("");
  const [gateMsg, setGateMsg] = useState("");
  const [gateErr, setGateErr] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [working, setWorking] = useState(false);
  const [summary, setSummary] = useState(null);
  const [files, setFiles] = useState([]);
  const [dropboxMode, setDropboxMode] = useState("local");
  const [dropboxToken, setDropboxToken] = useState("");
  const [dropboxFolder, setDropboxFolder] = useState("/ViralPack");
  const [form, setForm] = useState({
    brand_name: "ViralPack.ai",
    claimant_name: "",
    author_name: "",
    rights_contact: "",
    rights_email: "",
    website: "https://viralpack.ai",
    market: "Creators, agencies, small businesses",
    work_title: "",
    work_type_hint: "",
    publication_status: "unpublished",
    publication_date: "",
    creation_year: "",
    country: "United States",
    additional_notes: "Provide bulk media and generate one filing-prep packet with clear instructions.",
  });

  function onChange(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function verifyGate() {
    setGateErr("");
    setGateMsg("");
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

  async function buildPacket() {
    setWorking(true);
    setMsg("");
    setErr("");
    try {
      if (!files.length) throw new Error("Upload at least one file first.");
      const payloadFiles = await Promise.all(files.map(fileToPayload));
      const res = await fetch("/api/copyright/packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          files: payloadFiles,
          mode: dropboxMode,
          dropbox_access_token: dropboxToken,
          dropbox_folder: dropboxFolder,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Packet generation failed");
      setSummary(data.summary || null);
      if (data.mode === "local") {
        saveBase64Zip(data.filename, data.zip_base64);
        setMsg(`Downloaded ${data.filename}`);
      } else {
        setMsg(`Uploaded to Dropbox: ${data.uploaded?.path_display || data.filename}`);
      }
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <img src="/logo.png" alt="ViralPack.ai" style={{ width: 38, height: 38, borderRadius: 10 }} />
          <div><h1>ViralPack.ai</h1><div className="badge">Copyright agent tab</div></div>
        </div>
        <div className="navActions">
          <a className="btn" href="/">Landing</a>
          <a className="btn" href="/generator">Generator</a>
          <a className="btn" href="/studio">Studio</a>
        </div>
      </div>

      <main className="hero">
        <div className="heroGrid">
          <div className="card">
            <p className="kicker">Dedicated filing-prep workflow</p>
            <h2 className="h1">Bulk Copyright Packet Builder</h2>
            <p className="sub">Drop in media, fill the few facts only you know, and export one ZIP packet with the media, worksheet, title list, media index, manifest, and step-by-step filing instructions.</p>
            <div className="hr" />

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input className="input" placeholder="Enter beta key" value={gateKey} onChange={(e) => setGateKey(e.target.value)} />
              <button className="btn" onClick={verifyGate} disabled={working}>Verify key</button>
            </div>
            {gateMsg ? <div className="toastOk">{gateMsg}</div> : null}
            {gateErr ? <div className="toastErr">{gateErr}</div> : null}

            <div className="hr" />
            <div style={{ display: "grid", gap: 10 }}>
              {Object.entries(form).map(([k, v]) => (
                k === "publication_status" ? (
                  <div key={k}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{k.replaceAll("_", " ")}</div>
                    <select className="input" value={v} onChange={(e) => onChange(k, e.target.value)} style={{ width: "100%" }}>
                      <option value="unpublished">Unpublished</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                ) : k === "additional_notes" ? (
                  <div key={k}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{k.replaceAll("_", " ")}</div>
                    <textarea className="input" rows={5} value={v} onChange={(e) => onChange(k, e.target.value)} style={{ width: "100%" }} />
                  </div>
                ) : (
                  <div key={k}>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{k.replaceAll("_", " ")}</div>
                    <input className="input" value={v} onChange={(e) => onChange(k, e.target.value)} style={{ width: "100%" }} />
                  </div>
                )
              ))}

              <div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Upload bulk media</div>
                <input className="input" type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} />
                <div className="smallNote">The packet will include the original uploaded files inside a /media folder.</div>
              </div>
            </div>

            <div className="hr" />
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>Export mode</div>
              <select className="input" value={dropboxMode} onChange={(e) => setDropboxMode(e.target.value)}>
                <option value="local">Local only</option>
                <option value="dropbox">Dropbox upload</option>
              </select>
              {dropboxMode === "dropbox" ? (
                <>
                  <input className="input" placeholder="Dropbox access token" value={dropboxToken} onChange={(e) => setDropboxToken(e.target.value)} />
                  <input className="input" placeholder="Dropbox folder, ex: /ViralPack" value={dropboxFolder} onChange={(e) => setDropboxFolder(e.target.value)} />
                </>
              ) : null}
            </div>

            <div className="hr" />
            <div className="ctaRow">
              <button className="btn btnPrimary" onClick={buildPacket} disabled={working}>{working ? "Building packet..." : "Build filing packet"}</button>
            </div>

            {msg ? <div className="toastOk">{msg}</div> : null}
            {err ? <div className="toastErr">{err}</div> : null}
          </div>

          <div className="card">
            <p className="kicker">Packet preview</p>
            <div className="exampleBox" style={{ marginBottom: 12 }}>
              <div className="mono">{files.length ? files.map((f, i) => `${i + 1}. ${f.name} (${f.type || "unknown"}, ${f.size} bytes)`).join("\n") : "No files uploaded yet."}</div>
            </div>
            <p className="stepTitle">What the ZIP includes</p>
            <div className="exampleBox" style={{ marginBottom: 12 }}>
              <div className="mono">01_READ_ME_FIRST.txt\n02_REGISTRATION_WORKSHEET.doc\n03_MEDIA_INDEX.csv\n04_DEPOSIT_MANIFEST.txt\n05_TITLE_LIST.txt\n06_FILING_INSTRUCTIONS.txt\nmetadata/extracted_metadata.json\nmedia/*original uploaded files*</div>
            </div>
            <p className="stepTitle">Summary</p>
            <div className="exampleBox"><div className="mono">{summary ? JSON.stringify(summary, null, 2) : "No packet built yet."}</div></div>
          </div>
        </div>
      </main>

      <footer className="section"><div className="smallNote">© {year} ViralPack.ai</div></footer>
    </div>
  );
}
