"use client";

import { useState, useEffect } from "react";

export default function StudioPage() {
  const [authorized, setAuthorized] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [json, setJson] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = document.cookie.includes("studio_auth=true");
    if (saved) setAuthorized(true);
  }, []);

  function handleAuth() {
    if (keyInput === process.env.NEXT_PUBLIC_STUDIO_ACCESS_KEY) {
      document.cookie = "studio_auth=true; path=/";
      setAuthorized(true);
    } else {
      alert("Invalid key");
    }
  }

  async function handlePublish() {
    try {
      const parsed = JSON.parse(json);

      const res = await fetch("/api/studio/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Publish failed");

      setStatus("✅ Published");
    } catch (err) {
      setStatus("❌ " + err.message);
    }
  }

  if (!authorized) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Enter Studio Access Key</h2>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          style={{ padding: 10, marginRight: 10 }}
        />
        <button onClick={handleAuth}>Enter</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>OracleLoom Studio</h1>

      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        placeholder="Paste quiz JSON..."
        style={{ width: "100%", height: 300 }}
      />

      <button onClick={handlePublish}>Save & Publish</button>

      {status && <div style={{ marginTop: 20 }}>{status}</div>}
    </div>
  );
}