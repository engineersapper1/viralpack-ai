import crypto from "crypto";
import JSZip from "jszip";

export function safeJson(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function mustEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) throw new Error(`Missing env var: ${name}`);
  return String(v).trim();
}

export function clampStr(v, max = 1200) {
  const s = String(v ?? "").trim();
  return s.length > max ? s.slice(0, max) : s;
}

export function slugify(v, fallback = "viralpack") {
  const s = String(v || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || fallback;
}

export function extractOutputText(resJson) {
  if (!resJson) return "";
  if (typeof resJson.output_text === "string" && resJson.output_text.trim()) return resJson.output_text;
  const out = Array.isArray(resJson.output) ? resJson.output : [];
  const parts = [];
  for (const item of out) {
    const content = Array.isArray(item?.content) ? item.content : [];
    for (const c of content) {
      if (typeof c?.text === "string") parts.push(c.text);
      if (c?.type === "output_text" && typeof c?.text === "string") parts.push(c.text);
      if (typeof c?.content === "string") parts.push(c.content);
    }
  }
  return parts.join("\n");
}

export function parseFirstJsonObject(text) {
  const s = String(text || "").trim();
  if (!s) return null;
  const firstBrace = s.indexOf("{");
  if (firstBrace < 0) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = firstBrace; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    if (depth === 0) {
      try {
        return JSON.parse(s.slice(firstBrace, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function callOpenAIResponses({ apiKey, model, inputText, jsonObject = false }) {
  const payload = {
    model,
    input: inputText,
  };
  if (jsonObject) payload.text = { format: { type: "json_object" } };

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => null);
  if (!r.ok) {
    throw new Error(data?.error?.message || data?.error?.type || `OpenAI request failed (${r.status})`);
  }
  return { raw: data, text: extractOutputText(data) };
}

export function normalizeCopyrightPack(pack) {
  const obj = pack && typeof pack === "object" ? pack : {};
  const out = obj.output && typeof obj.output === "object" ? obj.output : obj;
  const arr = (v, limit = 5) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).slice(0, limit) : []);

  return {
    schema_version: "vp_copyright_pack_v1",
    rights_flags: arr(out.rights_flags, 6),
    originality_moves: arr(out.originality_moves, 5),
    risk_notes: arr(out.risk_notes, 5),
    caption_variants: arr(out.caption_variants, 5),
    disclaimers: arr(out.disclaimers, 4),
    clearance_checklist: arr(out.clearance_checklist, 8),
    upload_title_options: arr(out.upload_title_options, 5),
    notes: clampStr(out.notes || "", 1200),
  };
}

export function buildCopyrightTxtExport(data) {
  const pack = normalizeCopyrightPack(data);
  const lines = [];
  lines.push("ViralPack.ai, Copyright Pack");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  const sections = [
    ["RIGHTS FLAGS", pack.rights_flags],
    ["ORIGINALITY MOVES", pack.originality_moves],
    ["RISK NOTES", pack.risk_notes],
    ["CAPTION VARIANTS", pack.caption_variants],
    ["DISCLAIMERS", pack.disclaimers],
    ["CLEARANCE CHECKLIST", pack.clearance_checklist],
    ["UPLOAD TITLE OPTIONS", pack.upload_title_options],
  ];
  for (const [title, items] of sections) {
    lines.push(title);
    for (const item of items) lines.push(`- ${item}`);
    lines.push("");
  }
  if (pack.notes) {
    lines.push("NOTES");
    lines.push(pack.notes);
    lines.push("");
  }
  return lines.join("\n");
}

function hashBuffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function extname(name) {
  const m = String(name || "").match(/\.([a-zA-Z0-9]{1,10})$/);
  return m ? m[1].toLowerCase() : "";
}

function inferWorkType(files, hint = "") {
  const types = files.map((f) => String(f.mime || ""));
  const exts = files.map((f) => extname(f.name));
  const allImages = files.length > 0 && files.every((f) => String(f.mime || "").startsWith("image/"));
  const anyVideo = types.some((t) => t.startsWith("video/")) || exts.some((x) => ["mp4", "mov", "mkv", "avi", "webm"].includes(x));
  const anyAudio = types.some((t) => t.startsWith("audio/")) || exts.some((x) => ["mp3", "wav", "m4a", "aac"].includes(x));
  const anyText = types.some((t) => t.startsWith("text/")) || exts.some((x) => ["txt", "md", "csv", "json", "xml", "html"].includes(x));
  const anyPdf = exts.includes("pdf");
  const lowerHint = String(hint || "").toLowerCase();
  if (lowerHint.includes("photo")) return "Photograph(s)";
  if (lowerHint.includes("video")) return "Audiovisual Work";
  if (lowerHint.includes("audio")) return "Sound Recording";
  if (allImages) return files.length === 1 ? "Photograph" : "Group of Photographs";
  if (anyVideo && !anyAudio) return "Audiovisual Work";
  if (anyAudio && !anyVideo) return "Sound Recording";
  if (anyText && !anyVideo && !anyAudio) return anyPdf ? "Literary / Text-Based Material" : "Text-Based Material";
  return "Mixed Media Compilation";
}

function inferDepositMethod(files, workType, publicationStatus) {
  const imageOnly = files.length > 0 && files.every((f) => String(f.mime || "").startsWith("image/"));
  if (imageOnly && publicationStatus === "published") {
    return {
      headline: "This packet may be usable as a ZIP deposit for some photograph workflows, but the filer must verify the current Copyright Office path before uploading.",
      filingPath: "Potential group photo style workflow",
      uploadInstruction: "Review the worksheet first. If the filing path selected by the user accepts a ZIP plus title list, use the packet ZIP. Otherwise extract and upload the listed files individually.",
    };
  }
  if (workType === "Mixed Media Compilation") {
    return {
      headline: "Use this packet as a prep binder, not an automatic upload bundle.",
      filingPath: "Mixed media or multiple-work prep",
      uploadInstruction: "Use the worksheet and manifest to complete the online form, then upload only the specific deposit files required for that filing path.",
    };
  }
  return {
    headline: "This packet is a filing-prep bundle.",
    filingPath: workType,
    uploadInstruction: "Complete the online form using the worksheet, then upload the required deposit file or files individually unless the selected workflow explicitly accepts a ZIP.",
  };
}

function buildTitleBase(form, files) {
  const explicit = clampStr(form.work_title || "", 180);
  if (explicit) return explicit;
  const brand = clampStr(form.brand_name || form.claimant_name || "Untitled", 80);
  const n = files.length;
  const suffix = n === 1 ? "Work" : `Collection (${n} files)`;
  return `${brand} ${suffix}`.trim();
}

function normalizeUploadedFiles(rawFiles = []) {
  const out = [];
  for (const raw of rawFiles) {
    if (!raw) continue;
    const contentBase64 = String(raw.content_base64 || raw.base64 || "").trim();
    if (!contentBase64) continue;
    const buffer = Buffer.from(contentBase64, "base64");
    const name = clampStr(raw.name || `file-${out.length + 1}`, 180) || `file-${out.length + 1}`;
    const mime = clampStr(raw.type || raw.mime || "application/octet-stream", 120);
    const size = Number(raw.size || buffer.length || 0);
    const lastModified = raw.last_modified ? new Date(raw.last_modified).toISOString() : null;
    const snippet = clampStr(raw.text_preview || "", 4000);
    out.push({
      name,
      mime,
      size,
      lastModified,
      snippet,
      buffer,
      sha256: hashBuffer(buffer),
      extension: extname(name),
    });
  }
  return out;
}

function sanitizeForm(body) {
  const src = body && typeof body === "object" ? body : {};
  return {
    brand_name: clampStr(src.brand_name, 120),
    claimant_name: clampStr(src.claimant_name, 160),
    author_name: clampStr(src.author_name, 160),
    rights_contact: clampStr(src.rights_contact, 160),
    rights_email: clampStr(src.rights_email, 200),
    website: clampStr(src.website, 200),
    market: clampStr(src.market, 200),
    work_title: clampStr(src.work_title, 180),
    work_type_hint: clampStr(src.work_type_hint, 120),
    publication_status: clampStr(src.publication_status || "unpublished", 40).toLowerCase(),
    publication_date: clampStr(src.publication_date, 40),
    creation_year: clampStr(src.creation_year, 10),
    country: clampStr(src.country || "United States", 80),
    additional_notes: clampStr(src.additional_notes, 2000),
    dropbox_access_token: clampStr(src.dropbox_access_token, 500),
    dropbox_folder: clampStr(src.dropbox_folder || "/ViralPack", 200),
    mode: clampStr(src.mode || "local", 40),
    virtual_files: Array.isArray(src.virtual_files) ? src.virtual_files : [],
  };
}

function buildVirtualFiles(virtualFiles = []) {
  const out = [];
  for (const f of virtualFiles) {
    const name = clampStr(f?.name || `virtual-${out.length + 1}.txt`, 180);
    const text = String(f?.content || "");
    const buffer = Buffer.from(text, "utf8");
    out.push({
      name,
      mime: clampStr(f?.type || "text/plain", 120),
      size: buffer.length,
      lastModified: null,
      snippet: clampStr(text, 4000),
      buffer,
      sha256: hashBuffer(buffer),
      extension: extname(name),
    });
  }
  return out;
}

function inferPublicationDate(form, files) {
  if (form.publication_date) return form.publication_date;
  const dated = files.map((f) => f.lastModified).filter(Boolean).sort();
  return dated[0] ? dated[0].slice(0, 10) : "VERIFY BEFORE FILING";
}

function inferCreationYear(form, files) {
  if (form.creation_year) return form.creation_year;
  const dated = files.map((f) => f.lastModified).filter(Boolean).sort();
  return dated[0] ? dated[0].slice(0, 4) : String(new Date().getFullYear());
}

function buildMediaRows(files, titleBase) {
  return files.map((f, idx) => ({
    index: idx + 1,
    file_name: f.name,
    title: files.length === 1 ? titleBase : `${titleBase} ${String(idx + 1).padStart(3, "0")}`,
    mime_type: f.mime,
    extension: f.extension || "",
    file_size_bytes: f.size,
    sha256: f.sha256,
    last_modified: f.lastModified || "",
    text_preview: f.snippet || "",
  }));
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

function buildCsv(rows) {
  if (!rows.length) return "index,file_name,title,mime_type,extension,file_size_bytes,sha256,last_modified,text_preview\n";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  return lines.join("\n");
}

function htmlEscape(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildWorksheetDoc(summary) {
  const fieldRows = summary.formFields.map((f) => `
    <tr>
      <td><b>${htmlEscape(f.label)}</b></td>
      <td>${htmlEscape(f.value)}</td>
      <td>${htmlEscape(f.instructions)}</td>
    </tr>`).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Registration Worksheet</title>
<style>
body { font-family: Arial, sans-serif; margin: 28px; color: #111; }
h1, h2, h3 { margin: 0 0 10px; }
p, li { line-height: 1.45; }
table { border-collapse: collapse; width: 100%; margin-top: 16px; }
th, td { border: 1px solid #999; padding: 8px; vertical-align: top; }
th { background: #efefef; text-align: left; }
.box { border: 1px solid #bbb; padding: 12px; margin: 14px 0; }
.small { color: #555; font-size: 11pt; }
</style>
</head>
<body>
  <h1>ViralPack.ai Registration Worksheet</h1>
  <p class="small">Prepared ${htmlEscape(summary.generatedAt)}. This packet is a filing-prep aid. The user must review every field before submitting.</p>
  <div class="box">
    <h2>Packet Snapshot</h2>
    <p><b>Suggested work type:</b> ${htmlEscape(summary.workType)}</p>
    <p><b>Suggested filing path:</b> ${htmlEscape(summary.deposit.filingPath)}</p>
    <p><b>Deposit note:</b> ${htmlEscape(summary.deposit.headline)}</p>
    <p><b>File count:</b> ${htmlEscape(summary.fileCount)}</p>
  </div>
  <h2>What to Type Where</h2>
  <table>
    <thead><tr><th>Field</th><th>Suggested entry</th><th>How to use it</th></tr></thead>
    <tbody>${fieldRows}</tbody>
  </table>
  <div class="box">
    <h2>Warnings to Review</h2>
    <ul>${summary.warnings.map((x) => `<li>${htmlEscape(x)}</li>`).join("")}</ul>
  </div>
  <div class="box">
    <h2>Notes</h2>
    <p>${htmlEscape(summary.notes)}</p>
  </div>
</body>
</html>`;
}

function buildReadme(summary) {
  return [
    "ViralPack.ai Copyright Filing Packet",
    `Generated: ${summary.generatedAt}`,
    "",
    `Suggested work type: ${summary.workType}`,
    `Suggested filing path: ${summary.deposit.filingPath}`,
    `File count: ${summary.fileCount}`,
    "",
    "What this packet does:",
    "- Bundles the uploaded files.",
    "- Builds a human-friendly worksheet with suggested entries.",
    "- Creates a title list, media index, and deposit manifest.",
    "- Tells the filer what still must be verified manually.",
    "",
    "Before filing:",
    ...summary.warnings.map((x) => `- ${x}`),
    "",
    "Upload guidance:",
    `- ${summary.deposit.uploadInstruction}`,
    "",
    "This packet does not itself submit a registration. The filer must complete the online application and verify the selected registration path.",
  ].join("\n");
}

function buildDepositManifest(summary, mediaRows) {
  const lines = [
    "Deposit Manifest",
    `Generated: ${summary.generatedAt}`,
    `Suggested work type: ${summary.workType}`,
    `Suggested filing path: ${summary.deposit.filingPath}`,
    "",
    "Included media:",
  ];
  for (const row of mediaRows) {
    lines.push(`- ${row.file_name} | ${row.mime_type} | ${row.file_size_bytes} bytes | SHA256 ${row.sha256}`);
  }
  return lines.join("\n");
}

function buildTitleList(mediaRows) {
  const lines = ["Title List", ""];
  for (const row of mediaRows) lines.push(`${row.index}. ${row.title}`);
  return lines.join("\n");
}

function buildInstructions(summary) {
  const rows = summary.formFields;
  return [
    "Filing Instructions",
    "",
    "1. Open the registration portal and choose the filing path that matches the actual facts.",
    `2. Use the suggested work type as a starting point: ${summary.workType}.`,
    "3. Open 02_REGISTRATION_WORKSHEET.doc and copy each suggested value into the matching field.",
    "4. Confirm the author, claimant, and publication details before paying.",
    `5. ${summary.deposit.uploadInstruction}`,
    "6. Keep 03_MEDIA_INDEX.csv and 04_DEPOSIT_MANIFEST.txt for your records.",
    "",
    "Quick copy map:",
    ...rows.map((row) => `- ${row.label}: ${row.value}`),
  ].join("\n");
}

function buildMetadata(summary, mediaRows) {
  return JSON.stringify({ summary, media_index: mediaRows }, null, 2);
}

function buildWarnings(form, files, publicationDate) {
  const warnings = [];
  if (!form.author_name) warnings.push("Author name was not provided. Confirm the real author name before filing.");
  if (!form.claimant_name) warnings.push("Claimant name was not provided. Confirm who owns the claim before filing.");
  if (publicationDate === "VERIFY BEFORE FILING") warnings.push("First publication date could not be verified from the files. Review this manually.");
  if (files.some((f) => !f.lastModified)) warnings.push("One or more files did not include a usable last-modified date.");
  if (files.some((f) => f.mime === "application/octet-stream")) warnings.push("Some file types were generic or unknown. Confirm that each file belongs in the chosen filing path.");
  if (!warnings.length) warnings.push("Review all names, dates, and filing path choices before submission.");
  return warnings;
}

function buildSummary(form, files, aiPack = null) {
  const generatedAt = new Date().toISOString();
  const workType = inferWorkType(files, form.work_type_hint);
  const titleBase = buildTitleBase(form, files);
  const publicationStatus = form.publication_status === "published" ? "published" : "unpublished";
  const publicationDate = publicationStatus === "published" ? inferPublicationDate(form, files) : "Leave blank unless first publication date is confirmed";
  const creationYear = inferCreationYear(form, files);
  const deposit = inferDepositMethod(files, workType, publicationStatus);
  const warnings = buildWarnings(form, files, publicationDate);
  const mediaRows = buildMediaRows(files, titleBase);
  const suggestedTitles = mediaRows.map((r) => r.title);
  const authorCreated =
    workType === "Audiovisual Work" ? "Audiovisual work" :
    workType.includes("Photograph") ? "Photograph(s)" :
    workType === "Sound Recording" ? "Sound recording" :
    workType.includes("Text") ? "Text" :
    "Compilation / mixed media";

  const formFields = [
    { label: "Type of Work", value: workType, instructions: "Use as the starting category, then adjust if the portal wording differs." },
    { label: "Title of This Work", value: files.length === 1 ? suggestedTitles[0] : titleBase, instructions: "Enter the main title for the claim. Use the title list for per-file titles if needed." },
    { label: "Author", value: form.author_name || "VERIFY BEFORE FILING", instructions: "Enter the legal name of the actual author or authors." },
    { label: "Claimant", value: form.claimant_name || "VERIFY BEFORE FILING", instructions: "Enter the person or business that owns the claim." },
    { label: "Author Created", value: authorCreated, instructions: "Use the closest creation category offered by the portal." },
    { label: "Year Completed", value: creationYear, instructions: "Verify the year the work was completed." },
    { label: "Publication Status", value: publicationStatus, instructions: "Choose published only if the work was publicly distributed." },
    { label: "First Publication Date", value: publicationDate, instructions: "Only enter this if it is confirmed." },
    { label: "Nation of First Publication", value: publicationStatus === "published" ? form.country || "United States" : "Leave blank if unpublished", instructions: "Use the correct country if the work was first published." },
    { label: "Rights and Permissions Contact", value: form.rights_contact || form.claimant_name || "VERIFY BEFORE FILING", instructions: "Optional, but helpful for internal packet records." },
    { label: "Rights Email", value: form.rights_email || "VERIFY BEFORE FILING", instructions: "Optional, but helpful for internal packet records." },
    { label: "Website", value: form.website || "", instructions: "Optional reference only. Do not enter unless the portal asks for it." },
  ];

  const notesParts = [];
  if (form.additional_notes) notesParts.push(form.additional_notes);
  if (aiPack?.notes) notesParts.push(`AI notes: ${aiPack.notes}`);
  notesParts.push(`Uploaded file count: ${files.length}.`);
  notesParts.push(`Suggested deposit approach: ${deposit.uploadInstruction}`);

  return {
    generatedAt,
    workType,
    fileCount: files.length,
    publicationStatus,
    publicationDate,
    creationYear,
    deposit,
    warnings,
    formFields,
    notes: notesParts.join(" "),
    aiPack,
    titleBase,
    mediaRows,
    suggestedTitles,
  };
}

async function maybeGenerateAiPack(form, summary, mediaRows) {
  const apiKey = String(process.env.OPENAI_API_KEY || "").trim();
  if (!apiKey) return null;
  try {
    const model = String(process.env.OPENAI_MODEL || "gpt-4.1-mini").trim();
    const prompt = `Return only JSON with keys output.rights_flags, output.originality_moves, output.risk_notes, output.caption_variants, output.disclaimers, output.clearance_checklist, output.upload_title_options, output.notes. Build a concise copyright prep aid for a human filer. Inputs: ${JSON.stringify({ form, summary: { workType: summary.workType, publicationStatus: summary.publicationStatus, fileCount: summary.fileCount }, mediaRows: mediaRows.slice(0, 10) })}`;
    const res = await callOpenAIResponses({ apiKey, model, inputText: prompt, jsonObject: true });
    const parsed = parseFirstJsonObject(res.text);
    return parsed ? normalizeCopyrightPack(parsed) : null;
  } catch {
    return null;
  }
}

export async function createCopyrightPacket(body) {
  const form = sanitizeForm(body);
  const uploadedFiles = normalizeUploadedFiles(body?.files || []);
  const virtualFiles = buildVirtualFiles(form.virtual_files);
  const files = [...uploadedFiles, ...virtualFiles];
  if (!files.length) throw new Error("No files were supplied for the copyright packet.");

  let summary = buildSummary(form, files, null);
  const aiPack = await maybeGenerateAiPack(form, summary, summary.mediaRows);
  summary = buildSummary(form, files, aiPack);
  const mediaRows = summary.mediaRows;

  const zip = new JSZip();
  zip.file("01_READ_ME_FIRST.txt", buildReadme(summary));
  zip.file("02_REGISTRATION_WORKSHEET.doc", buildWorksheetDoc(summary));
  zip.file("03_MEDIA_INDEX.csv", buildCsv(mediaRows));
  zip.file("04_DEPOSIT_MANIFEST.txt", buildDepositManifest(summary, mediaRows));
  zip.file("05_TITLE_LIST.txt", buildTitleList(mediaRows));
  zip.file("06_FILING_INSTRUCTIONS.txt", buildInstructions(summary));
  zip.folder("metadata")?.file("extracted_metadata.json", buildMetadata(summary, mediaRows));
  if (aiPack) zip.folder("metadata")?.file("ai_copyright_pack.txt", buildCopyrightTxtExport(aiPack));

  const mediaFolder = zip.folder("media");
  for (const f of files) mediaFolder?.file(f.name, f.buffer);

  const brandSlug = slugify(form.brand_name || form.claimant_name || form.author_name || "copyright");
  const filename = `${brandSlug}-copyright-submission-packet.zip`;
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });

  return {
    ok: true,
    filename,
    zipBuffer,
    zipBase64: zipBuffer.toString("base64"),
    summary: {
      generated_at: summary.generatedAt,
      work_type: summary.workType,
      publication_status: summary.publicationStatus,
      deposit: summary.deposit,
      file_count: summary.fileCount,
      warnings: summary.warnings,
      suggested_titles: summary.suggestedTitles,
      form_fields: summary.formFields,
      notes: summary.notes,
      includes_ai_pack: Boolean(aiPack),
    },
  };
}
