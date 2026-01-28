export const dynamic = "force-dynamic";

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <img
            src="/logo.png"
            alt="ViralPack.ai"
            style={{ width: 38, height: 38, borderRadius: 10 }}
          />
          <div>
            <h1>ViralPack.ai</h1>
            <div className="badge">Public launch coming soon</div>
          </div>
        </div>

        <div className="navActions">
          <a className="btn" href="/generator">
            Beta access
          </a>
          <a className="btn btnPrimary" href="#waitlist">
            Join waitlist
          </a>
        </div>
      </div>

      <main className="hero">
        <div className="heroGrid heroGridLanding">
          <div className="card">
            <p className="kicker">FOR AGENCIES, LOCAL BUSINESSES, CREATORS</p>
            <h2 className="h1">Generate viral content packs in minutes.</h2>

            <p className="sub">
              Enter 5 details. Get an agency-ready pack: hooks, overlays, captions, and top hashtags.
              Built to be fast, specific, and shootable.
            </p>

            <div className="hr" />

            <div className="ctaRow">
              <a className="btn btnPrimary" href="/generator">
                Try the beta generator
              </a>
              <a className="btn" href="#example">
                See an example
              </a>
              <a className="btn" href="#how">
                How it works
              </a>
            </div>

            <p className="smallNote">
              Beta requires an access key. Public launch coming soon.
            </p>
          </div>

          <div className="card" id="example">
            <p className="kicker">EXAMPLE PACK PREVIEW</p>

            <div className="exampleBox">
              <div className="mono">
                <div style={{ fontWeight: 800, marginBottom: 8 }}>TOP HOOKS (5)</div>
                1. Stop scrolling if you want viral hooks on demand.
                {"\n"}2. What if AI could draft your next 10 short videos in 30 seconds?
                {"\n"}3. Tired of blank screens? Watch ViralPack build your first 3 seconds.
                {"\n"}4. The one tool that turns trends into scripts, fast.
                {"\n"}5. I tried ViralPack.ai, here’s what happened to my views.
                {"\n"}
                {"\n"}
                <div style={{ fontWeight: 800, marginBottom: 8 }}>ON-SCREEN OVERLAYS (5)</div>
                1. Generate 50+ hooks in seconds
                {"\n"}2. Trend-aware concepts, auto-updated
                {"\n"}3. For creators, agencies, small biz
                {"\n"}4. Join the early access waitlist
                {"\n"}5. ViralPack.ai
                {"\n"}
                {"\n"}
                <div style={{ fontWeight: 800, marginBottom: 8 }}>CAPTIONS (5)</div>
                1. Turn trends into scripts in minutes. Join the waitlist: https://viralpack.ai
                {"\n"}2. Creators + agencies: get AI hooks that convert. Early access: https://viralpack.ai
                {"\n"}3. Stop guessing your first 3 seconds. Waitlist: https://viralpack.ai
                {"\n"}4. From idea drought to post-ready in one click. https://viralpack.ai
                {"\n"}5. Trend-aware hooks for shorts. Join early access: https://viralpack.ai
                {"\n"}
                {"\n"}
                <div style={{ fontWeight: 800, marginBottom: 8 }}>HASHTAGS (5)</div>
                #AIHooks #CreatorTools #ViralShorts #EarlyAccessAI #ViralPackWaitlist
              </div>
            </div>
          </div>
        </div>

        <div className="card" id="how" style={{ marginTop: 14 }}>
          <p className="kicker">HOW IT WORKS</p>

          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
            <div className="stepRow">
              <div className="stepNum">1</div>
              <div>
                <div className="stepTitle">Enter 5 inputs</div>
                <div className="stepDesc">Brand, product, offer, website, market. Nothing else.</div>
              </div>
            </div>

            <div className="stepRow">
              <div className="stepNum">2</div>
              <div>
                <div className="stepTitle">Generate the pack</div>
                <div className="stepDesc">Trend-aware structure, creative execution, no fluff.</div>
              </div>
            </div>

            <div className="stepRow">
              <div className="stepNum">3</div>
              <div>
                <div className="stepTitle">Copy or export</div>
                <div className="stepDesc">Copy by bucket, export .txt, export JSON for reuse.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card" id="waitlist" style={{ marginTop: 14 }}>
          <p className="kicker">JOIN THE WAITLIST</p>
          <p className="sub" style={{ marginTop: 6 }}>
            Want access without the “key dance”? Drop your email and I’ll send you a beta key when you’re up.
          </p>

          {/* Placeholder UI only. Wire this to your /api/waitlist route if you want it live. */}
          <div className="hr" />

          <div className="waitlistRow">
            <input className="input" placeholder="you@company.com" />
            <button className="btn btnPrimary" type="button">
              Join waitlist
            </button>
          </div>

          <p className="smallNote">
            Tip: If you already have a beta key, go straight to the generator.
            {" "}
            <a href="/generator" style={{ color: "rgba(255,255,255,0.9)", textDecoration: "underline" }}>
              Open generator
            </a>
          </p>
        </div>
      </main>

      <footer className="footer">
        <div className="footerRow">
          <div>© {year} ViralPack.ai</div>
          <div className="mono">Landing</div>
        </div>
      </footer>
    </div>
  );
}
