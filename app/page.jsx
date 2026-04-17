"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [key, setKey] = useState("");
  const [status, setStatus] = useState("");
  const router = useRouter();

  async function handleLogin() {
    try {
      setStatus("Checking...");

      const res = await fetch("/api/beta/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Invalid key");

      setStatus("Access granted");
      router.push("/studio");
    } catch (err) {
      setStatus("❌ " + err.message);
    }
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>ViralPack Dev Access</h1>

      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="Enter dev key"
        style={{ padding: 10, marginRight: 10 }}
      />

      <button onClick={handleLogin}>Enter</button>

      {status && <div style={{ marginTop: 20 }}>{status}</div>}
    </div>
  );
}