import { callOpenAIJson, callXaiJson } from "@/lib/ai";
import { buildTrendPrompt, buildQuizPrompt } from "@/lib/campaign_prompt_contract";
import { fallbackTrendPacket, fallbackQuizSpec } from "@/lib/quiz_fallbacks";
import { writeOracleLoomPack } from "@/lib/oracleloom_pack";
import { saveQuiz, saveTrendPacket } from "@/lib/quiz_store";
import { ensureRunDir, writeJson, writeText } from "@/lib/vp_runs";

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status: init.status || 200,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function cleanString(value, fallback = "") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function normalizeTrendPacket(rawTrend, input) {
  const fallback = fallbackTrendPacket(input);
  const trend = rawTrend && typeof rawTrend === "object" ? rawTrend : {};

  return {
    ...fallback,
    ...trend,
    id: cleanString(trend.id, fallback.id),
    angle: cleanString(trend.angle, fallback.angle),
    selected_topic: cleanString(trend.selected_topic, fallback.selected_topic),
    why_now: cleanString(trend.why_now, fallback.why_now),
    audience: cleanString(trend.audience, fallback.audience),
    topics:
      Array.isArray(trend.topics) && trend.topics.length
        ? trend.topics.map((t) => cleanString(t)).filter(Boolean)
        : fallback.topics,
    emotional_drivers:
      Array.isArray(trend.emotional_drivers) && trend.emotional_drivers.length
        ? trend.emotional_drivers.map((t) => cleanString(t)).filter(Boolean)
        : Array.isArray(fallback.emotional_drivers)
        ? fallback.emotional_drivers
        : [],
    visual_signatures:
      Array.isArray(trend.visual_signatures) && trend.visual_signatures.length
        ? trend.visual_signatures.map((t) => cleanString(t)).filter(Boolean)
        : Array.isArray(fallback.visual_signatures)
        ? fallback.visual_signatures
        : [],
    created_at: cleanString(trend.created_at, new Date().toISOString()),
  };
}

function normalizeQuizSpec(rawQuiz, input, trendPacket) {
  const fallback = fallbackQuizSpec(input, trendPacket);
  const quiz = rawQuiz && typeof rawQuiz === "object" ? rawQuiz : {};
  const normalized = { ...fallback, ...quiz };

  normalized.quiz_id = cleanString(normalized.quiz_id, "");
  normalized.title = cleanString(normalized.title, fallback.title);
  normalized.category = cleanString(normalized.category, fallback.category);
  normalized.short_hook = cleanString(normalized.short_hook, fallback.short_hook);
  normalized.paywall = { ...fallback.paywall, ...(normalized.paywall || {}) };
  normalized.paywall.teaser = cleanString(normalized.paywall.teaser, fallback.paywall.teaser);

  const parsedPrice = Number(normalized.paywall.price ?? input.result_price ?? fallback.paywall.price);
  normalized.paywall.price = Number.isFinite(parsedPrice) ? parsedPrice : fallback.paywall.price;

  normalized.cross_sell = Array.isArray(normalized.cross_sell) && normalized.cross_sell.length
    ? normalized.cross_sell.map((item) => cleanString(item)).filter(Boolean)
    : fallback.cross_sell;

  normalized.result_archetypes =
    Array.isArray(normalized.result_archetypes) && normalized.result_archetypes.length
      ? normalized.result_archetypes.map((item, index) => ({
          id: cleanString(item?.id, `archetype_${index + 1}`),
          label: cleanString(item?.label, `Archetype ${index + 1}`),
          headline: cleanString(item?.headline, `Archetype ${index + 1}`),
          preview: cleanString(item?.preview, ""),
          premium: item?.premium && typeof item.premium === "object" ? item.premium : null,
        }))
      : fallback.result_archetypes;

  const fallbackQuestions = fallback.questions || [];
  normalized.questions =
    Array.isArray(normalized.questions) && normalized.questions.length
      ? normalized.questions.map((q, qIndex) => ({
          id: cleanString(q?.id, `q${qIndex + 1}`),
          prompt: cleanString(q?.prompt, fallbackQuestions[qIndex]?.prompt || `Question ${qIndex + 1}`),
          microcopy: cleanString(q?.microcopy, fallbackQuestions[qIndex]?.microcopy || ""),
          options:
            Array.isArray(q?.options) && q.options.length
              ? q.options.slice(0, 4).map((opt, oIndex) => ({
                  id: cleanString(opt?.id, `q${qIndex + 1}_${String.fromCharCode(97 + oIndex)}`),
                  label: cleanString(opt?.label || opt?.text, `Option ${oIndex + 1}`),
                  text: cleanString(opt?.text || opt?.label, `Option ${oIndex + 1}`),
                  subtext: cleanString(opt?.subtext, ""),
                  archetype_weights:
                    opt?.archetype_weights && typeof opt.archetype_weights === "object"
                      ? opt.archetype_weights
                      : {},
                }))
              : fallbackQuestions[qIndex]?.options || [],
        }))
      : fallbackQuestions;

  normalized.premium_prompt_template = {
    ...fallback.premium_prompt_template,
    ...(normalized.premium_prompt_template || {}),
    system: cleanString(normalized.premium_prompt_template?.system, fallback.premium_prompt_template.system),
    user_template: cleanString(normalized.premium_prompt_template?.user_template, fallback.premium_prompt_template.user_template),
  };

  return normalized;
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const input = {
      brand_name: cleanString(body?.brand_name, "MindMirror"),
      niche: cleanString(body?.niche, "short-form identity readings"),
      audience: cleanString(body?.audience, "Instagram and TikTok users who stop for painfully relatable internal-dialogue content"),
      monetization: cleanString(body?.monetization, "Sell a $1 premium reading after the quiz is complete"),
      result_price: cleanString(body?.result_price, "1"),
      trend_hint: cleanString(body?.trend_hint, "Focus on lived patterns like replaying moments, reading into tone, needing control before relaxing, and feeling the room before anyone speaks"),
    };

    const rawTrendPacket = await callXaiJson(buildTrendPrompt(input), () => fallbackTrendPacket(input));
    const trendPacket = await saveTrendPacket(normalizeTrendPacket(rawTrendPacket, input));

    const rawQuizSpec = await callOpenAIJson(buildQuizPrompt(input, trendPacket), () => fallbackQuizSpec(input, trendPacket));
    const quiz = await saveQuiz(normalizeQuizSpec(rawQuizSpec, input, trendPacket));

    const runId = `quizonly_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const runDir = ensureRunDir(runId);
    const oracleloomPack = writeOracleLoomPack(runDir, quiz);

    writeJson(`${runDir}/input.json`, input);
    writeJson(`${runDir}/trend_packet.json`, trendPacket);
    writeJson(`${runDir}/quiz.json`, quiz);
    writeText(`${runDir}/README.txt`, [
      `run_id=${runId}`,
      `mode=quiz_only`,
      `quiz_id=${quiz.quiz_id}`,
      `quiz_url=/quiz/${quiz.quiz_id}`,
      `oracleloom_pack_dir=${oracleloomPack.pack_root}`,
      `notes=drag oracleloom_pack/content and oracleloom_pack/public into the Oracle Loom root, then commit and push`,
    ].join("\n"));

    return json({
      ok: true,
      mode: "quiz_only",
      run_id: runId,
      quiz,
      quiz_url: `/quiz/${quiz.quiz_id}`,
      trend_packet: trendPacket,
      oracleloom_pack: oracleloomPack,
    });
  } catch (error) {
    return json({ ok: false, error: error?.message || "Quiz-only build failed" }, { status: 500 });
  }
}
