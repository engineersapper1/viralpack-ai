export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "fs";
import path from "path";
import { buildCopyrightPack } from "lib/copyright_pack";
import { ensureDir, ensureRunDir, writeJson } from "lib/vp_runs";

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readBody(req) {
  const body = await req.json().catch(() => null);
  if (!body) throw new Error("Bad JSON body");
  return body;
}

export async function POST(req) {
  try {
    const body = await readBody(req);
    const exportJson = body?.export_json;
    if (!exportJson || typeof exportJson !== "object") {
      return json(400, { ok: false, error: "Missing export_json object" });
    }

    const runId = `WEB_${Date.now()}`;
    const runDir = ensureRunDir(runId, "copyright_pack");
    ensureDir(runDir);
    const sourceRoot = body?.source_root ? path.resolve(String(body.source_root)) : process.cwd();
    writeJson(path.join(runDir, "request_payload.json"), body);

    const result = await buildCopyrightPack({
      exportJson,
      sourceRoot,
      outputRoot: runDir,
      defaults: {
        client_name: body?.client_name,
        rights_owner: body?.rights_owner,
        author: body?.author,
        work_for_hire: body?.work_for_hire,
        location_text: body?.location_text,
        city: body?.city,
        state: body?.state,
        country: body?.country,
      },
      cloud: {
        provider: body?.cloud_provider || "none",
        remote_root: body?.cloud_remote_root || "copyright-packs",
      },
    });

    return json(200, {
      ok: true,
      ...result,
      download: `/api/copyright-pack/download?run_id=${encodeURIComponent(result.run_id)}`,
      guide_download: `/api/copyright-pack/download?run_id=${encodeURIComponent(result.run_id)}&kind=guide`,
      worksheet_download: `/api/copyright-pack/download?run_id=${encodeURIComponent(result.run_id)}&kind=worksheet`,
      report_download: `/api/copyright-pack/download?run_id=${encodeURIComponent(result.run_id)}&kind=report`,
    });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
}
