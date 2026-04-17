export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment Successful | ViralPack",
  description: "Your payment was successful.",
};

export default async function CheckoutSuccessPage({ searchParams }) {
  const params = await searchParams;
  const sessionId =
    typeof params?.session_id === "string" ? params.session_id : null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(99,102,241,0.18), transparent 35%), #0b1020",
        color: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "720px",
          background: "rgba(15, 23, 42, 0.88)",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "999px",
            background: "rgba(34, 197, 94, 0.18)",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            fontSize: "28px",
            marginBottom: "20px",
          }}
        >
          ✓
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "36px",
            lineHeight: 1.1,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          Payment successful
        </h1>

        <p
          style={{
            marginTop: "14px",
            fontSize: "18px",
            lineHeight: 1.6,
            color: "rgba(226, 232, 240, 0.9)",
          }}
        >
          Your order went through successfully. Your premium result or unlock
          should now be available.
        </p>

        {sessionId ? (
          <div
            style={{
              marginTop: "20px",
              padding: "14px 16px",
              borderRadius: "14px",
              background: "rgba(30, 41, 59, 0.9)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "rgba(148, 163, 184, 0.9)",
                marginBottom: "6px",
              }}
            >
              Session ID
            </div>
            <div
              style={{
                fontSize: "14px",
                wordBreak: "break-all",
                color: "#e2e8f0",
              }}
            >
              {sessionId}
            </div>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "28px",
          }}
        >
          <a
            href="/"
            style={{
              textDecoration: "none",
              background: "#6366f1",
              color: "#ffffff",
              padding: "12px 18px",
              borderRadius: "12px",
              fontWeight: 700,
            }}
          >
            Back to Home
          </a>

          <a
            href="/studio"
            style={{
              textDecoration: "none",
              background: "transparent",
              color: "#e2e8f0",
              padding: "12px 18px",
              borderRadius: "12px",
              fontWeight: 700,
              border: "1px solid rgba(148, 163, 184, 0.25)",
            }}
          >
            Go to Studio
          </a>
        </div>
      </section>
    </main>
  );
}