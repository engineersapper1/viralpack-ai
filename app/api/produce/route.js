import fs from "fs";
import path from "path";
import {
  callOpenAIJson,
  callXaiJson,
  createOpenAIVideoJob,
  waitForOpenAIVideo,
  downloadOpenAIVideoBuffer,
} from "@/lib/ai";
import { ensureRunDir, writeJson, writeText } from "@/lib/vp_runs";

function json(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status: init.status || 200,
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
  });
}

function clampStr(value, len = 180, fallback = "") {
  const s = String(value ?? "").trim() || fallback;
  return s.slice(0, len);
}

function slugify(value, fallback = "quiz-pack") {
  const s = String(value || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return s || fallback;
}

function ensureAuth(req) {
  const cookie = req.headers.get("cookie") || "";
  if (!cookie.includes("vp_beta=1")) {
    throw new Error("Unauthorized");
  }
}

function themeFallback(input) {
  const topic = clampStr(input.quiz_theme, 120, "Hidden relationship pattern");
  const slug = slugify(input.title_title || topic, "hidden-relationship-pattern");
  const labels = ["Signal Reader", "Gravity Keeper", "Mirror Chaser", "Storm Translator", "Quiet Strategist", "Attachment Hacker"];
  const archetypeCount = Math.max(3, Math.min(6, Number(input.archetype_count || 4)));
  const qCount = Math.max(5, Math.min(10, Number(input.question_count || 7)));
  const archetypes = Array.from({ length: archetypeCount }).map((_, i) => ({
    id: `type_${i + 1}`,
    label: labels[i % labels.length],
    headline: `${labels[i % labels.length]}, with the mask off`,
    preview: `You have a consistent pattern around ${topic.toLowerCase()}, and it shows up faster than you probably admit out loud.`,
  }));
  const questions = Array.from({ length: qCount }).map((_, qi) => ({
    id: `q${qi + 1}`,
    prompt: [
      `What happens first when ${topic.toLowerCase()} gets triggered?`,
      `Which kind of tension keeps replaying in your head later?`,
      `What kind of behavior makes you read between the lines instantly?`,
      `Which version of chaos weirdly sharpens you?`,
      `What drains you fastest in close relationships?`,
      `What do you wish people understood without making you say it?`,
      `When you feel the tone shift, what do you do next?`,
      `What kind of closeness feels safest to you?`,
    ][qi % 8],
    options: archetypes.slice(0, 4).map((a, oi) => ({
      id: `q${qi + 1}_${String.fromCharCode(97 + oi)}`,
      label: [
        "I read the room before anyone names it.",
        "I lock onto details and try to decode the pattern.",
        "I go quiet and pull inward before I react.",
        "I test the energy before I trust what I’m seeing.",
      ][oi],
      archetype_weights: { [a.id]: 3, [archetypes[(oi + 1) % archetypes.length].id]: 1 },
    })),
  }));

  const quiz = {
    quiz_id: slug,
    public_slug: slug,
    title_title: clampStr(input.title_title, 120, "What Pattern Runs Your Love Life?"),
    title: clampStr(input.title_title, 120, "What Pattern Runs Your Love Life?"),
    short_hook: `Fast, sharp, and a little invasive. ${topic} tends to reveal itself quickly.`,
    paywall: {
      price: Number(input.price_usd || 1),
      teaser: "Unlock the full reading to see your core driver, blind spot, relationship pattern, and what shifts your dynamic fastest.",
    },
    result_archetypes: archetypes,
    questions,
    premium_prompt_template: {
      system: "You write premium psychology-style quiz readings that feel intimate, sharp, grounded, and worth paying for.",
      user_template: "Use the dominant archetype, score spread, and the user’s answer pattern to write a premium reading with these sections: Core driver, Blind spot, Relationship pattern, Power zone, Reset advice, and Power phrase.",
    },
    pack: {
      theme: topic,
      audience_vibe: input.audience_vibe,
      tone: input.tone,
    },
  };

  const manifest = {
    pack_id: slug,
    slug,
    title_title: quiz.title_title,
    tile_title: quiz.title_title,
    tile_image: "tile-image.svg",
    promo_video: fs.existsSync ? "promo-video.mp4" : null,
    promo_video_prompt: "promo-video.prompt.txt",
    quiz_file: "quiz.json",
    price_usd: Number(input.price_usd || 1),
    is_published: true,
  };

  const tilePrompt = `Create a stylized tile image for a premium social quiz titled "${quiz.title_title}". Theme: ${topic}. Audience vibe: ${input.audience_vibe}. Tone: ${input.tone}. Visual should feel current, glossy, moody, cinematic, and highly clickable.`;
  const videoPrompt = `Create a short promo video for a premium self-discovery quiz titled "${quiz.title_title}". Theme: ${topic}. Show motion, tension, curiosity, and quick emotional recognition. No talking head, no explainer, no narration. End with a feeling of unresolved curiosity.`;

  return { trend_packet: { selected_topic: topic, angle: `Trend-leaning quiz about ${topic.toLowerCase()}`, created_at: new Date().toISOString() }, quiz, manifest, tilePrompt, videoPrompt };
}

function trendPrompt(input) {
  return `You are Grok-style trend scout.
Return one JSON object with keys: selected_topic, angle, why_now, audience, emotional_drivers, visual_signatures.
Goal: create a current short-form quiz concept.
Theme seed: ${input.quiz_theme}
Audience vibe: ${input.audience_vibe}
Tone: ${input.tone}
Trend hint: ${input.trend_hint}`;
}

function quizPrompt(input, trend) {
  return `You are building a premium OracleLoom quiz pack.
Return JSON only.
Include keys: quiz_id, public_slug, title_title, title, short_hook, paywall, result_archetypes, questions, premium_prompt_template.
Constraints:
- Theme: ${input.quiz_theme}
- Audience vibe: ${input.audience_vibe}
- Tone: ${input.tone}
- Price: ${input.price_usd}
- Question count target: ${input.question_count}
- Archetype count target: ${input.archetype_count}
- Trend packet: ${JSON.stringify(trend)}
Rules:
- title_title must be a short sweet hook for a tile
- title can match title_title or expand it slightly
- questions must be mobile-native, emotionally revealing, and fast
- every option must include archetype_weights
- premium_prompt_template must help produce a paid custom reading
- output valid JSON only`;
}

function svgTile(title, subtitle) {
  const esc = (s) => String(s || "").replace(/[&<>]/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0b1020"/>
      <stop offset="0.55" stop-color="#3d1a78"/>
      <stop offset="1" stop-color="#dd2e7b"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" rx="32" fill="url(#g)"/>
  <circle cx="910" cy="170" r="190" fill="rgba(255,255,255,0.08)"/>
  <circle cx="1000" cy="470" r="220" fill="rgba(255,255,255,0.05)"/>
  <text x="78" y="140" fill="#F3EFFF" font-size="26" font-family="Arial, Helvetica, sans-serif" opacity="0.9">ORACLELOOM QUIZ</text>
  <text x="78" y="280" fill="white" font-size="76" font-weight="700" font-family="Arial, Helvetica, sans-serif">${esc(title)}</text>
  <text x="78" y="360" fill="#F8D4E8" font-size="30" font-family="Arial, Helvetica, sans-serif">${esc(subtitle)}</text>
  <rect x="78" y="420" width="260" height="64" rx="32" fill="rgba(255,255,255,0.16)"/>
  <text x="118" y="462" fill="white" font-size="28" font-family="Arial, Helvetica, sans-serif">Take the quiz</text>
</svg>`;
}

function writeBuffer(filePath, buffer) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
}

export async function POST(req) {
  try {
    ensureAuth(req);
    const body = await req.json().catch(() => ({}));
    const input = {
      quiz_theme: clampStr(body?.quiz_theme, 160, "Hidden relationship pattern"),
      audience_vibe: clampStr(body?.audience_vibe, 180, "women 18-34, sharp, self-aware, slightly dark, highly shareable"),
      tone: clampStr(body?.tone, 180, "intimate, cinematic, a little invasive, premium, not cheesy"),
      trend_hint: clampStr(body?.trend_hint, 220, "current short-form self-discovery energy"),
      title_title: clampStr(body?.title_title, 120, "What Pattern Runs Your Love Life?"),
      question_count: Math.max(5, Math.min(10, Number(body?.question_count || 7))),
      archetype_count: Math.max(3, Math.min(6, Number(body?.archetype_count || 4))),
      price_usd: Number(body?.price_usd || 1),
    };

    const fallback = themeFallback(input);
    const trendPacket = await callXaiJson(trendPrompt(input), () => fallback.trend_packet);
    const quizRaw = await callOpenAIJson(quizPrompt(input, trendPacket), () => fallback.quiz);
    const quiz = {
      ...fallback.quiz,
      ...(quizRaw || {}),
      title_title: clampStr(quizRaw?.title_title, 120, fallback.quiz.title_title),
      title: clampStr(quizRaw?.title, 160, fallback.quiz.title),
      quiz_id: slugify(quizRaw?.quiz_id || quizRaw?.public_slug || fallback.quiz.quiz_id, fallback.quiz.quiz_id),
      public_slug: slugify(quizRaw?.public_slug || quizRaw?.quiz_id || fallback.quiz.public_slug, fallback.quiz.public_slug),
    };
    const manifest = { ...fallback.manifest, pack_id: quiz.public_slug, slug: quiz.public_slug, title_title: quiz.title_title, tile_title: quiz.title_title, price_usd: input.price_usd };

    const runId = `quizpack_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const runDir = ensureRunDir(runId);
    const packDir = path.join(runDir, quiz.public_slug);
    fs.mkdirSync(packDir, { recursive: true });

    const tilePrompt = fallback.tilePrompt;
    const videoPrompt = fallback.videoPrompt;
    const promoScript = `Title: ${quiz.title_title}\nHook: ${quiz.short_hook}\nBeat 1: show the emotional pattern before naming it.\nBeat 2: increase curiosity with close details and contrast.\nBeat 3: end on tension, not explanation.\nCTA: take the quiz.`;

    writeJson(path.join(runDir, "input.json"), input);
    writeJson(path.join(runDir, "trend_packet.json"), trendPacket);
    writeJson(path.join(packDir, "manifest.json"), manifest);
    writeJson(path.join(packDir, "quiz.json"), quiz);
    writeText(path.join(packDir, "promo-video.prompt.txt"), videoPrompt);
    writeText(path.join(packDir, "promo-script.txt"), promoScript);
    writeText(path.join(packDir, "tile-image.prompt.txt"), tilePrompt);
    writeText(path.join(packDir, "tile-image.svg"), svgTile(quiz.title_title, quiz.short_hook));

    let files = ["manifest.json", "quiz.json", "tile-image.svg", "tile-image.prompt.txt", "promo-video.prompt.txt", "promo-script.txt"];

    try {
      if (process.env.OPENAI_API_KEY) {
        const job = await createOpenAIVideoJob({ prompt: videoPrompt, seconds: "4", size: "720x1280" });
        const done = await waitForOpenAIVideo(job.id, { pollMs: 4000, timeoutMs: 180000 });
        const buffer = await downloadOpenAIVideoBuffer(done.id || job.id);
        writeBuffer(path.join(packDir, "promo-video.mp4"), buffer);
        files.push("promo-video.mp4");
      }
    } catch (videoError) {
      writeText(path.join(packDir, "video-error.txt"), String(videoError?.message || videoError));
      files.push("video-error.txt");
    }

    return json({
      ok: true,
      run_id: runId,
      pack_slug: quiz.public_slug,
      pack_dir: packDir,
      quiz,
      manifest,
      trend_packet: trendPacket,
      files,
    });
  } catch (error) {
    const status = String(error?.message || "").includes("Unauthorized") ? 401 : 500;
    return json({ ok: false, error: error?.message || "Pack generation failed" }, { status });
  }
}
