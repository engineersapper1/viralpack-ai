import path from "path";
import { ensureDir, writeJson, writeText } from "@/lib/vp_runs";

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

function shortTileTitle(quiz) {
  const preferred = clean(quiz.title_title || "");
  if (preferred) return preferred;
  const title = clean(quiz.title, quiz.quiz_id || "Quiz").replace(/[?!.]+$/g, "");
  if (title.length <= 34) return title;
  return `${title.slice(0, 31).trim()}...`;
}

function paletteFromSlug(slug) {
  const code = [...slug].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const palettes = [
    ["#120e1f", "#3d1b67", "#8f51ff", "#f2d8ff"],
    ["#07141f", "#0d4562", "#31b4ff", "#d9f4ff"],
    ["#160d15", "#4e1d4a", "#ff4dc4", "#ffe1f6"],
    ["#10160d", "#365b24", "#b6ff59", "#f1ffe0"],
  ];
  return palettes[code % palettes.length];
}

function buildTileSvg({ titleTitle, shortHook, slug }) {
  const [bg1, bg2, accent, text] = paletteFromSlug(slug);
  const safeTitle = titleTitle.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeHook = clean(shortHook, "Pick the one that feels a little too accurate.")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 90);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500" fill="none">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1200" y2="1500" gradientUnits="userSpaceOnUse">
      <stop stop-color="${bg1}"/>
      <stop offset="1" stop-color="${bg2}"/>
    </linearGradient>
    <radialGradient id="r" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(880 320) rotate(129) scale(610 610)">
      <stop stop-color="${accent}" stop-opacity="0.92"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="1500" rx="48" fill="url(#g)"/>
  <rect x="48" y="48" width="1104" height="1404" rx="36" stroke="rgba(255,255,255,.12)"/>
  <circle cx="900" cy="320" r="520" fill="url(#r)"/>
  <path d="M115 1045C238 919 361 868 484 892C607 916 690 1020 813 1040C936 1060 1035 991 1104 916" stroke="${text}" stroke-opacity="0.18" stroke-width="4"/>
  <path d="M115 1135C270 1013 423 976 576 1024C729 1072 796 1161 949 1185C1017 1196 1068 1189 1104 1170" stroke="${text}" stroke-opacity="0.1" stroke-width="4"/>
  <text x="96" y="142" fill="${text}" fill-opacity="0.72" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="700" letter-spacing="8">ORACLELOOM QUIZ</text>
  <text x="96" y="812" fill="${text}" font-family="Inter, Arial, sans-serif" font-size="108" font-weight="800">
    <tspan x="96" dy="0">${safeTitle}</tspan>
  </text>
  <text x="96" y="930" fill="${text}" fill-opacity="0.82" font-family="Inter, Arial, sans-serif" font-size="38" font-weight="500">
    <tspan x="96" dy="0">${safeHook}</tspan>
  </text>
  <rect x="96" y="1228" width="306" height="92" rx="46" fill="${text}" fill-opacity="0.08" stroke="${text}" stroke-opacity="0.18"/>
  <text x="144" y="1287" fill="${text}" font-family="Inter, Arial, sans-serif" font-size="36" font-weight="700">$1 PREMIUM UNLOCK</text>
</svg>`;
}

export function writeOracleLoomPack(runDir, quiz) {
  const slug = slugify(quiz.public_slug || quiz.slug || quiz.quiz_id || quiz.title, "quiz");
  const titleTitle = shortTileTitle(quiz);
  const tileImageUrl = `/quiz-tiles/${slug}.svg`;

  const oracleQuiz = {
    ...quiz,
    public_slug: slug,
    title_title: titleTitle,
    tile_image_url: tileImageUrl,
    source: "viralpack_pack",
    metadata: {
      ...(quiz.metadata || {}),
      export_target: "oracleloom",
      pack_version: 1,
    },
  };

  const packRoot = ensureDir(path.join(runDir, "oracleloom_pack"));
  const contentDir = ensureDir(path.join(packRoot, "content", "quizzes"));
  const tileDir = ensureDir(path.join(packRoot, "public", "quiz-tiles"));

  const jsonPath = path.join(contentDir, `${slug}.json`);
  const svgPath = path.join(tileDir, `${slug}.svg`);
  writeJson(jsonPath, oracleQuiz);
  writeText(svgPath, buildTileSvg({ titleTitle, shortHook: oracleQuiz.short_hook, slug }));
  writeText(
    path.join(packRoot, "PACK_README.txt"),
    [
      "OracleLoom pack",
      "",
      "Drag these folders into your OracleLoom project root:",
      "  content/quizzes",
      "  public/quiz-tiles",
      "",
      `Quiz slug: ${slug}`,
      `Tile title: ${titleTitle}`,
      "",
      "After dropping into OracleLoom:",
      "1. git add .",
      "2. git commit -m \"add new quiz pack\"",
      "3. git push",
      "4. Vercel redeploys and the new tile appears on /",
    ].join("\n")
  );

  return {
    slug,
    title_title: titleTitle,
    pack_root: packRoot,
    quiz_json_path: jsonPath,
    tile_image_path: svgPath,
  };
}
