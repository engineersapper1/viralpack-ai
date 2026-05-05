export function cleanString(value, max = 1000) {
  return String(value || '').trim().slice(0, max);
}

export function cleanUrl(value) {
  const raw = cleanString(value, 2048);
  if (!raw) return '';
  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function senderDomain(senderEmail) {
  const email = normalizeEmail(senderEmail);
  return email.includes('@') ? email.split('@').pop() : '';
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
