import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    app: 'ViralPack Client Mailroom',
    env: {
      hasOpenAI: Boolean(process.env.OPENAI_API_KEY),
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      hasResend: Boolean(process.env.RESEND_API_KEY),
      hasAuthSecret: Boolean(process.env.AUTH_SECRET),
      hasUsers: Boolean(process.env.MAILROOM_USERS_JSON)
    }
  });
}
