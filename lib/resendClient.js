import { Resend } from 'resend';

let cached = null;

export function getResendClient() {
  if (cached) return cached;
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is missing.');
  }
  cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}

export function formatSender(profile) {
  if (profile?.sender_name && profile?.sender_email) {
    return `${profile.sender_name} <${profile.sender_email}>`;
  }
  return process.env.RESEND_DEFAULT_FROM;
}
