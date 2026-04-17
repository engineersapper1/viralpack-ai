import OpenAI from "openai";

export const runtime = "nodejs";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      files = [], // [{ path: "app/api/...", content: "..." }]
      instructions = "",
    } = body;

    if (!Array.isArray(files) || files.length === 0) {
      return new Response(
        JSON.stringify({ ok: false, error: "No files provided" }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }

    const prompt = [
      "You are a strict Next.js/Node maintainer.",
      "Goal: fix parsing/build errors and obvious syntax issues, preserve intent.",
      "Rules:",
      "1) Return ONLY JSON, no markdown, no commentary.",
      "2) Output schema exactly:",
      '{ "ok": true, "files": [ { "path": string, "content": string } ] }',
      "3) Each returned file must be complete full content.",
      "4) Do not change unrelated logic or formatting more than necessary.",
      "",
      "USER INSTRUCTIONS:",
      instructions,
      "",
      "FILES:",
      JSON.stringify(files),
    ].join("\n");

    const r = await client.responses.create({
      model: "gpt-5.2-codex",
      reasoning: { effort: "high" },
      input: [
        {
          role: "system",
          content: [{ type: "text", text: "Return only valid JSON." }],
        },
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
    });

    const text = r.output_text ?? "";
    return new Response(text, {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: String(e?.message || e),
        cause: String(e?.cause || ""),
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}