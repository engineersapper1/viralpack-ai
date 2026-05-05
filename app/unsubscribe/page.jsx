export default function UnsubscribePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fog px-6 py-10">
      <section className="mailroom-card max-w-lg p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.35em] text-black/45">Client Mailroom</p>
        <h1 className="mt-4 text-4xl font-black">Unsubscribe</h1>
        <p className="mt-4 leading-7 text-black/65">
          Email unsubscribe links are handled by the secure campaign link in each email. If you landed here directly, use the unsubscribe link from the message you received.
        </p>
      </section>
    </main>
  );
}
