import * as XLSX from 'xlsx';
import { isValidEmail, normalizeEmail, cleanString } from '@/lib/validators';

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function pickColumn(headers, candidates) {
  return headers.find((header) => candidates.includes(header)) || headers.find((header) => candidates.some((candidate) => header.includes(candidate))) || '';
}

function splitName(fullName) {
  const parts = cleanString(fullName, 200).split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export function parseContactWorkbook(buffer, filename = 'contacts.xlsx') {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) throw new Error('No sheet found in uploaded file.');

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });
  return normalizeContactRows(rows, { filename, sheet: firstSheet });
}

export function parseContactCsvText(text, filename = 'contacts.csv') {
  const workbook = XLSX.read(text, { type: 'string' });
  const firstSheet = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheet], { defval: '', raw: false });
  return normalizeContactRows(rows, { filename, sheet: firstSheet });
}

export function normalizeContactRows(rows, meta = {}) {
  if (!Array.isArray(rows) || !rows.length) {
    return { contacts: [], rejected: [], summary: { totalRows: 0, valid: 0, rejected: 0, duplicates: 0 }, columns: {} };
  }

  const originalHeaders = Object.keys(rows[0] || {});
  const headerMap = Object.fromEntries(originalHeaders.map((header) => [normalizeHeader(header), header]));
  const headers = Object.keys(headerMap);

  const emailHeader = pickColumn(headers, ['email', 'email_address', 'e_mail', 'client_email']);
  const firstHeader = pickColumn(headers, ['first_name', 'firstname', 'first']);
  const lastHeader = pickColumn(headers, ['last_name', 'lastname', 'last']);
  const fullNameHeader = pickColumn(headers, ['name', 'full_name', 'client_name', 'customer_name']);
  const tagsHeader = pickColumn(headers, ['tags', 'tag', 'segment']);

  if (!emailHeader) {
    throw new Error('Could not find an email column. Use a header like email, email_address, or e-mail.');
  }

  const seen = new Set();
  const contacts = [];
  const rejected = [];
  let duplicates = 0;

  rows.forEach((row, index) => {
    const get = (normalizedHeader) => row[headerMap[normalizedHeader]] ?? '';
    const email = normalizeEmail(get(emailHeader));

    if (!isValidEmail(email)) {
      rejected.push({ row: index + 2, reason: 'Invalid or missing email', raw: row });
      return;
    }

    if (seen.has(email)) {
      duplicates += 1;
      rejected.push({ row: index + 2, reason: 'Duplicate email in upload', email, raw: row });
      return;
    }
    seen.add(email);

    let first_name = firstHeader ? cleanString(get(firstHeader), 100) : '';
    let last_name = lastHeader ? cleanString(get(lastHeader), 100) : '';
    const full_name = fullNameHeader ? cleanString(get(fullNameHeader), 200) : [first_name, last_name].filter(Boolean).join(' ');

    if ((!first_name || !last_name) && full_name) {
      const split = splitName(full_name);
      first_name = first_name || split.first_name;
      last_name = last_name || split.last_name;
    }

    const tags = tagsHeader
      ? String(get(tagsHeader)).split(',').map((tag) => cleanString(tag, 50)).filter(Boolean)
      : [];

    contacts.push({
      email,
      first_name,
      last_name,
      full_name: full_name || [first_name, last_name].filter(Boolean).join(' '),
      tags,
      raw: row
    });
  });

  return {
    contacts,
    rejected,
    summary: { totalRows: rows.length, valid: contacts.length, rejected: rejected.length, duplicates },
    columns: {
      email: headerMap[emailHeader],
      first_name: firstHeader ? headerMap[firstHeader] : '',
      last_name: lastHeader ? headerMap[lastHeader] : '',
      full_name: fullNameHeader ? headerMap[fullNameHeader] : '',
      tags: tagsHeader ? headerMap[tagsHeader] : ''
    },
    meta
  };
}

export function googleSheetsExportUrl(url) {
  const parsed = new URL(url);
  const match = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!match) return url;
  const id = match[1];
  const gid = parsed.searchParams.get('gid') || '0';
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}
