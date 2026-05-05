export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import fs from "fs";
import path from "path";
import { getRunsRoot } from "lib/vp_runs";

function resolveRunArtifacts(runId) {
  const runsRoot = getRunsRoot();
  const runDirs = fs.readdirSync(runsRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const dir of runDirs) {
    const packDir = path.join(runsRoot, dir.name, "copyright_pack");
    const reportPath = path.join(packDir, "run_report.json");
    if (!fs.existsSync(reportPath)) continue;
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      if (String(report.run_id) === String(runId)) {
        return {
          packageZip: path.join(runsRoot, dir.name, `${runId}_copyright_pack.zip`),
          guide: path.join(packDir, "STEP_BY_STEP.md"),
          worksheet: path.join(packDir, "filing_worksheet.csv"),
          report: reportPath,
        };
      }
    } catch {}
  }
  return null;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("run_id") || "";
    const kind = searchParams.get("kind") || "package";
    if (!runId) return new Response("Missing run_id", { status: 400 });

    const found = resolveRunArtifacts(runId);
    if (!found) return new Response("Run not found", { status: 404 });

    const selected = kind === "guide" ? found.guide : kind === "worksheet" ? found.worksheet : kind === "report" ? found.report : found.packageZip;
    if (!fs.existsSync(selected)) return new Response("File not found", { status: 404 });

    const stat = fs.statSync(selected);
    const ext = path.extname(selected).toLowerCase();
    const type = ext === ".zip" ? "application/zip" : ext === ".csv" ? "text/csv; charset=utf-8" : ext === ".json" ? "application/json" : "text/markdown; charset=utf-8";

    return new Response(fs.readFileSync(selected), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(stat.size),
        "Content-Disposition": `attachment; filename="${path.basename(selected)}"`,
      },
    });
  } catch (e) {
    return new Response(String(e?.message || e), { status: 500 });
  }
}
