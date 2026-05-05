import fs from "fs";
import path from "path";
import crypto from "crypto";

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); return p; }
function safe(v, fb = "default") { const s = String(v || "").trim().replace(/[^a-zA-Z0-9_-]+/g, "_"); return s || fb; }
function usersRoot() { return ensureDir(path.join(process.cwd(), "vp_runs", "_users")); }
function userRoot(userId) { return ensureDir(path.join(usersRoot(), safe(userId))); }
function videosDir(userId) { return ensureDir(path.join(userRoot(userId), "videos")); }
function indexPath(userId) { return path.join(userRoot(userId), "videos_index.json"); }
function retentionDays() { return Number(process.env.VP_RETENTION_DAYS || 30); }
function maxVideos() { return Number(process.env.VP_MAX_VIDEOS_PER_USER || 80); }
function nowIso() { return new Date().toISOString(); }
function loadIndex(userId) {
  cleanupExpired(userId);
  const p = indexPath(userId);
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return []; }
}
function saveIndex(userId, arr) { fs.writeFileSync(indexPath(userId), JSON.stringify(arr, null, 2), "utf8"); }
export function quotaStatus(userId) {
  const arr = loadIndex(userId);
  const used_videos = arr.length;
  const max_videos = maxVideos();
  return { used_videos, max_videos, near_limit: used_videos >= Math.max(1, max_videos - 5), over_limit: used_videos >= max_videos };
}
export function cleanupExpired(userId) {
  const p = indexPath(userId);
  if (!fs.existsSync(p)) return [];
  let arr = [];
  try { arr = JSON.parse(fs.readFileSync(p, "utf8")); } catch {}
  const now = Date.now();
  const kept = [];
  for (const item of arr) {
    const delAt = Date.parse(item.delete_after || 0);
    const file = item.path;
    if (delAt && delAt < now) {
      try { if (file && fs.existsSync(file)) fs.unlinkSync(file); } catch {}
      continue;
    }
    kept.push(item);
  }
  if (kept.length !== arr.length) saveIndex(userId, kept);
  return kept;
}
export function addVideo({ userId, srcPath, runId, clientKey, meta = {} }) {
  const qs = quotaStatus(userId);
  if (qs.over_limit) return { ok: false, error: "Video quota exceeded", quota: qs };
  const id = "vid_" + crypto.randomBytes(6).toString("hex");
  const ext = path.extname(srcPath) || ".mp4";
  const dst = path.join(videosDir(userId), `${id}${ext}`);
  fs.copyFileSync(srcPath, dst);
  const createdAt = nowIso();
  const deleteAfter = new Date(Date.now() + (retentionDays() + 1) * 86400000).toISOString();
  const record = { id, user_id: userId, run_id: runId || null, client_key: clientKey || null, path: dst, created_at: createdAt, delete_after: deleteAfter, meta };
  const arr = loadIndex(userId);
  arr.unshift(record);
  saveIndex(userId, arr);
  return { ok: true, video: record, quota: quotaStatus(userId) };
}
export function listVideos(userId, limit = 50) {
  return loadIndex(userId).slice(0, Math.max(1, Number(limit) || 50));
}
export function getVideo(userId, id) {
  return loadIndex(userId).find((v) => v.id === id) || null;
}
export function deleteVideo(userId, id) {
  const arr = loadIndex(userId);
  const idx = arr.findIndex((v) => v.id === id);
  if (idx < 0) return { ok: false, error: "Video not found" };
  const [item] = arr.splice(idx, 1);
  try { if (item.path && fs.existsSync(item.path)) fs.unlinkSync(item.path); } catch {}
  saveIndex(userId, arr);
  return { ok: true, deleted: item, quota: quotaStatus(userId) };
}
