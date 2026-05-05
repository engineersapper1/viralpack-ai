// lib/vp_runs.js
import path from "path";
import fs from "fs";

export function getRunsRoot() {
  // vp_runs folder at project root
  return path.join(process.cwd(), "vp_runs");
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

/**
 * ensureRunDir(runId, stage?)
 * Creates and returns the directory for a run, optionally a subfolder stage.
 * Example:
 *  ensureRunDir("VP2_123", "generation") -> <root>/vp_runs/VP2_123/generation
 */
export function ensureRunDir(runId, stage = null) {
  const root = ensureDir(getRunsRoot());
  const runRoot = ensureDir(path.join(root, runId));
  if (!stage) return runRoot;
  return ensureDir(path.join(runRoot, stage));
}

export function safeBasename(name, fallback = "file") {
  const s = String(name || "").trim();
  if (!s) return fallback;
  // Windows + URL safe-ish
  return s
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
}

export function writeJson(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
  return filePath;
}

export function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, String(text ?? ""), "utf8");
  return filePath;
}