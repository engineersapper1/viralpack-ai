export const runtime = "nodejs";
import { getUserIdFromReq } from "../../../../lib/user_identity.js";
import { listVideos, quotaStatus } from "../../../../lib/video_repo.js";

export async function GET(req) {
  try {
    const userId = getUserIdFromReq(req, {});
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") || 50);
    return Response.json({ ok: true, user_id: userId, videos: listVideos(userId, limit), quota: quotaStatus(userId) });
  } catch (e) {
    return Response.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
