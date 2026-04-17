export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { getQuiz } from "@/lib/quiz_store";
import { buildTwoClipVideoPlan } from "@/lib/video_plan";
function json(status, obj) { return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } }); }
export async function POST(req) { try { const body = await req.json().catch(() => null); const quizId = body?.quiz_id; if (!quizId) return json(400, { ok: false, error: "Missing quiz_id" }); const quiz = await getQuiz(quizId); if (!quiz) return json(404, { ok: false, error: "Quiz not found" }); return json(200, { ok: true, plan: buildTwoClipVideoPlan({ quiz, trendPacket: body?.trend_packet || null }) }); } catch (e) { return json(500, { ok: false, error: String(e?.message || e) }); } }
