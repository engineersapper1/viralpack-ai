import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function StudioPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("vp_beta")) redirect("/");

  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">Studio</div>
        <h1>Pack workflow</h1>
        <p>
          ViralPack now forges OracleLoom quiz packs. Use Generator to create a pack, then drag that whole pack folder into
          Oracle Loom\content\packs\ inside your local OracleLoom repo. Push OracleLoom after you verify the new tile locally.
        </p>
        <div className="pre" style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
{`1. Generate a pack in /generator
2. Open ViralPack V3\\vp_runs\\<run_id>\\<pack_slug>\\
3. Drag that whole folder into Oracle Loom\\content\\packs\\
4. Run OracleLoom locally and confirm the new tile appears on /
5. git add . && git commit -m "add quiz pack" && git push`}
        </div>
      </section>
    </main>
  );
}
