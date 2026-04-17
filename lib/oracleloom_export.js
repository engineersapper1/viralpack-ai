function clean(value, fallback = "") {
  const s = String(value ?? "").trim();
  return s || fallback;
}

function slugify(value, fallback = "quiz") {
  const s = clean(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function buildOracleLoomExport(rawQuiz = {}, extra = {}) {
  const quiz = rawQuiz && typeof rawQuiz === "object" ? rawQuiz : {};
  const title = clean(quiz.title, "Untitled quiz");
  const quizId = clean(quiz.quiz_id || quiz.id, slugify(title));
  const publicSlug = clean(quiz.public_slug || quiz.slug, slugify(quizId));

  return {
    quiz_id: quizId,
    public_slug: publicSlug,
    title,
    short_hook: clean(
      quiz.short_hook || quiz.description || quiz.hook,
      "Answer honestly. The pattern usually shows itself fast."
    ),
    questions: asArray(quiz.questions).map((question, questionIndex) => {
      const qid = clean(question?.id, `q${questionIndex + 1}`);
      return {
        id: qid,
        prompt: clean(
          question?.prompt || question?.text || question?.question,
          `Question ${questionIndex + 1}`
        ),
        microcopy: clean(question?.microcopy, ""),
        options: asArray(question?.options)
          .slice(0, 6)
          .map((option, optionIndex) => ({
            id: clean(option?.id, `${qid}_o${optionIndex + 1}`),
            text: clean(option?.text || option?.label, `Option ${optionIndex + 1}`),
            label: clean(option?.label || option?.text, `Option ${optionIndex + 1}`),
            subtext: clean(option?.subtext, ""),
            archetype_weights:
              option?.archetype_weights && typeof option.archetype_weights === "object"
                ? option.archetype_weights
                : option?.weights && typeof option.weights === "object"
                  ? option.weights
                  : {},
          })),
      };
    }),
    result_archetypes: asArray(quiz.result_archetypes || quiz.archetypes).map((archetype, index) => ({
      id: clean(archetype?.id, `type_${index + 1}`),
      label: clean(archetype?.label || archetype?.name, `Archetype ${index + 1}`),
      headline: clean(
        archetype?.headline || archetype?.label || archetype?.name,
        `Archetype ${index + 1}`
      ),
      preview: clean(
        archetype?.preview || archetype?.summary || archetype?.description,
        "A strong pattern emerged."
      ),
      premium:
        archetype?.premium && typeof archetype.premium === "object"
          ? archetype.premium
          : undefined,
    })),
    paywall: {
      price: Number.isFinite(Number(quiz?.paywall?.price ?? extra.price ?? 1))
        ? Number(quiz?.paywall?.price ?? extra.price ?? 1)
        : 1,
      teaser: clean(
        quiz?.paywall?.teaser || quiz?.teaser,
        "Unlock the full reading to see the complete pattern."
      ),
    },
    source: clean(extra.source, "viralpack_v3"),
    metadata: {
      exported_at: new Date().toISOString(),
      export_format: "oracleloom_manual_import_v1",
      category: clean(quiz.category, ""),
      scoring_mode: clean(quiz.scoring_mode, "weighted_archetype"),
      trend_id: clean(extra.trend_id, ""),
      trend_topic: clean(extra.trend_topic, ""),
      run_id: clean(extra.run_id, ""),
      origin_quiz_id: clean(quiz.quiz_id || quiz.id, quizId),
      brand_name: clean(extra.brand_name, ""),
    },
  };
}

export function getOracleLoomExportFilename(rawQuiz = {}) {
  const quizId = clean(rawQuiz?.quiz_id || rawQuiz?.id, slugify(rawQuiz?.title || "quiz"));
  return `${quizId}__oracleloom_import.json`;
}
