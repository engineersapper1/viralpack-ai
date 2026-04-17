import ShareActions from "@/app/components/ShareActions";
import { getSession } from "@/lib/quiz_store";

function SectionCard({ title, children }) {
  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <h2>{title}</h2>
      <div style={{ marginTop: 10 }}>{children}</div>
    </section>
  );
}

export default async function ResultPage({ params }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) {
    return (
      <main className="shell">
        <section className="hero">
          <h1>Result not found</h1>
          <p className="muted">
            This reading could not be found. The session may not exist or may have expired.
          </p>
        </section>
      </main>
    );
  }

  if (!session.unlocked) {
    return (
      <main className="shell">
        <section className="hero">
          <h1>Result locked</h1>
          <p className="muted">This result has not been unlocked yet.</p>
        </section>
      </main>
    );
  }

  const premium = session.premium || {};
  const primary = session.primary_archetype || "Your pattern";

  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">Full reading</div>
        <h1>{premium.headline || primary}</h1>
        <p>
          {premium.opening || "You unlocked the full reading for your dominant pattern."}
        </p>
      </section>

      <section className="grid" style={{ marginBottom: 28 }}>
        <div className="card" style={{ gridColumn: "span 8" }}>
          <div className="resultHeroCard">
            <div className="resultHeroEyebrow">Your dominant pattern</div>
            <h2 style={{ marginTop: 8 }}>{premium.headline || primary}</h2>
            <p style={{ marginTop: 12 }}>
              {premium.body || "This is where the full reading will appear."}
            </p>
          </div>
        </div>

        <div className="card" style={{ gridColumn: "span 4" }}>
          <h2>Reading summary</h2>
          <div className="resultBullets">
            <div className="resultBullet">
              <strong>Primary pattern</strong>
              <span>{primary}</span>
            </div>
            <div className="resultBullet">
              <strong>Unlocked</strong>
              <span>
                {session.unlocked_at ? new Date(session.unlocked_at).toLocaleString() : "Yes"}
              </span>
            </div>
            <div className="resultBullet">
              <strong>Shareable link</strong>
              <span>This page can be shared directly.</span>
            </div>
          </div>

          <ShareActions
            title={premium.headline || primary}
            text={`I unlocked my psychology reading: ${premium.headline || primary}`}
          />
        </div>
      </section>

      <SectionCard title="What this usually means">
        <p>
          This pattern is less about a label and more about the way your mind tends to organize uncertainty,
          emotion, and meaning. It is the style underneath the moment, the thing that keeps showing up even
          when the surface details change.
        </p>
      </SectionCard>

      <SectionCard title="Where it helps you">
        <p>
          Patterns like this often come with unusual sensitivity, fast internal processing, and a strong instinct
          for what feels unfinished. In the right environment, that becomes clarity, intuition, and better pattern recognition.
        </p>
      </SectionCard>

      <SectionCard title="Where it can quietly drain you">
        <p>
          The same trait that helps you notice more can also make it harder to switch off. A strong internal pattern becomes
          heavy when it never gets to land, close, or breathe.
        </p>
      </SectionCard>

      <SectionCard title="A better way to hold it">
        <p>
          The goal is not to become less yourself. The goal is to understand the pattern well enough that it stops running
          the room by itself. Once it has a name, it tends to feel smaller, cleaner, and easier to work with.
        </p>
      </SectionCard>
    </main>
  );
}
