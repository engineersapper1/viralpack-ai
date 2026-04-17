import OpenAI from "openai";

function env(name, fallback = "") {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function firstJson(text) {
  const s = String(text || "").trim();
  if (!s) return null;

  const start = s.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;

    if (depth === 0) {
      try {
        return JSON.parse(s.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }

  return null;
}

export async function callOpenAIJson(prompt, fallbackFactory) {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) return fallbackFactory();

  try {
    const client = new OpenAI({ apiKey });
    const res = await client.responses.create({
      model: env("OPENAI_MODEL", "gpt-4.1-mini"),
      input: prompt,
    });

    return firstJson(res.output_text || "") || fallbackFactory();
  } catch {
    return fallbackFactory();
  }
}

export async function callXaiJson(prompt, fallbackFactory) {
  const apiKey = env("XAI_API_KEY");
  if (!apiKey) return fallbackFactory();

  try {
    const r = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env("XAI_MODEL", "grok-4-fast-non-reasoning"),
        temperature: 0.3,
        messages: [
          { role: "system", content: "Return only one valid JSON object." },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await r.json().catch(() => null);
    return firstJson(data?.choices?.[0]?.message?.content || "") || fallbackFactory();
  } catch {
    return fallbackFactory();
  }
}

function openAiHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

export async function createOpenAIVideoJob({
  prompt,
  model,
  seconds = "12",
  size = "720x1280",
}) {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const payload = {
    model: model || env("OPENAI_VIDEO_MODEL", "sora-2"),
    prompt: String(prompt || "").trim(),
    seconds: String(seconds || "12"),
    size: String(size || "720x1280"),
  };

  const res = await fetch("https://api.openai.com/v1/videos", {
    method: "POST",
    headers: openAiHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `OpenAI video create failed with status ${res.status}`
    );
  }

  if (!data?.id) {
    throw new Error("OpenAI video create returned no video id");
  }

  return data;
}

export async function retrieveOpenAIVideoJob(videoId) {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const res = await fetch(`https://api.openai.com/v1/videos/${videoId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
        data?.message ||
        `OpenAI video retrieve failed with status ${res.status}`
    );
  }

  return data;
}

export async function waitForOpenAIVideo(videoId, options = {}) {
  const pollMs = Number(options.pollMs || env("OPENAI_VIDEO_POLL_MS", "5000"));
  const timeoutMs = Number(options.timeoutMs || env("OPENAI_VIDEO_TIMEOUT_MS", "420000"));
  const started = Date.now();

  while (true) {
    const job = await retrieveOpenAIVideoJob(videoId);

    if (job?.status === "completed") {
      return job;
    }

    if (job?.status === "failed") {
      throw new Error(job?.error?.message || "OpenAI video job failed");
    }

    if (Date.now() - started > timeoutMs) {
      throw new Error(`Timed out waiting for video job ${videoId}`);
    }

    await sleep(pollMs);
  }
}

export async function downloadOpenAIVideoBuffer(videoId) {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const res = await fetch(`https://api.openai.com/v1/videos/${videoId}/content`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI video content download failed: ${text || res.status}`);
  }

  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}