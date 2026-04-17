import { NextResponse } from "next/server";
import {
  fallbackTrendPacket,
  fallbackQuizSpec,
  fallbackAdPlan,
} from "@/lib/quiz_fallbacks";
import { ensureRunDir, writeJson, writeText } from "@/lib/vp_runs";
import { writeOracleLoomPack } from "@/lib/oracleloom_pack";
import { buildTwoClipVideoPlan } from "@/lib/video_plan";

export const dynamic = "force-dynamic";

function getProvidedBetaKey(req) {
  const headerKey = req.headers.get("x-beta-key");
  if (headerKey) return String(headerKey).trim();

  try {
    const url = new URL(req.url);
    const queryKey = url.searchParams.get("key");
    if (queryKey) return String(queryKey).trim();
  } catch {}

  return "";
}

function isAuthorized(req) {
  const expectedKey = String(process.env.BETA_ACCESS_KEY || "").trim();
  if (!expectedKey) {
    throw new Error("Missing env: BETA_ACCESS_KEY");
  }

  const providedKey = getProvidedBetaKey(req);
  return providedKey === expectedKey;
}

function makeRunId() {
  return `VP3_${Date.now()}`;
}

export async function POST(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "Unauthorized. Beta access key required." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const trendPacket = fallbackTrendPacket(body);
    const quiz = fallbackQuizSpec(body, trendPacket);
    const adPlan = fallbackAdPlan(body, trendPacket);
    const videoPlan = buildTwoClipVideoPlan(adPlan);

    const runId = makeRunId();
    const runDir = ensureRunDir(runId);
    const oracleloomPack = writeOracleLoomPack(runDir, quiz);

    writeJson(`${runDir}/trend_packet.json`, trendPacket);
    writeJson(`${runDir}/quiz.json`, quiz);
    writeJson(`${runDir}/ad_plan.json`, adPlan);
    writeJson(`${runDir}/video_plan.json`, videoPlan);

    writeText(
      `${runDir}/summary.txt`,
      [
        `Run ${runId}`,
        `Topic: ${trendPacket.selected_topic || "unknown"}`,
        `OracleLoom pack: ${oracleloomPack.pack_root}`,
        `Drop pack folders into Oracle Loom root, then git push Oracle Loom.`,
      ].join("\n")
    );

    return NextResponse.json({
      success: true,
      ok: true,
      runId,
      quiz,
      adPlan,
      videoPlan,
      oracleloom_pack: oracleloomPack,
    });
  } catch (err) {
    console.error("RUN ERROR:", err);

    return NextResponse.json(
      {
        error:
          err?.message === "Missing env: BETA_ACCESS_KEY"
            ? "Server misconfiguration: missing beta access key"
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "Unauthorized. Beta access key required." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Beta access granted.",
    });
  } catch (err) {
    console.error("RUN GET ERROR:", err);

    return NextResponse.json(
      {
        error:
          err?.message === "Missing env: BETA_ACCESS_KEY"
            ? "Server misconfiguration: missing beta access key"
            : "Internal server error",
      },
      { status: 500 }
    );
  }
}
