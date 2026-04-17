"use client";

import { useState } from "react";

export default function ShareActions({ title, text }) {
  const [status, setStatus] = useState("");

  const pageUrl = typeof window !== "undefined" ? window.location.href : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(pageUrl);
      setStatus("Link copied.");
    } catch {
      setStatus("Could not copy link.");
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      setStatus("Native share is not available on this device.");
      return;
    }

    try {
      await navigator.share({ title, text, url: pageUrl });
      setStatus("Shared.");
    } catch {
      setStatus("");
    }
  }

  return (
    <div className="sharePanel">
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn secondary" onClick={copyLink}>Copy result link</button>
        <button className="btn ghost" onClick={nativeShare}>Share</button>
      </div>
      {status ? <p className="muted" style={{ marginTop: 10 }}>{status}</p> : null}
    </div>
  );
}
