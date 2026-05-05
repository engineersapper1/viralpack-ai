import { NextResponse } from 'next/server';
import { verifyUnsubscribeToken } from '@/lib/emailRenderer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { normalizeEmail } from '@/lib/validators';

export const runtime = 'nodejs';

async function unsubscribeFromRequest(request) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const decoded = verifyUnsubscribeToken(token);
  if (!decoded?.profileId || !decoded?.email) {
    return { ok: false, message: 'Invalid unsubscribe link.' };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('mailroom_suppression').upsert({
    profile_id: decoded.profileId,
    email: normalizeEmail(decoded.email),
    reason: 'unsubscribe',
    created_at: new Date().toISOString()
  }, { onConflict: 'profile_id,email' });

  if (error) throw error;
  return { ok: true, message: `${decoded.email} has been unsubscribed.` };
}

export async function GET(request) {
  try {
    const result = await unsubscribeFromRequest(request);
    return new NextResponse(`<!doctype html><html><body style="font-family:Arial;padding:40px;background:#f8f6f0;"><main style="max-width:560px;margin:auto;background:white;border-radius:24px;padding:32px;"><h1>${result.ok ? 'Unsubscribed' : 'Could not unsubscribe'}</h1><p>${result.message}</p></main></body></html>`, {
      status: result.ok ? 200 : 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const result = await unsubscribeFromRequest(request);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
