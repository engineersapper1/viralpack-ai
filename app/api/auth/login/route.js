import { NextResponse } from 'next/server';
import { COOKIE_NAME } from '@/lib/constants';
import { createSessionToken, verifyLogin } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const body = await request.json();
    const user = await verifyLogin(body.username, body.password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
    }

    const token = createSessionToken(user);
    const next = String(body.next || '/mailroom').startsWith('/') ? String(body.next || '/mailroom') : '/mailroom';
    const response = NextResponse.json({ ok: true, next });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Login failed.' }, { status: 500 });
  }
}
