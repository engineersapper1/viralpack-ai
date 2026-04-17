
const fs = require("fs");
const path = require("path");
const OpenAI = require("openai");

async function main() {
  const target = process.argv[2];

  const instructionsIndex = process.argv.indexOf("--instructions");
  const instructions =
    instructionsIndex !== -1
      ? process.argv[instructionsIndex + 1]
      : "Fix syntax and parsing errors only. Preserve logic and intent. Return full corrected file.";

  if (!target) {
    console.error('Usage: node scripts/codex_fix.js <file> [--instructions "…"]');
    process.exitCode = 1;
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OPENAI_API_KEY not set in this PowerShell session.");
    console.error('Set it with:  $env:OPENAI_API_KEY="sk-..."');
    process.exitCode = 1;
    return;
  }

  const filePath = path.resolve(process.cwd(), target);
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exitCode = 1;
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  const client = new OpenAI({ apiKey });

  const response = await client.responses.create({
    model: "gpt-5.2-codex",
    reasoning: { effort: "high" },
    input: [
      {
        role: "system",
        content: [
          {
            type: "input_text",
            text:
              "You are a strict Next.js/Node maintainer. " +
              "Return ONLY valid JSON. No markdown, no commentary.",
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "OUTPUT SCHEMA (exact):\n" +
              '{ "ok": true, "files": [ { "path": string, "content": string } ] }\n\n' +
              "INSTRUCTIONS:\n" +
              instructions +
              "\n\nFILE:\n" +
              JSON.stringify({ path: target, content }),
          },
        ],
      },
    ],
  });

  const text = response.output_text || "";

  let json;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse Codex output as JSON.");
    console.error("Raw output:");
    console.error(text);
    process.exitCode = 2;
    return;
  }

  if (!json.ok || !Array.isArray(json.files)) {
    console.error("Invalid Codex JSON response shape:", json);
    process.exitCode = 3;
    return;
  }

  for (const f of json.files) {
    if (!f?.path || typeof f.content !== "string") continue;

    const outPath = path.resolve(process.cwd(), f.path);
    if (!fs.existsSync(outPath)) {
      console.error("Codex returned a file path that does not exist locally:", f.path);
      continue;
    }

    const backupPath = outPath + ".bak";
    fs.copyFileSync(outPath, backupPath);
    fs.writeFileSync(outPath, f.content, "utf8");

    console.log("Updated:", f.path);
    console.log("Backup:", backupPath);
  }
}

main().catch((e) => {
  console.error("Error:", e?.message || e);
  process.exitCode = 4;
});