import crypto from 'crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { COOKIE_NAME } from '@/lib/constants';

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set to at least 32 characters.');
  }
  return secret;
}

function parseUsers() {
  const raw = process.env.MAILROOM_USERS_JSON || '[]';
  try {
    const users = JSON.parse(raw);
    if (!Array.isArray(users)) return [];
    return users;
  } catch {
    return [];
  }
}

export async function verifyLogin(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const users = parseUsers();
  const user = users.find((item) => String(item.username || '').toLowerCase() === cleanUsername);
  if (!user || !user.password_hash) return null;

  const ok = await bcrypt.compare(String(password || ''), user.password_hash);
  if (!ok) return null;

  return {
    username: cleanUsername,
    userKey: cleanUsername,
    role: user.role || 'client',
    displayName: user.display_name || cleanUsername
  };
}

function hmac(body) {
  return crypto.createHmac('sha256', getAuthSecret()).update(body).digest('base64url');
}

export function createSessionToken(session) {
  const payload = {
    ...session,
    iat: Date.now(),
    exp: Date.now() + 1000 * 60 * 60 * 12
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${hmac(body)}`;
}

export function verifySessionToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = hmac(body);
  const sigBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function getSessionFromRequest(request) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function isAdmin(session) {
  return session?.role === 'admin';
}
