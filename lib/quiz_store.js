import fs from "fs";
import path from "path";
import { getSupabaseServerClient, hasSupabaseServerEnv } from "./supabase";

function ensure(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function dataRoot() {
  return ensure(path.join(process.cwd(), "vp_data"));
}

export function trendsRoot() {
  return ensure(path.join(dataRoot(), "trends"));
}

export function quizzesRoot() {
  return ensure(path.join(dataRoot(), "quizzes"));
}

export function sessionsRoot() {
  return ensure(path.join(dataRoot(), "sessions"));
}

export function writeJson(filePath, obj) {
  ensure(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
  return filePath;
}

export function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function makeId(prefix = "vp") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function cleanRecord(record) {
  return record && typeof record === "object" ? record : null;
}

export async function saveTrendPacket(packet) {
  const id = packet.id || makeId("trend");
  const normalized = { ...packet, id };

  if (!hasSupabaseServerEnv()) {
    writeJson(path.join(trendsRoot(), `${id}.json`), normalized);
    return normalized;
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("trend_packets").upsert(
    {
      trend_id: id,
      created_at: normalized.created_at || new Date().toISOString(),
      trend_json: normalized,
    },
    { onConflict: "trend_id" }
  );

  if (error) throw new Error(`Supabase saveTrendPacket failed: ${error.message}`);
  return normalized;
}

export async function saveQuiz(quiz) {
  const id = quiz.quiz_id || makeId("quiz");
  const normalized = { ...quiz, quiz_id: id };

  if (!hasSupabaseServerEnv()) {
    writeJson(path.join(quizzesRoot(), `${id}.json`), normalized);
    return normalized;
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("quizzes").upsert(
    {
      quiz_id: id,
      created_at: normalized.created_at || new Date().toISOString(),
      title: normalized.title || "Untitled quiz",
      quiz_json: normalized,
    },
    { onConflict: "quiz_id" }
  );

  if (error) throw new Error(`Supabase saveQuiz failed: ${error.message}`);
  return normalized;
}

export async function getQuiz(quizId) {
  if (!hasSupabaseServerEnv()) {
    return readJson(path.join(quizzesRoot(), `${quizId}.json`));
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("quiz_json")
    .eq("quiz_id", quizId)
    .maybeSingle();

  if (error) throw new Error(`Supabase getQuiz failed: ${error.message}`);
  return cleanRecord(data?.quiz_json);
}

export async function saveSession(session) {
  const id = session.session_id || makeId("session");
  const normalized = {
    ...session,
    session_id: id,
    created_at: session.created_at || new Date().toISOString(),
  };

  if (!hasSupabaseServerEnv()) {
    writeJson(path.join(sessionsRoot(), `${id}.json`), normalized);
    return normalized;
  }

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("quiz_sessions").upsert(
    {
      session_id: id,
      quiz_id: normalized.quiz_id,
      created_at: normalized.created_at,
      answers_json: normalized.answers || {},
      score_map: normalized.score_map || {},
      primary_archetype: normalized.primary_archetype || null,
      primary_archetype_id: normalized.primary_archetype_id || null,
      preview_json: normalized.preview || {},
      premium_json: normalized.premium || {},
      unlocked: Boolean(normalized.unlocked),
      unlocked_at: normalized.unlocked_at || null,
      price: Number(normalized.price || 0),
      stripe_checkout_session_id: normalized.stripe_checkout_session_id || null,
      stripe_payment_status: normalized.stripe_payment_status || null,
    },
    { onConflict: "session_id" }
  );

  if (error) throw new Error(`Supabase saveSession failed: ${error.message}`);
  return normalized;
}

export async function getSession(sessionId) {
  if (!hasSupabaseServerEnv()) {
    return readJson(path.join(sessionsRoot(), `${sessionId}.json`));
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("quiz_sessions")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw new Error(`Supabase getSession failed: ${error.message}`);
  if (!data) return null;

  return {
    session_id: data.session_id,
    quiz_id: data.quiz_id,
    created_at: data.created_at,
    answers: data.answers_json || {},
    score_map: data.score_map || {},
    primary_archetype: data.primary_archetype,
    primary_archetype_id: data.primary_archetype_id,
    preview: data.preview_json || {},
    premium: data.premium_json || {},
    unlocked: Boolean(data.unlocked),
    unlocked_at: data.unlocked_at,
    price: Number(data.price || 0),
    stripe_checkout_session_id: data.stripe_checkout_session_id || null,
    stripe_payment_status: data.stripe_payment_status || null,
  };
}

export async function markSessionCheckoutCreated(sessionId, checkoutSessionId) {
  const existing = await getSession(sessionId);
  if (!existing) return null;
  return saveSession({
    ...existing,
    stripe_checkout_session_id: checkoutSessionId,
    stripe_payment_status: "checkout_created",
  });
}

export async function markSessionPaid(sessionId, checkoutSessionId, paymentStatus = "paid") {
  const existing = await getSession(sessionId);
  if (!existing) return null;
  return saveSession({
    ...existing,
    stripe_checkout_session_id: checkoutSessionId || existing.stripe_checkout_session_id || null,
    stripe_payment_status: paymentStatus,
    unlocked: true,
    unlocked_at: existing.unlocked_at || new Date().toISOString(),
  });
}
