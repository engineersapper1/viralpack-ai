function clean(value, fallback = "") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function asArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function normalizeList(value, fallback = []) {
  return asArray(value, fallback).map((item) => clean(item)).filter(Boolean);
}

export function buildTwoClipVideoPlan({ quiz, trendPacket, adPlan }) {
  const chosenAdPlan = adPlan && typeof adPlan === "object" ? adPlan : null;
  const selectedTopic = clean(trendPacket?.selected_topic, quiz?.title || "identity quiz");
  const quizId = clean(quiz?.quiz_id, "demo");
  const ctaUrl = `/quiz/${quizId}`;

  const defaultClips = [
    {
      clip_index: 0,
      seconds: 12,
      beat: "visual pattern hook",
      purpose: "pattern_interrupt",
      scene_anchor: "dim intimate modern interior right after a small social interaction",
      subject_anchor: "same socially native young adult across both clips",
      emotion_arc: "uneasy recognition turns into escalating curiosity",
      motion_arc: "fractured loop becomes tighter and more kinetic",
      camera_plan: "push-ins, snap reframes, detail inserts, slight handheld drift",
      editing_rhythm: "fast early punctuation, then compressed escalations",
      visual_mode: "symbolic_ui_loop",
      motion_motif: "rewind and repeated fragments",
      visual_intent: "make the viewer feel privately seen before they know why",
      continuity_note: "leave the emotional question open so clip 2 can continue without reset",
      must_keep: [
        "same person",
        "same wardrobe family",
        "same location and light logic",
        "same emotional universe",
      ],
      avoid: ["talking to camera", "lecturing", "dead static composition"],
      beat_outline: [
        "0.0-1.5s, start inside motion with a fragment that feels mid-loop instead of beginning cleanly",
        "1.5-4.0s, repeat one tiny action from a new angle and let tension quietly build",
        "4.0-8.0s, add denser visual cues, phone glow, glance shift, object detail, compressed push-ins",
        "8.0-12.0s, end unresolved with momentum that clearly hands off into clip 2",
      ],
      scene_beats: [
        "Finished interaction is shown after the fact",
        "One fragment rewinds and repeats",
        "Sparse text suggests the viewer is still mentally inside the moment",
      ],
      script:
        "Lead with the more visually magnetic pattern loop. Use fragments, rewinds, symbolic repetition, and curiosity without direct explanation.",
      video_prompt_seed:
        "Begin in motion, not with an introduction. Build a tactile memory loop from close detail, repeated action, and emotional tension.",
    },
    {
      clip_index: 1,
      seconds: 12,
      beat: "grounded emotional continuation",
      purpose: "interactive_payoff",
      scene_anchor: "same room, same emotional air, a few moments later",
      subject_anchor: "same person, same visual identity, same thread",
      emotion_arc: "stuck tension softens into recognition and reward",
      motion_arc: "loop opens up and turns into satisfying progression",
      camera_plan: "continuation angles, wider reveals, motivated inserts, subtle release of pressure",
      editing_rhythm: "still active, but slightly more legible as the idea clicks",
      visual_mode: "environmental_loop",
      motion_motif: "repeat, pause, release",
      visual_intent: "make the viewer feel the pattern becoming understandable",
      continuity_note: "same world, same subject, no restart, end on curiosity rather than pitch",
      must_keep: [
        "same person",
        "same wardrobe family",
        "same location and light logic",
        "same emotional thread",
      ],
      avoid: ["talking head", "tutorial UI", "fresh unrelated scene"],
      beat_outline: [
        "0.0-2.0s, continue instantly from clip 1 with no reset of mood or location",
        "2.0-5.0s, show interaction, progression, or physical discovery inside the same world",
        "5.0-9.0s, let the visual logic click so tension becomes recognition",
        "9.0-12.0s, end with an earned curiosity pull toward the quiz, never a hard sell",
      ],
      scene_beats: [
        "A small repeated action reveals the same loop in real life",
        "The person notices the pattern and softens",
        "The CTA appears as curiosity, not pitch",
      ],
      script:
        "Continue the same emotional world and move from visual loop to grounded human recognition, without becoming a talking-head explanation clip.",
      video_prompt_seed:
        "Continue the same world and let movement create payoff, recognition, and a curiosity-driven finish.",
    },
  ];

  const clips =
    Array.isArray(chosenAdPlan?.clips) && chosenAdPlan.clips.length
      ? chosenAdPlan.clips
      : defaultClips;

  const overlays =
    Array.isArray(chosenAdPlan?.overlays) && chosenAdPlan.overlays.length
      ? chosenAdPlan.overlays
      : ["it already happened", "so why are you still there", "take the reading"];

  const visualRules = {
    primary_mode: clean(chosenAdPlan?.visual_rules?.primary_mode, "symbolic_ui_loop"),
    camera_rule: clean(
      chosenAdPlan?.visual_rules?.camera_rule,
      "no talking head, no direct address, no presenter framing"
    ),
    audio_rule: clean(
      chosenAdPlan?.visual_rules?.audio_rule,
      "ambient or minimal, spoken lines optional and secondary"
    ),
    continuity_rule: clean(
      chosenAdPlan?.visual_rules?.continuity_rule,
      "clip 2 continues clip 1 emotionally and visually"
    ),
  };

  const characterLock = {
    role: clean(chosenAdPlan?.character_lock?.role, "believable modern young adult"),
    age_range: clean(chosenAdPlan?.character_lock?.age_range, "20s to early 30s"),
    presentation: clean(
      chosenAdPlan?.character_lock?.presentation,
      "social-native, expressive, real, not ad-polished"
    ),
    wardrobe: clean(
      chosenAdPlan?.character_lock?.wardrobe,
      "understated modern casual with continuity across clips"
    ),
    casting_notes: normalizeList(chosenAdPlan?.character_lock?.casting_notes, [
      "never present as an explainer",
      "emotions should register through behavior, not speech",
    ]),
  };

  const worldLock = {
    location: clean(chosenAdPlan?.world_lock?.location, "intimate modern interior"),
    time_of_day: clean(chosenAdPlan?.world_lock?.time_of_day, "late day or night"),
    lighting: clean(
      chosenAdPlan?.world_lock?.lighting,
      "phone glow, practical light, contrast, tactile shadows"
    ),
    texture: clean(
      chosenAdPlan?.world_lock?.texture,
      "premium social-native realism, tactile surfaces, cinematic detail"
    ),
    props: normalizeList(chosenAdPlan?.world_lock?.props, ["phone", "mirror", "chair", "table edge"]),
  };

  return {
    campaign_angle:
      clean(chosenAdPlan?.campaign_angle, quiz?.title || "Identity reveal quiz funnel"),
    character_lock: characterLock,
    world_lock: worldLock,
    visual_symbols: normalizeList(chosenAdPlan?.visual_symbols, [
      "rewind fragments",
      "glance echoes",
      "screen glow pulses",
    ]),
    continuity_rules: normalizeList(chosenAdPlan?.continuity_rules, [
      "same person across both clips",
      "same environment family across both clips",
      "clip 2 is continuation, never reset",
    ]),
    visual_rules: visualRules,
    overlays,
    clips: clips.map((clip, index) => {
      const fallbackClip = defaultClips[index] || defaultClips[defaultClips.length - 1];
      return {
        clip_index: Number.isFinite(Number(clip?.clip_index))
          ? Number(clip.clip_index)
          : index,
        seconds: Number.isFinite(Number(clip?.seconds)) ? Number(clip.seconds) : 12,
        beat: clean(clip?.beat, fallbackClip.beat),
        purpose: clean(clip?.purpose, fallbackClip.purpose),
        scene_anchor: clean(clip?.scene_anchor, fallbackClip.scene_anchor),
        subject_anchor: clean(clip?.subject_anchor, fallbackClip.subject_anchor),
        emotion_arc: clean(clip?.emotion_arc, fallbackClip.emotion_arc),
        motion_arc: clean(clip?.motion_arc, fallbackClip.motion_arc),
        camera_plan: clean(clip?.camera_plan, fallbackClip.camera_plan),
        editing_rhythm: clean(clip?.editing_rhythm, fallbackClip.editing_rhythm),
        visual_mode: clean(clip?.visual_mode, fallbackClip.visual_mode),
        motion_motif: clean(clip?.motion_motif, fallbackClip.motion_motif),
        visual_intent: clean(clip?.visual_intent, fallbackClip.visual_intent),
        continuity_note: clean(clip?.continuity_note, fallbackClip.continuity_note),
        must_keep: normalizeList(clip?.must_keep, fallbackClip.must_keep),
        avoid: normalizeList(clip?.avoid, fallbackClip.avoid),
        beat_outline: normalizeList(clip?.beat_outline, fallbackClip.beat_outline),
        scene_beats: normalizeList(clip?.scene_beats, fallbackClip.scene_beats),
        script: clean(clip?.script, fallbackClip.script),
        video_prompt_seed: clean(
          clip?.video_prompt_seed || clip?.video_prompt,
          fallbackClip.video_prompt_seed
        ),
      };
    }),
    trend_reference: selectedTopic,
    cta_url_hint: ctaUrl,
    hook_prompt: [
      `Create a premium-feeling 9:16 short-form clip.`,
      `Topic: ${quiz?.title || selectedTopic}.`,
      `Clip 1 is the visual hook.`,
      `Primary visual mode: ${visualRules.primary_mode}.`,
      `Character lock: ${characterLock.role}, ${characterLock.presentation}, wardrobe ${characterLock.wardrobe}.`,
      `World lock: ${worldLock.location}, ${worldLock.time_of_day}, ${worldLock.lighting}.`,
      `Camera rule: ${visualRules.camera_rule}.`,
      `Audio rule: ${visualRules.audio_rule}.`,
      `Lead with the stronger, more stylized visual concept first.`,
      `Use repeated fragments, rewinds, symbolic objects, UI fragments, or environmental storytelling.`,
      `Do not explain the quiz mechanics.`,
      `Do not use presenter energy.`,
      `Do not use direct-to-camera monologue.`,
      `Keep readable text sparse.`,
    ].join(" "),
    reveal_prompt: [
      `Create a premium-feeling 9:16 continuation clip.`,
      `Topic: ${quiz?.title || selectedTopic}.`,
      `Clip 2 continues clip 1 and becomes more grounded and emotionally human.`,
      `Character lock: ${characterLock.role}, ${characterLock.presentation}, wardrobe ${characterLock.wardrobe}.`,
      `World lock: ${worldLock.location}, ${worldLock.time_of_day}, ${worldLock.lighting}.`,
      `Camera rule: ${visualRules.camera_rule}.`,
      `Audio rule: ${visualRules.audio_rule}.`,
      `Show the emotional aftermath of recognition through action, rhythm, repetition, or visual metaphor.`,
      `Do not use a tutorial.`,
      `Do not use a talking-head explanation.`,
      `Keep readable text sparse.`,
      `Make the viewer want the full result.`,
    ].join(" "),
  };
}
