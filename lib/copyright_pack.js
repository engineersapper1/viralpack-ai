import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ensureDir, ensureRunDir, safeBasename, writeJson, writeText } from "./vp_runs.js";
import { writeZipFile } from "./zip.js";

function jsonClone(v) {
  return JSON.parse(JSON.stringify(v ?? null));
}

function nowIso() {
  return new Date().toISOString();
}

function slugify(v, fallback = "item") {
  const s = String(v || "").trim().toLowerCase();
  const out = s.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
  return out || fallback;
}

function parseDate(v) {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function fmtDate(d) {
  return d ? d.toISOString().slice(0, 10) : "";
}

function fmtTime(d) {
  return d ? d.toISOString().slice(11, 19) : "";
}

function csvEscape(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function detectMediaType(item) {
  const raw = String(item?.media_type || item?.type || "").toLowerCase();
  if (raw.includes("video") || raw.includes("reel") || raw.includes("story")) return "video";
  if (raw.includes("photo") || raw.includes("image") || raw.includes("jpg") || raw.includes("png")) return "photo";
  if (raw.includes("text") || raw.includes("caption") || raw.includes("copy") || raw.includes("post")) return "text";
  const asset = String(item?.asset_path || item?.asset_url || "").toLowerCase();
  if (/\.(mp4|mov|webm|m4v)$/.test(asset)) return "video";
  if (/\.(jpg|jpeg|png|gif|webp)$/.test(asset)) return "photo";
  if (/\.(txt|md|rtf)$/.test(asset)) return "text";
  return "text";
}

function buildLocationText(location, fallback) {
  const loc = location && typeof location === "object" ? location : {};
  const parts = [loc.label, loc.city, loc.state, loc.country].filter(Boolean);
  return parts.join(", ") || String(fallback || "");
}

async function maybeFetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Asset download failed: ${url} (${res.status})`);
  const arr = await res.arrayBuffer();
  return Buffer.from(arr);
}

async function ingestAsset({ item, sourceRoot, assetDir, stem }) {
  const localAsset = item.asset_path ? path.resolve(sourceRoot, item.asset_path) : null;
  const localCaption = item.caption_path ? path.resolve(sourceRoot, item.caption_path) : null;
  let assetExt = path.extname(String(item.asset_path || item.asset_url || "")) || (detectMediaType(item) === "text" ? ".txt" : ".bin");
  if (assetExt.length > 10) assetExt = ".bin";
  const assetFileName = `${stem}${assetExt}`;
  const assetOut = path.join(assetDir, assetFileName);

  if (localAsset && fs.existsSync(localAsset)) {
    fs.copyFileSync(localAsset, assetOut);
  } else if (item.asset_url) {
    fs.writeFileSync(assetOut, await maybeFetchBuffer(item.asset_url));
  } else if (detectMediaType(item) === "text") {
    fs.writeFileSync(assetOut, String(item.caption_text || item.description || item.title || ""), "utf8");
  } else {
    fs.writeFileSync(assetOut, Buffer.from([]));
  }

  let captionOut = "";
  const captionText = String(item.caption_text || "").trim();
  if (localCaption && fs.existsSync(localCaption)) {
    captionOut = path.join(assetDir, `${stem}_caption${path.extname(localCaption) || ".txt"}`);
    fs.copyFileSync(localCaption, captionOut);
  } else if (captionText) {
    captionOut = path.join(assetDir, `${stem}_caption.txt`);
    fs.writeFileSync(captionOut, captionText, "utf8");
  }

  return { assetOut, captionOut, captionText };
}

function classifyBucket(item) {
  const mediaType = detectMediaType(item);
  const published = String(item.status || "published").toLowerCase() === "published";
  if (mediaType === "photo" && published) {
    const year = parseDate(item.published_at || item.created_at)?.getUTCFullYear() || "unknown";
    return { key: `grpph__${slugify(item.client_name)}__${year}`, filingPath: "GRPPH", label: "Published photos" };
  }
  if (mediaType === "photo" && !published) {
    return { key: `gruph__${slugify(item.client_name)}`, filingPath: "GRUPH", label: "Unpublished photos" };
  }
  if (mediaType === "text" && published) {
    return { key: `grtx__${slugify(item.client_name)}`, filingPath: "GRTX", label: "Short online literary works" };
  }
  return { key: `standard__${slugify(item.client_name)}__${mediaType}`, filingPath: "Standard", label: `${mediaType} review bucket` };
}

function getPostsFromExport(exportJson) {
  if (Array.isArray(exportJson)) return exportJson;
  if (Array.isArray(exportJson?.posts)) return exportJson.posts;
  if (Array.isArray(exportJson?.items)) return exportJson.items;
  if (Array.isArray(exportJson?.published_posts)) return exportJson.published_posts;
  return [];
}

export function deriveManifestFromViralPack({ exportJson, defaults = {} }) {
  const posts = getPostsFromExport(exportJson);
  const clientName = defaults.client_name || exportJson?.client_name || exportJson?.brand_name || "Unknown Client";

  return posts.map((post, idx) => {
    const publishedAt = parseDate(post.published_at || post.posted_at || post.created_at || nowIso());
    const createdAt = parseDate(post.created_at || post.generated_at || post.published_at || nowIso());
    const locationText = buildLocationText(post.location, defaults.location_text);
    return {
      client_name: clientName,
      post_id: String(post.id || post.post_id || `post_${idx + 1}`),
      platform: String(post.platform || post.channel || "Unknown"),
      status: String(post.status || "published"),
      title: String(post.title || post.hook || post.name || `Post ${idx + 1}`),
      description: String(post.description || post.summary || post.caption_text || ""),
      media_type: detectMediaType(post),
      asset_path: String(post.asset_path || ""),
      asset_url: String(post.asset_url || post.url_to_asset || ""),
      created_at: createdAt ? createdAt.toISOString() : "",
      published_at: publishedAt ? publishedAt.toISOString() : "",
      rights_owner: String(post.rights_owner || defaults.rights_owner || clientName),
      author: String(post.author || defaults.author || "ViralPack"),
      work_for_hire: String(post.work_for_hire || defaults.work_for_hire || "yes"),
      caption_text: String(post.caption_text || post.caption || ""),
      caption_path: String(post.caption_path || ""),
      url: String(post.url || post.post_url || ""),
      location_text: locationText,
      city: String(post.location?.city || defaults.city || ""),
      state: String(post.location?.state || defaults.state || ""),
      country: String(post.location?.country || defaults.country || ""),
      tags: asArray(post.tags).join(" | "),
      notes: String(post.notes || post.campaign || post.campaign_name || ""),
      source_payload: jsonClone(post),
    };
  });
}

function buildGuideMarkdown({ manifest, buckets, runMeta }) {
  const lines = [];
  lines.push(`# Copyright Pack Guide`);
  lines.push("");
  lines.push(`Client = ${runMeta.client_name}`);
  lines.push(`Run ID = ${runMeta.run_id}`);
  lines.push(`Generated UTC = ${runMeta.generated_at}`);
  lines.push(`Cloud Provider = ${runMeta.cloud_provider || "none"}`);
  if (runMeta.cloud_remote_path) lines.push(`Cloud Remote Path = ${runMeta.cloud_remote_path}`);
  lines.push("");
  lines.push(`## Filing Buckets`);
  lines.push("");
  for (const bucket of buckets) {
    lines.push(`- ${bucket.bucket_key} = ${bucket.filing_path} = ${bucket.label} = items ${bucket.item_count}`);
  }
  lines.push("");
  lines.push(`## Step By Step`);
  lines.push("");
  lines.push(`1. Open filing_worksheet.csv and derived_manifest.csv.`);
  lines.push(`2. Start with the first batch zip in batches/.`);
  lines.push(`3. Use filing_path to choose the Copyright Office workflow bucket.`);
  lines.push(`4. Copy claimant, author, rights owner, work-for-hire, publication date, and title directly from the worksheet.`);
  lines.push(`5. Upload the matching batch zip.`);
  lines.push(`6. Move to the next bucket until all batches are filed.`);
  lines.push("");
  lines.push(`## Per Item Reference`);
  lines.push("");
  manifest.forEach((item, index) => {
    lines.push(`### ${index + 1}. ${item.title}`);
    lines.push(`- client = ${item.client_name}`);
    lines.push(`- post_id = ${item.post_id}`);
    lines.push(`- platform = ${item.platform}`);
    lines.push(`- status = ${item.status}`);
    lines.push(`- filing_path = ${item.filing_path}`);
    lines.push(`- date = ${item.publication_date}`);
    lines.push(`- time = ${item.publication_time}`);
    lines.push(`- location = ${item.location_text}`);
    lines.push(`- description = ${item.description}`);
    lines.push(`- rights_owner = ${item.rights_owner}`);
    lines.push(`- author = ${item.author}`);
    lines.push(`- work_for_hire = ${item.work_for_hire}`);
    lines.push(`- url = ${item.url}`);
    lines.push(`- asset_file = ${item.asset_file}`);
    lines.push(`- caption_file = ${item.caption_file}`);
    lines.push(`- tags = ${item.tags}`);
    lines.push(`- notes = ${item.notes}`);
    lines.push("");
  });
  return lines.join("\n");
}

async function uploadToDropbox({ localFilePath, remotePath, token }) {
  const data = fs.readFileSync(localFilePath);
  const res = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({ path: remotePath, mode: "overwrite", autorename: false, mute: true }),
    },
    body: data,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Dropbox upload failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function uploadToGoogleDrive({ localFilePath, filename, folderId, accessToken }) {
  const boundary = `vp_${crypto.randomUUID()}`;
  const fileData = fs.readFileSync(localFilePath);
  const metadata = { name: filename, parents: folderId ? [folderId] : undefined };
  const preamble = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/zip\r\n\r\n`,
    "utf8"
  );
  const ending = Buffer.from(`\r\n--${boundary}--`, "utf8");
  const body = Buffer.concat([preamble, fileData, ending]);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Drive upload failed: ${res.status} ${JSON.stringify(json)}`);
  return json;
}

async function maybeCloudSync({ zipPath, provider, remoteRoot, runMeta }) {
  if (!provider || provider === "none") return { provider: "none" };
  const dt = new Date(runMeta.generated_at);
  const yyyy = String(dt.getUTCFullYear());
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  const remotePathBase = `${String(remoteRoot || "copyright-packs").replace(/\/$/, "")}/${yyyy}/${mm}/${dd}/${slugify(runMeta.client_name)}/${runMeta.run_id}`;

  if (provider === "dropbox") {
    const token = process.env.DROPBOX_ACCESS_TOKEN;
    if (!token) throw new Error("Missing DROPBOX_ACCESS_TOKEN for Dropbox sync");
    const remoteFile = `${remotePathBase}/${path.basename(zipPath)}`;
    const receipt = await uploadToDropbox({ localFilePath: zipPath, remotePath: `/${remoteFile.replace(/^\/+/, "")}`, token });
    return { provider, remote_path: remoteFile, receipt };
  }

  if (provider === "gdrive") {
    const accessToken = process.env.GDRIVE_ACCESS_TOKEN;
    const folderId = process.env.GDRIVE_FOLDER_ID || "";
    if (!accessToken) throw new Error("Missing GDRIVE_ACCESS_TOKEN for Google Drive sync");
    const receipt = await uploadToGoogleDrive({ localFilePath: zipPath, filename: path.basename(zipPath), folderId, accessToken });
    return { provider, remote_path: remotePathBase, receipt };
  }

  throw new Error(`Unsupported cloud provider: ${provider}`);
}

export async function buildCopyrightPack({ exportJson, sourceRoot, outputRoot, defaults = {}, cloud = {} }) {
  const manifest = deriveManifestFromViralPack({ exportJson, defaults });
  if (!manifest.length) throw new Error("No posts found in export payload.");

  const runId = `VPCR_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}_${crypto.randomUUID().slice(0, 6)}`;
  const runDir = outputRoot || ensureRunDir(runId, "copyright_pack");
  ensureDir(runDir);
  const vaultDir = ensureDir(path.join(runDir, "copyright_vault"));
  const batchesDir = ensureDir(path.join(runDir, "batches"));

  const enriched = [];
  for (const item of manifest) {
    const dt = parseDate(item.published_at || item.created_at || nowIso()) || new Date();
    const clientSlug = slugify(item.client_name, "client");
    const platformSlug = slugify(item.platform, "platform");
    const assetDir = ensureDir(path.join(vaultDir, clientSlug, String(dt.getUTCFullYear()), String(dt.getUTCMonth() + 1).padStart(2, "0"), platformSlug));
    const stem = safeBasename(`${item.platform}_${item.post_id}_${item.title}`);
    const { assetOut, captionOut, captionText } = await ingestAsset({ item, sourceRoot, assetDir, stem });
    const bucket = classifyBucket(item);
    enriched.push({
      ...item,
      filing_path: bucket.filingPath,
      filing_bucket_key: bucket.key,
      filing_bucket_label: bucket.label,
      publication_date: fmtDate(dt),
      publication_time: fmtTime(dt),
      asset_file: path.relative(runDir, assetOut).replace(/\\/g, "/"),
      caption_file: captionOut ? path.relative(runDir, captionOut).replace(/\\/g, "/") : "",
      caption_text: captionText || item.caption_text || "",
    });
  }

  const derivedManifestPath = path.join(runDir, "derived_manifest.csv");
  const worksheetPath = path.join(runDir, "filing_worksheet.csv");
  writeText(derivedManifestPath, toCsv(enriched.map(({ source_payload, ...rest }) => rest)));
  writeText(
    worksheetPath,
    toCsv(
      enriched.map((item) => ({
        client_name: item.client_name,
        filing_bucket_key: item.filing_bucket_key,
        filing_path: item.filing_path,
        title: item.title,
        platform: item.platform,
        post_id: item.post_id,
        publication_date: item.publication_date,
        publication_time: item.publication_time,
        claimant: item.rights_owner,
        author: item.author,
        rights_owner: item.rights_owner,
        work_for_hire: item.work_for_hire,
        location: item.location_text,
        description: item.description,
        url: item.url,
        asset_file: item.asset_file,
        caption_file: item.caption_file,
        tags: item.tags,
        notes: item.notes,
      }))
    )
  );

  const grouped = new Map();
  for (const item of enriched) {
    if (!grouped.has(item.filing_bucket_key)) grouped.set(item.filing_bucket_key, []);
    grouped.get(item.filing_bucket_key).push(item);
  }

  const bucketSummary = [];
  for (const [bucketKey, items] of grouped.entries()) {
    const bucketDir = ensureDir(path.join(batchesDir, bucketKey));
    const batchManifestPath = path.join(bucketDir, "batch_manifest.csv");
    writeText(batchManifestPath, toCsv(items.map((x) => ({ title: x.title, asset_file: x.asset_file, caption_file: x.caption_file, filing_path: x.filing_path, publication_date: x.publication_date, rights_owner: x.rights_owner, author: x.author }))));

    const entries = [
      { name: "batch_manifest.csv", data: fs.readFileSync(batchManifestPath) },
      ...items.flatMap((x) => {
        const out = [];
        out.push({ name: path.basename(x.asset_file), data: fs.readFileSync(path.join(runDir, x.asset_file)) });
        if (x.caption_file) out.push({ name: path.basename(x.caption_file), data: fs.readFileSync(path.join(runDir, x.caption_file)) });
        return out;
      }),
    ];
    const batchZipPath = path.join(bucketDir, `${bucketKey}.zip`);
    writeZipFile(batchZipPath, entries);
    bucketSummary.push({ bucket_key: bucketKey, filing_path: items[0].filing_path, label: items[0].filing_bucket_label, item_count: items.length, batch_zip: path.relative(runDir, batchZipPath).replace(/\\/g, "/") });
  }

  const runMeta = {
    run_id: runId,
    client_name: enriched[0].client_name,
    generated_at: nowIso(),
    cloud_provider: cloud.provider || "none",
  };

  const guidePath = path.join(runDir, "STEP_BY_STEP.md");
  writeText(guidePath, buildGuideMarkdown({ manifest: enriched, buckets: bucketSummary, runMeta }));

  const nextStepsPath = path.join(runDir, "NEXT_STEPS.md");
  writeText(nextStepsPath, [
    "# Next Steps",
    "",
    "1. Open STEP_BY_STEP.md.",
    "2. Review filing_worksheet.csv.",
    "3. Upload each batch zip from batches/.",
    "4. Store the final certificate PDFs in the same cloud folder as this package.",
    "",
  ].join("\n"));

  const report = {
    ok: true,
    run_id: runId,
    generated_at: runMeta.generated_at,
    client_name: runMeta.client_name,
    item_count: enriched.length,
    bucket_count: bucketSummary.length,
    buckets: bucketSummary,
  };
  writeJson(path.join(runDir, "run_report.json"), report);

  const packageEntries = [];
  function walk(dir, prefix = "") {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full, rel);
      else packageEntries.push({ name: rel.replace(/\\/g, "/"), data: fs.readFileSync(full), date: stat.mtime });
    }
  }
  walk(runDir);
  const packageZipPath = path.join(path.dirname(runDir), `${runId}_copyright_pack.zip`);
  writeZipFile(packageZipPath, packageEntries);

  const cloudReceipt = await maybeCloudSync({ zipPath: packageZipPath, provider: cloud.provider || "none", remoteRoot: cloud.remote_root, runMeta }).catch((err) => ({ provider: cloud.provider || "none", error: String(err?.message || err) }));
  writeJson(path.join(runDir, "cloud_receipt.json"), cloudReceipt);

  return {
    ...report,
    run_dir: runDir,
    package_zip_path: packageZipPath,
    package_zip_name: path.basename(packageZipPath),
    guide_path: guidePath,
    worksheet_path: worksheetPath,
    cloud: cloudReceipt,
  };
}
