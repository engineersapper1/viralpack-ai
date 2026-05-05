import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff6db,transparent_35%),linear-gradient(135deg,#f8f6f0,#ece7dc)] px-6 py-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-12">
        <nav className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-black/50">ViralPack.ai</p>
            <h1 className="mt-2 text-2xl font-black">Campaign engines for small businesses</h1>
          </div>
          <Link className="mailroom-button" href="/mailroom">Open Client Mailroom</Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="mailroom-card p-8 md:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-brass">New beta room</p>
            <h2 className="mt-5 text-5xl font-black leading-[0.95] md:text-7xl">Client Mailroom</h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-black/70">
              Upload a client contact sheet, generate a clean branded email, preview it, send yourself a test, then send to the list with a consent gate and unsubscribe handling baked in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="mailroom-button" href="/mailroom">Launch the room</Link>
              <Link className="mailroom-button-secondary" href="/login?next=/mailroom">Beta login</Link>
            </div>
          </div>

          <div className="grid gap-4">
            {[
              ['Manual polish', 'The client writes the message and uploads images. OpenAI arranges it into a concise, native-sounding email.'],
              ['One-click campaign', 'Enter the website URL and campaign theme. The system studies the client’s voice, colors, and services, then drafts the email.'],
              ['Send official', 'Use the client’s verified domain through Resend so the email comes from the business, not a random robot cave.']
            ].map(([title, body]) => (
              <div key={title} className="mailroom-card p-6">
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-2 leading-7 text-black/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
