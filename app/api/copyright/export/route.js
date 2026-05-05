export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { safeJson, mustEnv, createCopyrightPacket } from "../../../../lib/copyright/shared.js";

async function uploadToDropbox({ accessToken, folderPath, filename, contentBuffer }) {
  const path = `${String(folderPath || "/ViralPack").replace(/\/$/, "")}/${filename}`;
  const r = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path,
        mode: "add",
        autorename: true,
        mute: false,
        strict_conflict: false,
      }),
    },
    body: contentBuffer,
  });

  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error_summary || `Dropbox upload failed (${r.status})`);
  return data;
}

export async function POST(req) {
  try {
    const cookie = req.headers.get("cookie") || "";
    const internalSecret = mustEnv("BETA_COOKIE_SECRET");
    const internalHeader = String(req.headers.get("x-vp-internal") || "").trim();
    const isInternal = internalHeader && internalHeader === internalSecret;

    if (!isInternal && !cookie.includes("vp_beta=")) {
      return safeJson(401, { ok: false, error: "Access denied (missing beta cookie)" });
    }

    const body = await req.json().catch(() => null);
    if (!body) return safeJson(400, { ok: false, error: "Bad JSON body" });

    const packet = await createCopyrightPacket(body);
    const mode = String(body.mode || "local").trim();

    if (mode !== "dropbox") {
      return safeJson(200, {
        ok: true,
        mode: "local",
        filename: packet.filename,
        zip_base64: packet.zipBase64,
        summary: packet.summary,
      });
    }

    const accessToken = String(body.dropbox_access_token || process.env.DROPBOX_ACCESS_TOKEN || "").trim();
    if (!accessToken) {
      return safeJson(400, {
        ok: false,
        error: "Dropbox is not linked yet. Provide a Dropbox access token or wire OAuth before enabling auto-upload.",
      });
    }

    const uploaded = await uploadToDropbox({
      accessToken,
      folderPath: body.dropbox_folder || "/ViralPack",
      filename: packet.filename,
      contentBuffer: packet.zipBuffer,
    });

    return safeJson(200, {
      ok: true,
      mode: "dropbox",
      filename: packet.filename,
      uploaded,
      summary: packet.summary,
    });
  } catch (e) {
    return safeJson(500, { ok: false, error: String(e?.message || e) });
  }
}
