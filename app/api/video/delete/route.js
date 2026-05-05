export const runtime = "nodejs";
import { getUserIdFromReq } from "../../../../lib/user_identity.js";
import { deleteVideo } from "../../../../lib/video_repo.js";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const userId = getUserIdFromReq(req, body);
    const id = String(body?.id || "").trim();
    if (!id) return Response.json({ ok: false, error: "Missing id" }, { status: 400 });
    const out = deleteVideo(userId, id);
    return Response.json(out, { status: out.ok ? 200 : 404 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
