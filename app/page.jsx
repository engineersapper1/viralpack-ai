import Link from "next/link";

export default function HomePage() {
  return (
    <main className="vp-home">
      <section className="container">
        <nav className="vp-nav">
          <div>
            <p className="kicker">ViralPack.ai</p>
            <h1 className="vp-title">Campaign engines for small businesses</h1>
          </div>
          <Link className="btn" href="/mailroom">
            Open Client Mailroom
          </Link>
        </nav>

        <section className="vp-hero-grid">
          <div className="card vp-hero-card">
            <p className="kicker">New beta room</p>
            <h2>Client Mailroom</h2>
            <p className="sub">
              Upload a client contact sheet, generate a clean branded email, preview it,
              send yourself a test, then send to the list with a consent gate and
              unsubscribe handling baked in.
            </p>
            <div className="row">
              <Link className="btn" href="/mailroom">
                Launch the room
              </Link>
              <Link className="btn secondary" href="/login?next=/mailroom">
                Beta login
              </Link>
            </div>
          </div>

          <div className="vp-feature-stack">
            <Feature
              title="Manual polish"
              body="The client writes the message and uploads images. OpenAI arranges it into a concise, native-sounding email."
            />
            <Feature
              title="One-click campaign"
              body="Enter the website URL and campaign theme. The system studies the client’s voice, colors, and services, then drafts the email."
            />
            <Feature
              title="Send official"
              body="Use the client’s verified domain through Resend so the email comes from the business, not a random robot cave."
            />
          </div>
        </section>
      </section>
    </main>
  );
}

function Feature({ title, body }) {
  return (
    <article className="card vp-feature-card">
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}
