import crypto from 'crypto';
import { APP_URL } from '@/lib/constants';
import { BROOKE_PUBLIC_LOCATION, BROOKE_CTA_URL } from '@/lib/mailroomConfig';
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

function publicLocation() {
  // Deliberately do not render street address, suite, ZIP, or stored compliance fields.
  // Made You Brooke requested public footer location only.
  return BROOKE_PUBLIC_LOCATION;
}

export function personalize(text, contact = {}) {
  const first = contact.first_name || contact.full_name?.split(' ')?.[0] || '';
  return String(text || '')
    .replaceAll('{{first_name}}', first)
    .replaceAll('{{name}}', contact.full_name || first || '')
    .replaceAll('{{email}}', contact.email || '');
}

function safeColor(value, fallback) {
  const color = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function fontStack(font = '') {
  const normalized = String(font || '').toLowerCase();
  if (normalized.includes('georgia') || normalized.includes('serif')) return 'Georgia,Times,serif';
  if (normalized.includes('courier') || normalized.includes('mono')) return 'Courier New,Courier,monospace';
  return 'Arial,Helvetica,sans-serif';
}

function imageBlocks(campaign) {
  const images = Array.isArray(campaign.asset_urls) ? campaign.asset_urls.filter(Boolean).slice(0, 5) : [];
  if (!images.length) return '';

  const strategy = campaign.image_strategy || {};
  const heroIndex = Number.isInteger(strategy.hero_image_index) ? strategy.hero_image_index : 0;
  const hero = images[heroIndex] || images[0];
  const rest = images.filter((url) => url !== hero).slice(0, 4);

  const heroHtml = hero ? `
    <tr>
      <td style="padding:0 28px 18px 28px;">
        <img src="${escapeHtml(hero)}" alt="Made You Brooke campaign image" style="width:100%;max-width:584px;border-radius:22px;display:block;border:0;object-fit:cover;" />
      </td>
    </tr>` : '';

  if (!rest.length) return heroHtml;

  const gallery = rest.map((url) => `
    <td width="50%" style="padding:6px;">
      <img src="${escapeHtml(url)}" alt="Made You Brooke campaign image" style="width:100%;border-radius:16px;display:block;border:0;object-fit:cover;" />
    </td>`).join('');

  return `${heroHtml}
    <tr>
      <td style="padding:0 22px 18px 22px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>${gallery}</tr></table>
      </td>
    </tr>`;
}

export function renderCampaignHtml({ campaign, profile, contact = {}, unsubscribeUrl = '' }) {
  const design = campaign.design || {};
  const typography = campaign.typography || {};
  const layout = campaign.layout || {};
  const primary = safeColor(design.primary_color, '#1C1B1A');
  const accent = safeColor(design.accent_color, '#9A6A43');
  const background = safeColor(design.background_color, '#F8F3EC');
  const cardBackground = safeColor(design.card_background_color, '#FFFFFF');
  const bodyText = safeColor(design.body_text_color, '#2A2724');
  const muted = safeColor(design.muted_text_color, '#77716A');
  const font = fontStack(typography.body_font || design.font_family);
  const headingFont = fontStack(typography.heading_font || typography.body_font || design.font_family);
  const borderRadius = cleanString(layout.border_radius || '26px', 16) || '26px';
  const paragraphs = Array.isArray(campaign.body_paragraphs) ? campaign.body_paragraphs : [campaign.plain_text || ''];
  const ctaUrl = campaign.cta_url || profile.brand_profile?.contact_url || profile.contact_url || BROOKE_CTA_URL;
  const ctaLabel = campaign.cta_label || 'Get in touch';
  const unsubscribe = unsubscribeUrl || `${APP_URL}/unsubscribe`;
  const location = publicLocation(profile);
  const imageHtml = imageBlocks(campaign);

  const paragraphHtml = paragraphs
    .map((paragraph) => personalize(paragraph, contact))
    .filter(Boolean)
    .map((paragraph) => `<p style="margin:0 0 16px 0;color:${escapeHtml(bodyText)};font-size:16px;line-height:1.68;">${escapeHtml(paragraph)}</p>`)
    .join('');

  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body style="margin:0;padding:0;background:${escapeHtml(background)};font-family:${font};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(campaign.preview_text || '')}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${escapeHtml(background)};padding:30px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:650px;background:${escapeHtml(cardBackground)};border-radius:${escapeHtml(borderRadius)};overflow:hidden;border:1px solid rgba(0,0,0,0.08);box-shadow:0 14px 42px rgba(40,25,15,0.09);">
            <tr>
              <td style="padding:30px 30px 10px 30px;">
                <div style="font-size:12px;letter-spacing:0.10em;text-transform:uppercase;color:${escapeHtml(accent)};font-weight:700;">${escapeHtml(profile.business_name || 'Made You Brooke')}</div>
                <h1 style="margin:12px 0 14px 0;color:${escapeHtml(primary)};font-family:${headingFont};font-size:31px;line-height:1.12;letter-spacing:-0.02em;">${escapeHtml(personalize(campaign.headline || campaign.selected_subject || '', contact))}</h1>
              </td>
            </tr>
            ${imageHtml}
            <tr>
              <td style="padding:8px 30px 32px 30px;">
                ${paragraphHtml}
                ${ctaUrl ? `<div style="margin-top:25px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${escapeHtml(primary)};color:#ffffff;text-decoration:none;border-radius:999px;padding:13px 22px;font-weight:700;">${escapeHtml(ctaLabel)}</a></div>` : ''}
              </td>
            </tr>
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:650px;">
            <tr>
              <td style="padding:18px 18px 0 18px;text-align:center;color:${escapeHtml(muted)};font-size:12px;line-height:1.65;">
                <div>${escapeHtml(location)}</div>
                <div style="margin-top:10px;">You are receiving this because you signed up for updates or are a customer of ${escapeHtml(profile.business_name || 'Made You Brooke')}.</div>
                <div style="margin-top:10px;"><a href="${escapeHtml(unsubscribe)}" style="color:${escapeHtml(muted)};text-decoration:underline;">Unsubscribe</a></div>
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
  const cta = campaign.cta_url || profile.brand_profile?.contact_url || BROOKE_CTA_URL;
  if (cta) lines.push(`${campaign.cta_label || 'Get in touch'}: ${cta}`);
  lines.push('');
  lines.push(`${profile.business_name || 'Made You Brooke'}`);
  lines.push(publicLocation(profile));
  lines.push(`Unsubscribe: ${unsubscribeUrl || `${APP_URL}/unsubscribe`}`);
  return lines.filter(Boolean).join('\n\n');
}
