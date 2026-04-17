import OpenAI from "openai";

export const runtime = "nodejs"; // important: keep this off edge for now

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      directive,
      context_files = [],   // [{ path, content }]
      target_file_path = "",
      current_file_content = "",
    } = body;

    // Codex-tuned model in the API is gpt-5.2-codex :contentReference[oaicite:2]{index=2}
    const response = await client.responses.create({
      model: "gpt-5.2-codex",
      reasoning: { effort: "high" }, // low|medium|high|xhigh :contentReference[oaicite:3]{index=3}
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text:
                "You are a senior codebase maintainer. " +
                "Return ONLY a JSON object that matches the requested schema. " +
                "Do not include markdown. Do not include commentary.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "TASK: Apply the directive to the provided code.\n\n" +
                `DIRECTIVE:\n${directive}\n\n` +
                `TARGET_FILE_PATH:\n${target_file_path}\n\n` +
                `CURRENT_TARGET_FILE_CONTENT:\n${current_file_content}\n\n` +
                `OTHER_CONTEXT_FILES:\n${JSON.stringify(context_files, null, 2)}\n\n` +
                "OUTPUT REQUIREMENTS:\n" +
                "Return JSON with shape:\n" +
                "{\n" +
                '  "mode": "full_file",\n' +
                '  "file_path": string,\n' +
                '  "updated_content": string\n' +
                "}\n",
            },
          ],
        },
      ],
      // If you want to hard-enforce JSON, you can also use Structured Outputs.
      // See Structured Outputs guide. :contentReference[oaicite:4]{index=4}
    });

    const text = response.output_text ?? "";
    return new Response(text, { status: 200, headers: { "content-type": "application/json" } });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unknown error" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}