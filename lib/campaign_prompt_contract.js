// lib/campaign_prompt_contract.js

function clean(v, fallback = "") {
  const s = String(v ?? "").trim();
  return s || fallback;
}

function safeJSON(obj, fallback = "{}") {
  try {
    return JSON.stringify(obj ?? JSON.parse(fallback), null, 2);
  } catch {
    return fallback;
  }
}

/* =========================
   1. TREND PROMPT
========================= */
export function buildTrendPrompt(input = {}) {
  return `
You are a short-form trend strategist.

Select ONE high-performing viral angle for a quiz funnel.

Context:
- Niche: ${clean(input.niche, "self-discovery")}
- Audience: ${clean(input.audience, "short-form users")}
- Platform: ${clean(input.platform, "TikTok, Reels")}
- Goal: sell quiz result unlock

Return JSON:

{
  "id": "slug",
  "selected_topic": "topic",
  "angle": "one-line hook",
  "why_now": "why it works now",
  "audience": "who it hits",
  "topics": ["t1","t2"],
  "emotional_drivers": ["curiosity","self-recognition"],
  "visual_signatures": ["fast cuts","pattern switching"],
  "created_at": "ISO"
}

Rules:
- Must feel native to short-form
- Avoid clinical language
- Favor identity tension and curiosity
- Output JSON only
`;
}

/* =========================
   2. QUIZ PROMPT
========================= */
export function buildQuizPrompt(input = {}, trendPacket = {}) {
  return `
You are a viral quiz builder.

Trend:
${safeJSON(trendPacket)}

Return JSON:

{
  "quiz_id": "slug",
  "title": "title",
  "category": "category",
  "short_hook": "hook",
  "paywall": {
    "teaser": "tease",
    "price": ${clean(input.result_price, 7.99)}
  },
  "result_archetypes": [
    {
      "id": "a1",
      "label": "label",
      "headline": "headline",
      "preview": "preview"
    }
  ],
  "questions": [
    {
      "id": "q1",
      "prompt": "question",
      "options": [
        {
          "id": "o1",
          "label": "option",
          "archetype_weights": {"a1": 2}
        }
      ]
    }
  ]
}

Rules:
- Make it addictive
- Fast mobile-friendly questions
- Emotional recognition > logic
- Output JSON only
`;
}

/* =========================
   3. CAMPAIGN / PROMPT COMPILER
========================= */
export function buildCampaignPrompt({ quiz, trendPacket }) {
  return `
You are a cinematic short-form creative director and shot choreographer.

Your job:
Convert this quiz into a 2-clip viral video plan with a DENSE choreography layer.

QUIZ:
${safeJSON(quiz)}

TREND:
${safeJSON(trendPacket)}

OUTPUT JSON:

{
  "campaign_angle": "hook",
  "creative_thesis": "psychological driver",
  "visual_style": "visual identity",
  "motion_language": "movement style",
  "negative_prompt": "what to avoid",
  "cta_hint": "curiosity CTA",
  "character_lock": {
    "role": "who we are following",
    "age_range": "broad casting age",
    "presentation": "believable modern social-native look",
    "wardrobe": "consistent wardrobe direction",
    "casting_notes": ["note 1", "note 2"]
  },
  "world_lock": {
    "location": "single primary setting",
    "time_of_day": "time",
    "lighting": "lighting direction",
    "texture": "surface/feel",
    "props": ["prop 1", "prop 2"]
  },
  "visual_symbols": ["symbol 1", "symbol 2"],
  "continuity_rules": ["rule 1", "rule 2"],
  "overlays": ["short overlay 1", "short overlay 2", "short overlay 3"],
  "clips": [
    {
      "clip_index": 0,
      "seconds": 12,
      "purpose": "pattern_interrupt",
      "beat": "one-line beat",
      "scene_anchor": "where clip lives",
      "subject_anchor": "who/what stays constant",
      "emotion_arc": "emotion movement across clip",
      "motion_arc": "physical motion progression",
      "camera_plan": "camera grammar",
      "editing_rhythm": "cutting rhythm",
      "visual_intent": "what viewer feels",
      "continuity_note": "how it hands off",
      "must_keep": ["thing 1", "thing 2"],
      "avoid": ["thing 1", "thing 2"],
      "beat_outline": [
        "0.0-1.5s, exact visual event",
        "1.5-4.0s, next escalation",
        "4.0-8.0s, next escalation",
        "8.0-12.0s, handoff into clip 2"
      ],
      "script": "visual-only choreography paragraph",
      "video_prompt_seed": "dense prompt seed, not the final compiled prompt"
    },
    {
      "clip_index": 1,
      "seconds": 12,
      "purpose": "interactive_payoff",
      "beat": "one-line beat",
      "scene_anchor": "same world continued",
      "subject_anchor": "same subject continuity",
      "emotion_arc": "emotion movement",
      "motion_arc": "physical progression",
      "camera_plan": "camera grammar",
      "editing_rhythm": "cutting rhythm",
      "visual_intent": "what viewer feels",
      "continuity_note": "how it resolves without hard sell",
      "must_keep": ["thing 1", "thing 2"],
      "avoid": ["thing 1", "thing 2"],
      "beat_outline": [
        "0.0-2.0s, continue with no reset",
        "2.0-5.0s, escalation",
        "5.0-9.0s, progression/payoff",
        "9.0-12.0s, curiosity CTA"
      ],
      "script": "visual-only choreography paragraph",
      "video_prompt_seed": "dense prompt seed, not the final compiled prompt"
    }
  ]
}

STRICT RULES:

GLOBAL:
- NO talking head
- NO person explaining
- NO static shots
- ALWAYS motion
- ALWAYS visual-first storytelling

CLIP 1:
- Pattern interrupt
- Fast, abstract, curiosity spike
- Viewer should not fully understand yet

CLIP 2:
- Continuation, not reset
- Show interaction / progression
- Feels like viewer is inside the experience

VIDEO PROMPT RULES:
- Describe visuals, motion, camera
- No dialogue
- No narration
- No “person talking”
- Must feel like TikTok-native content

REQUIRED:
- Treat character_lock and world_lock as stable anchors across both clips
- beat_outline must describe what PHYSICALLY happens over time
- must_keep should preserve continuity
- avoid should be specific to the clip, not generic fluff
- video_prompt_seed must be vivid and cinematic, but still shorter than a final compiled prompt

NEGATIVE PROMPT MUST INCLUDE:
- talking to camera
- static shot
- explainer video

Output JSON only.
`;
}

/* =========================
   BACKWARD COMPATIBILITY
========================= */
export const buildAdPrompt = buildCampaignPrompt;

export default {
  buildTrendPrompt,
  buildQuizPrompt,
  buildCampaignPrompt,
  buildAdPrompt,
};
