export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "fs";
import path from "path";

import { getRunsRoot, mustEnv } from "../../../../../lib/vp_runs.js";

export async function GET(req, { params }) {
  try {
    const cookie = req.headers.get("cookie") || "";
    if (!cookie.includes("vp_beta=")) {
      return new Response("Access denied", { status: 401 });
    }

    // keep env gate consistent with other routes
    mustEnv("BETA_COOKIE_SECRET");

    const runId = String(params?.run_id || "").trim();
    if (!runId) return new Response("Missing run_id", { status: 400 });

    const p = path.join(getRunsRoot(), runId, "assembly", "final.mp4");
    if (!fs.existsSync(p)) return new Response("Not found", { status: 404 });

    const buf = fs.readFileSync(p);
    return new Response(buf, {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(e?.message || String(e), { status: 500 });
  }
}
