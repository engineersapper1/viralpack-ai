import crypto from 'crypto';
import { APP_URL } from '@/lib/constants';
import { escapeHtml, cleanString } from '@/lib/validators';

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

function businessAddress(profile) {
  return [
    profile.address_line1,
    profile.address_line2,
    [profile.city, profile.state, profile.postal_code].filter(Boolean).join(', '),
    profile.country
  ].filter(Boolean).join('<br />');
}

export function personalize(text, contact = {}) {
  const first = contact.first_name || contact.full_name?.split(' ')?.[0] || '';
  return String(text || '')
    .replaceAll('{{first_name}}', first)
    .replaceAll('{{name}}', contact.full_name || first || '')
    .replaceAll('{{email}}', contact.email || '');
}

export function renderCampaignHtml({ campaign, profile, contact = {}, unsubscribeUrl = '' }) {
  const design = campaign.design || {};
  const primary = design.primary_color || '#111111';
  const accent = design.accent_color || '#D7A84F';
  const background = design.background_color || '#F8F6F0';
  const paragraphs = Array.isArray(campaign.body_paragraphs) ? campaign.body_paragraphs : [campaign.plain_text || ''];
  const images = Array.isArray(campaign.asset_urls) ? campaign.asset_urls.slice(0, 3) : [];
  const ctaUrl = campaign.cta_url || profile.website_url || '';
  const ctaLabel = campaign.cta_label || 'Book now';

  const imageHtml = images.map((url) => `
    <tr><td style="padding:0 0 18px 0;"><img src="${escapeHtml(url)}" alt="" style="width:100%;max-width:600px;border-radius:18px;display:block;" /></td></tr>
  `).join('');

  const paragraphHtml = paragraphs
    .map((paragraph) => personalize(paragraph, contact))
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 16px 0;color:#252525;font-size:16px;line-height:1.62;">${escapeHtml(paragraph)}</p>`)
    .join('');

  const unsubscribe = unsubscribeUrl || `${APP_URL}/unsubscribe`;

  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${escapeHtml(background)};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(campaign.preview_text || '')}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${escapeHtml(background)};padding:28px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,0.08);">
            <tr>
              <td style="padding:28px 28px 8px 28px;">
                <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:${escapeHtml(accent)};font-weight:700;">${escapeHtml(profile.business_name || '')}</div>
                <h1 style="margin:12px 0 14px 0;color:${escapeHtml(primary)};font-size:30px;line-height:1.12;">${escapeHtml(personalize(campaign.headline || campaign.selected_subject || '', contact))}</h1>
              </td>
            </tr>
            ${imageHtml}
            <tr>
              <td style="padding:8px 28px 30px 28px;">
                ${paragraphHtml}
                ${ctaUrl ? `<div style="margin-top:24px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${escapeHtml(primary)};color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:700;">${escapeHtml(ctaLabel)}</a></div>` : ''}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;">
            <tr>
              <td style="padding:18px 18px 0 18px;text-align:center;color:#777777;font-size:12px;line-height:1.6;">
                <div>${businessAddress(profile)}</div>
                <div style="margin-top:10px;">You are receiving this because you signed up for updates or are a customer of ${escapeHtml(profile.business_name || 'this business')}.</div>
                <div style="margin-top:10px;"><a href="${escapeHtml(unsubscribe)}" style="color:#777777;text-decoration:underline;">Unsubscribe</a></div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function renderPlainText({ campaign, profile, contact = {}, unsubscribeUrl = '' }) {
  const lines = [];
  if (campaign.headline) lines.push(personalize(campaign.headline, contact));
  const paragraphs = Array.isArray(campaign.body_paragraphs) ? campaign.body_paragraphs : [campaign.plain_text || ''];
  paragraphs.forEach((paragraph) => lines.push(personalize(cleanString(paragraph, 2000), contact)));
  if (campaign.cta_url) lines.push(`${campaign.cta_label || 'Book now'}: ${campaign.cta_url}`);
  lines.push('');
  lines.push(`${profile.business_name || ''}`);
  lines.push([profile.address_line1, profile.address_line2, profile.city, profile.state, profile.postal_code, profile.country].filter(Boolean).join(', '));
  lines.push(`Unsubscribe: ${unsubscribeUrl || `${APP_URL}/unsubscribe`}`);
  return lines.filter(Boolean).join('\n\n');
}
