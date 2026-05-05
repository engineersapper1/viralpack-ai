import fs from "fs";
import path from "path";

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); return p; }
function safe(v, fb = "default") {
  const s = String(v || "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  return s || fb;
}
function root() { return ensureDir(path.join(process.cwd(), "vp_runs", "_users")); }
function actorFor(seed) {
  const presets = [
    { name: "Maya Cross", vibe: "polished founder energy", wardrobe: "smart casual neutrals", setting: "clean modern workspace" },
    { name: "Jules Mercer", vibe: "confident local expert", wardrobe: "branded polo and dark jeans", setting: "bright client-facing interior" },
    { name: "Nina Vale", vibe: "premium lifestyle creator", wardrobe: "minimal chic streetwear", setting: "sunlit studio corner" },
    { name: "Theo Lane", vibe: "high-trust operator", wardrobe: "tailored casual layers", setting: "sleek office with product hero table" },
  ];
  let h = 0;
  for (const ch of seed) h = ((h << 5) - h + ch.charCodeAt(0)) | 0;
  return presets[Math.abs(h) % presets.length];
}
export function upsertClientProfile({ userId, clientKey }) {
  const dir = ensureDir(path.join(root(), safe(userId), "profiles"));
  const file = path.join(dir, `${safe(clientKey)}.json`);
  if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, "utf8"));
  const actor_lock = actorFor(`${userId}|${clientKey}`);
  const profile = { user_id: userId, client_key: clientKey, actor_lock, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  fs.writeFileSync(file, JSON.stringify(profile, null, 2), "utf8");
  return profile;
}
