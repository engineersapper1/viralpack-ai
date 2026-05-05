export const COOKIE_NAME = 'vpack_mailroom_session';
export const DEFAULT_BUCKET = process.env.SUPABASE_MAILROOM_BUCKET || 'mailroom-public-assets';
export const MAX_RECIPIENTS_PER_SEND = Number(process.env.MAILROOM_MAX_RECIPIENTS_PER_SEND || 100);
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
