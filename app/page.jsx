"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function handleLogin(e) {
    e?.preventDefault?.();
    setStatus("Checking access...");

    try {
      const res = await fetch("/api/beta/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Invalid access key");

      setStatus("Access granted. Opening Quiz Forge...");
      router.push("/generator");
      router.refresh();
    } catch (err) {
      setStatus(`❌ ${err?.message || "Invalid access key"}`);
    }
  }

  return (
    <main className="container">
      <section className="hero">
        <div className="card" style={{ maxWidth: 760, margin: "60px auto" }}>
          <p className="kicker">ViralPack private console</p>
          <h1 className="h1">Quiz Forge Access</h1>
          <p className="sub">
            Enter the dev key once. After that, the generator opens directly. No second wall inside the forge.
          </p>

          <form onSubmit={handleLogin} style={{ marginTop: 22 }}>
            <div className="row" style={{ alignItems: "stretch" }}>
              <input
                className="input"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Enter dev key"
                autoComplete="current-password"
                style={{ flex: 1, minWidth: 260 }}
              />
              <button className="btn" type="submit">Enter Forge</button>
            </div>
          </form>

          {status ? <p className="muted" style={{ marginTop: 14 }}>{status}</p> : null}
        </div>
      </section>
    </main>
  );
}
