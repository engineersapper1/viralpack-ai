export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@") || email.length > 254) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    // For v1: log it (shows in Vercel Function Logs)
    console.log("[WAITLIST]", email);

    // TODO later: store in Postgres/Supabase/Airtable/ConvertKit
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
}

