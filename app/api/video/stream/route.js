export const runtime = "nodejs";
import fs from "fs";
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
    const range = req.headers.get("range");
    if (range) {
      const m = range.match(/bytes=(\d+)-(\d*)/);
      const start = m ? Number(m[1]) : 0;
      const end = m && m[2] ? Number(m[2]) : stat.size - 1;
      const chunk = fs.readFileSync(v.path).subarray(start, end + 1);
      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Content-Length": String(chunk.length),
          "Cache-Control": "no-store",
        },
      });
    }
    return new Response(fs.readFileSync(v.path), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(stat.size),
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(String(e?.message || e), { status: 500 });
  }
}
