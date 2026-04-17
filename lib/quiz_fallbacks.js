// lib/quiz_fallbacks.js

function clean(value, fallback = "") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function slugify(value, fallback = "identity-pattern-reading") {
  const s = clean(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

export function fallbackTrendPacket(input = {}) {
  const topic = clean(
    input.theme || input.trend_hint || input.niche,
    "replaying moments after they already happened"
  );
  const slug = slugify(topic, "replaying-moments-after-they-already-happened");

  return {
    id: `trend_${slug}`,
    created_at: new Date().toISOString(),
    selected_topic: topic,
    angle:
      "Recognition-first self-insight content that mirrors internal dialogue and creates curiosity before explanation.",
    why_now:
      "Short-form self-recognition content keeps performing because it feels personal, fast, and native to social feeds.",
    audience: clean(
      input.audience,
      "Instagram and TikTok users who stop for eerily accurate self-recognition content"
    ),
    topics: [
      "replaying conversations",
      "reading into tone",
      "thinking about what you said hours later",
    ],
    emotional_drivers: [
      "self-recognition",
      "curiosity",
      "quiet discomfort",
      "identity tension",
    ],
    visual_signatures: [
      "rewind fragments",
      "kinetic close framing",
      "memory loops",
      "minimal loaded text",
    ],
  };
}

export function fallbackAdPlan(input = {}, trendPacket = {}) {
  const theme = clean(
    trendPacket?.selected_topic || input?.theme || input?.niche,
    "replaying things after they happen"
  );
  const slug = slugify(theme, "replaying-things-after-they-happen");

  return {
    campaign_slug: slug,
    angle:
      "Internal narrative hook followed by a creative visual embodiment of the same pattern.",
    offer:
      "Take a fast quiz, unlock the pattern behind why your brain does this, and get a personalized reading.",
    assets: {
      video_1_hook: {
        purpose: "recognition",
        title: "still in it after it already happened",
        script:
          "i can leave a conversation and still be in it an hour later... like i'm replaying the same few seconds trying to figure out if i missed something... and i already know i'm doing it while i'm doing it",
        on_screen_text: [
          "i can leave a conversation",
          "and still be in it an hour later",
          "like i missed something",
        ],
        scene_notes: [
          "Keep it intimate and human",
          "Feels like internal dialogue, not performance",
          "Can be text-on-screen, voiceover, or both",
        ],
      },
      video_2_sell: {
        purpose: "visual embodiment",
        concept_title: "rewind loop",
        concept_type: "stylized phone ui",
        visual_premise:
          "A conversation visually rewinds in fragments while typed thoughts appear, delete, and reappear, showing how the mind keeps returning to the same moment.",
        scene_sequence: [
          "Phone screen shows a finished conversation",
          "The screen rewinds to one line",
          "Text appears: wait did that sound weird",
          "Text deletes and reappears slightly changed",
          "Same message gets highlighted again",
          "End on a soft CTA frame",
        ],
        on_screen_text: [
          "it already happened",
          "so why are you still there",
          "i clicked the link and it actually explained it",
        ],
        optional_voiceover:
          "i clicked the link and took the quiz and it actually broke down why my brain does this",
        art_direction:
          "Minimal, clean, slightly eerie phone-screen aesthetic with looped motion and subtle rewind cues",
        motion_notes: [
          "Use repeat loops",
          "Use rewind motion",
          "Avoid default talking-head framing",
          "Keep text minimal",
        ],
        cta_line: "take the reading",
      },
    },
    public_link_hint: `/quiz/${slug}`,
    cta_lines: [
      "take the reading",
      "see the pattern clearly",
      "unlock the full breakdown",
    ],
    captions: [
      "some moments end and your brain just... doesn't",
      "clicked the link and it explained something i didn't have words for",
    ],
    hashtags: [
      "#selfinsight",
      "#innerdialogue",
      "#overthinking",
      "#mindset",
      "#quiz",
    ],
  };
}

export function fallbackQuizSpec(input = {}, trendPacket = {}) {
  const selectedTopic = clean(
    trendPacket?.selected_topic,
    "replaying moments after they already happened"
  );
  const slug = slugify(selectedTopic, "replaying-moments-after-they-already-happened");
  const price = Number.isFinite(Number(input?.result_price))
    ? Number(input.result_price)
    : 1;

  return {
    quiz_id: slug,
    slug,
    title: "Why your brain keeps replaying it",
    category: clean(input?.niche, "self-insight"),
    short_hook:
      "A fast reading on the pattern behind replaying moments long after they end.",
    scoring_mode: "weighted_archetype",
    paywall: {
      teaser:
        "Your result gets specific fast. Unlock the full reading to see what pattern is actually running underneath it.",
      price,
    },
    result_archetypes: [
      {
        id: "signal_mapper",
        label: "The Signal Mapper",
        headline: "You scan for meaning until the moment turns into a map.",
        preview:
          "Your mind keeps revisiting tone, timing, and subtext trying to find the missing signal.",
      },
      {
        id: "micro_optimizer",
        label: "The Micro Optimizer",
        headline: "You keep refining the moment after it already ended.",
        preview:
          "Your brain re-edits what happened, trying to land on the version that would have felt safer or cleaner.",
      },
      {
        id: "future_forecaster",
        label: "The Future Forecaster",
        headline: "Your brain jumps ahead because uncertainty feels louder than the moment itself.",
        preview:
          "You replay the present partly to get ahead of what it could turn into next.",
      },
      {
        id: "control_anchor",
        label: "The Control Anchor",
        headline: "You tighten around moments that briefly made you feel unsteady.",
        preview:
          "The loop is less about the moment and more about restoring a sense of internal order.",
      },
    ],
    questions: [
      {
        id: "q1",
        prompt: "When something sticks with you, what does your brain do first?",
        microcopy: "Pick the one that feels most automatic.",
        options: [
          {
            id: "q1_a",
            label: "Replay the whole thing like I missed a clue",
            subtext: "I scan for hidden meaning",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q1_b",
            label: "Mentally rewrite what I said",
            subtext: "I keep refining the moment",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q1_c",
            label: "Jump ahead to what it might mean later",
            subtext: "My brain starts forecasting",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q1_d",
            label: "Clamp down and get weirdly serious",
            subtext: "I want things to feel stable again",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
      {
        id: "q2",
        prompt: "What part hits hardest after an interaction?",
        microcopy: "",
        options: [
          {
            id: "q2_a",
            label: "Not knowing how it really landed",
            subtext: "",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q2_b",
            label: "Thinking I said too much or not enough",
            subtext: "",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q2_c",
            label: "Imagining what it could become later",
            subtext: "",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q2_d",
            label: "Feeling briefly out of control",
            subtext: "",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
      {
        id: "q3",
        prompt: "What is your mind usually trying to protect in the loop?",
        microcopy: "",
        options: [
          {
            id: "q3_a",
            label: "My read on the situation",
            subtext: "",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q3_b",
            label: "The version of me people just saw",
            subtext: "",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q3_c",
            label: "My future footing",
            subtext: "",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q3_d",
            label: "My internal stability",
            subtext: "",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
      {
        id: "q4",
        prompt: "Which thought loop sounds most familiar?",
        microcopy: "",
        options: [
          {
            id: "q4_a",
            label: "Reading between the lines until there are too many lines",
            subtext: "",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q4_b",
            label: "Editing the moment after it is already over",
            subtext: "",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q4_c",
            label: "Building five possible futures off one moment",
            subtext: "",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q4_d",
            label: "Holding everything tightly so it does not get messier",
            subtext: "",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
      {
        id: "q5",
        prompt: "What happens when you try to let it go?",
        microcopy: "",
        options: [
          {
            id: "q5_a",
            label: "My brain circles back like it left something unfinished",
            subtext: "",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q5_b",
            label: "I start refining the memory instead of releasing it",
            subtext: "",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q5_c",
            label: "I start predicting what happens next",
            subtext: "",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q5_d",
            label: "I get more rigid instead of more relaxed",
            subtext: "",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
      {
        id: "q6",
        prompt: "Which one feels most like you?",
        microcopy: "",
        options: [
          {
            id: "q6_a",
            label: "I pick up on things people do not say",
            subtext: "",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q6_b",
            label: "I keep adjusting things until they feel right",
            subtext: "",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q6_c",
            label: "My brain likes getting ahead of reality",
            subtext: "",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q6_d",
            label: "I feel better when I know where everything stands",
            subtext: "",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
      {
        id: "q7",
        prompt: "After saying something vulnerable, what usually happens next?",
        microcopy: "",
        options: [
          {
            id: "q7_a",
            label: "I analyze the response for hidden meaning",
            subtext: "",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q7_b",
            label: "I mentally rewrite how I said it",
            subtext: "",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q7_c",
            label: "I start guessing what this means later",
            subtext: "",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q7_d",
            label: "I pull back and try to regain composure",
            subtext: "",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
      {
        id: "q8",
        prompt: "What kind of uncertainty gets under your skin fastest?",
        microcopy: "",
        options: [
          {
            id: "q8_a",
            label: "Mixed signals",
            subtext: "",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q8_b",
            label: "Small mistakes I cannot correct",
            subtext: "",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q8_c",
            label: "Open endings",
            subtext: "",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q8_d",
            label: "Not knowing where I stand",
            subtext: "",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
      {
        id: "q9",
        prompt: "What does your mind think it is doing when it loops?",
        microcopy: "",
        options: [
          {
            id: "q9_a",
            label: "Finding the pattern",
            subtext: "",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q9_b",
            label: "Fixing the flaw",
            subtext: "",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q9_c",
            label: "Preventing what is next",
            subtext: "",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q9_d",
            label: "Keeping me together",
            subtext: "",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
      {
        id: "q10",
        prompt: "What would feel like relief right now?",
        microcopy: "",
        options: [
          {
            id: "q10_a",
            label: "Finally understanding the pattern clearly",
            subtext: "",
            archetype_weights: { signal_mapper: 2 },
          },
          {
            id: "q10_b",
            label: "Not having to refine everything so much",
            subtext: "",
            archetype_weights: { micro_optimizer: 2 },
          },
          {
            id: "q10_c",
            label: "Feeling safe without predicting everything",
            subtext: "",
            archetype_weights: { future_forecaster: 2 },
          },
          {
            id: "q10_d",
            label: "Relaxing without bracing first",
            subtext: "",
            archetype_weights: { control_anchor: 2 },
          },
        ],
      },
    ],
  };
}

export function fallbackPremiumCopy(quiz = {}, archetypeLabel = "Primary Archetype", archetypePreview = "") {
  const title = clean(archetypeLabel, "Primary Archetype");
  const preview = clean(
    archetypePreview,
    "There is a pattern here, and it is doing more than you think."
  );
  const quizTitle = clean(quiz?.title, "this pattern");

  return {
    headline: title,
    opening: preview,
    body:
      `You are not just “doing this for no reason.” There is a shape to how your mind handles ${quizTitle.toLowerCase()}, and once that shape becomes visible, it stops feeling so random. ` +
      `What looks like overthinking on the surface is often your mind trying to protect something more tender underneath, like steadiness, clarity, control, or the chance to not get caught off guard. ` +
      `The loop is not the whole story. The loop is the method your mind learned. The deeper question is what it thinks it is saving you from. ` +
      `Once you can name that clearly, the pattern softens. You stop treating every repeated thought like an emergency and start recognizing it as information instead. ` +
      `That shift is where relief begins.`,
  };
}

export default {
  fallbackTrendPacket,
  fallbackAdPlan,
  fallbackQuizSpec,
  fallbackPremiumCopy,
};