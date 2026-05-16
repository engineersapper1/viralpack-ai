import crypto from 'crypto';
import { APP_URL } from '@/lib/constants';
import { BROOKE_CTA_URL, BROOKE_PUBLIC_LOCATION } from '@/lib/mailroomConfig';
import { escapeHtml, cleanString } from '@/lib/validators';

function removeEmDashes(value = '') {
  return String(value || '').replace(/\u2014/g, ',');
}

function stripForbiddenAddress(value = '') {
  return removeEmDashes(String(value || ''))
    .replace(/10263\s+Gandy\s+Blvd\s+N\s+#116,?\s*/gi, '')
    .replace(/\b33702\b/g, '')
    .replace(/St\.\s*Petersburg,?\s*FL,?\s*,?\s*US/gi, BROOKE_PUBLIC_LOCATION)
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function hmac(value) {
  return crypto.createHmac('sha256', process.env.AUTH_SECRET || 'missing-secret').update(value).digest('base64url');
}

export function createUnsubscribeToken(profileId, email) {
  const body = Buffer.from(JSON.stringify({ profileId, email, iat: Date.now() })).toString('base64url');
  return `${body}.${hmac(body)}`;
}

export function verifyUnsubscribeToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (sig !== hmac(body)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

function publicLocation() {
  return BROOKE_PUBLIC_LOCATION;
}

export function personalize(text, contact = {}) {
  const first = contact.first_name || contact.full_name?.split(' ')?.[0] || '';
  return stripForbiddenAddress(text)
    .replaceAll('{{first_name}}', first)
    .replaceAll('{{name}}', contact.full_name || first || '')
    .replaceAll('{{email}}', contact.email || '');
}

function color(value, fallback) {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

function imageBlock(images = []) {
  if (!images.length) return '';
  const first = images[0];
  const extra = images.slice(1, 3);
  const extraHtml = extra.length
    ? `<tr><td style="padding:0 28px 24px 28px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${extra.map((url) => `<td width="50%" style="padding:0 6px;"><img src="${escapeHtml(url)}" alt="" style="width:100%;height:180px;object-fit:cover;border-radius:18px;display:block;" /></td>`).join('')}</tr></table></td></tr>`
    : '';
  return `
    <tr><td style="padding:0 28px 18px 28px;"><img src="${escapeHtml(first)}" alt="" style="width:100%;max-width:584px;border-radius:22px;display:block;" /></td></tr>
    ${extraHtml}`;
}

export function renderCampaignHtml({ campaign, profile, contact = {}, unsubscribeUrl = '' }) {
  const safeCampaign = stripForbiddenAddress(JSON.stringify(campaign || {}));
  const parsedCampaign = JSON.parse(safeCampaign || '{}');
  const design = parsedCampaign.design || {};
  const primary = color(design.primary_color, '#111111');
  const accent = color(design.accent_color, '#A8754F');
  const background = color(design.background_color, '#F8F6F0');
  const fontFamily = stripForbiddenAddress(design.font_family || 'Arial, Helvetica, sans-serif');
  const paragraphs = Array.isArray(parsedCampaign.body_paragraphs) ? parsedCampaign.body_paragraphs : [parsedCampaign.plain_text || ''];
  const images = Array.isArray(parsedCampaign.asset_urls) ? parsedCampaign.asset_urls.slice(0, 3) : [];
  const ctaUrl = BROOKE_CTA_URL;
  const ctaLabel = stripForbiddenAddress(parsedCampaign.cta_label || 'Book now');
  const unsubscribe = unsubscribeUrl || `${APP_URL}/unsubscribe`;

  const paragraphHtml = paragraphs
    .map((paragraph) => personalize(paragraph, contact))
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 16px 0;color:#252525;font-size:16px;line-height:1.62;">${escapeHtml(paragraph)}</p>`)
    .join('');

  const html = `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${escapeHtml(background)};font-family:${escapeHtml(fontFamily)};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(stripForbiddenAddress(parsedCampaign.preview_text || ''))}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${escapeHtml(background)};padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);">
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${escapeHtml(accent)};font-weight:700;">${escapeHtml(profile.business_name || 'Made You Brooke')}</div>
                <h1 style="margin:12px 0 14px 0;color:${escapeHtml(primary)};font-size:30px;line-height:1.12;">${escapeHtml(personalize(parsedCampaign.headline || parsedCampaign.selected_subject || '', contact))}</h1>
              </td>
            </tr>
            ${imageBlock(images)}
            <tr>
              <td style="padding:8px 28px 30px 28px;">
                ${paragraphHtml}
                <div style="margin-top:24px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${escapeHtml(primary)};color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:700;">${escapeHtml(ctaLabel)}</a></div>
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;">
            <tr>
              <td style="padding:18px 18px 0 18px;text-align:center;color:#777777;font-size:12px;line-height:1.6;">
                <div>${escapeHtml(publicLocation())}</div>
                <div style="margin-top:10px;">You are receiving this because you signed up for updates or are a customer of ${escapeHtml(profile.business_name || 'Made You Brooke')}.</div>
                <div style="margin-top:10px;"><a href="${escapeHtml(unsubscribe)}" style="color:#777777;text-decoration:underline;">Unsubscribe</a></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return stripForbiddenAddress(html);
}

export function renderPlainText({ campaign, profile, contact = {}, unsubscribeUrl = '' }) {
  const safeCampaign = stripForbiddenAddress(JSON.stringify(campaign || {}));
  const parsedCampaign = JSON.parse(safeCampaign || '{}');
  const lines = [];
  if (parsedCampaign.headline) lines.push(personalize(parsedCampaign.headline, contact));
  const paragraphs = Array.isArray(parsedCampaign.body_paragraphs) ? parsedCampaign.body_paragraphs : [parsedCampaign.plain_text || ''];
  paragraphs.forEach((paragraph) => lines.push(personalize(cleanString(paragraph, 2000), contact)));
  lines.push(`${parsedCampaign.cta_label || 'Book now'}: ${BROOKE_CTA_URL}`);
  lines.push('');
  lines.push(`${profile.business_name || 'Made You Brooke'}`);
  lines.push(publicLocation());
  lines.push(`Unsubscribe: ${unsubscribeUrl || `${APP_URL}/unsubscribe`}`);
  return stripForbiddenAddress(lines.filter(Boolean).join('\n\n'));
}
