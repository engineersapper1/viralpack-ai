import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">Checkout canceled</div>
        <h1>No charge was made.</h1>
        <p className="muted">
          Your quiz result preview is still there. You can go back and unlock the full reading any time.
        </p>
      </section>

      <section className="card" style={{ maxWidth: 760, marginBottom: 28 }}>
        <div className="row">
          <Link href="/" className="btn">Back home</Link>
          <Link href="/studio" className="btn ghost">Open studio</Link>
        </div>
      </section>
    </main>
  );
}
