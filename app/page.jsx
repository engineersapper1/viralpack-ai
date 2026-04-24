"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function handleLogin(e) {
    e?.preventDefault?.();
    setStatus("Checking...");
    try {
      const res = await fetch("/api/beta/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.error || "Invalid key");
      router.push("/generator");
    } catch (error) {
      setStatus(`❌ ${error?.message || "Login failed"}`);
    }
  }

  return (
    <main className="shell">
      <section className="hero heroHome">
        <div className="kicker">ViralPack, quiz pack forge</div>
        <h1>Build trend-aware quiz packs for OracleLoom.</h1>
        <p>
          One front-door login, no second auth wall, and one export pack per run. Generate the tile title,
          quiz payload, tile art, promo-video prompt, and pack manifest in one place.
        </p>
        <form className="row" style={{ marginTop: 18 }} onSubmit={handleLogin}>
          <input
            className="field"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Enter dev key"
            style={{ minWidth: 260 }}
          />
          <button className="btn" type="submit">Enter generator</button>
        </form>
        {status ? <p style={{ marginTop: 12 }}>{status}</p> : null}
      </section>
    </main>
  );
}
