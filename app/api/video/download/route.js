export const runtime = "nodejs";
import fs from "fs";
import path from "path";
import { getUserIdFromReq } from "../../../../lib/user_identity.js";
import { getVideo } from "../../../../lib/video_repo.js";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("id") || "").trim();
    const userId = getUserIdFromReq(req, {});
    const v = getVideo(userId, id);
    if (!v || !fs.existsSync(v.path)) return new Response("Not found", { status: 404 });
    const stat = fs.statSync(v.path);
    return new Response(fs.readFileSync(v.path), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${path.basename(v.path)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(String(e?.message || e), { status: 500 });
  }
}
