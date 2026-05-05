import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { createContactList } from '@/lib/mailroomDb';
import { googleSheetsExportUrl, parseContactCsvText, parseContactWorkbook } from '@/lib/contactParser';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await request.formData();
    const listName = String(form.get('listName') || '').trim();
    const sheetUrl = String(form.get('sheetUrl') || '').trim();
    const file = form.get('file');

    let parsed;
    let source;

    if (sheetUrl) {
      const exportUrl = googleSheetsExportUrl(sheetUrl);
      const response = await fetch(exportUrl, { headers: { 'User-Agent': 'ViralPackClientMailroom/0.1' } });
      if (!response.ok) throw new Error(`Could not fetch Google Sheet/CSV URL. Status ${response.status}. Make sure it is shared or published.`);
      const text = await response.text();
      parsed = parseContactCsvText(text, 'google-sheet.csv');
      source = { kind: 'google_sheet_url', url: sheetUrl, notes: { exportUrl } };
    } else if (file && typeof file.arrayBuffer === 'function') {
      const filename = file.name || 'contacts';
      const buffer = Buffer.from(await file.arrayBuffer());
      parsed = parseContactWorkbook(buffer, filename);
      source = { kind: 'file_upload', filename };
    } else {
      return NextResponse.json({ error: 'Upload a CSV/XLSX file or paste a Google Sheets URL.' }, { status: 400 });
    }

    const result = await createContactList(session, {
      name: listName || source.filename || 'Imported contacts',
      contacts: parsed.contacts,
      rejected: parsed.rejected,
      source: { ...source, notes: { ...(source.notes || {}), columns: parsed.columns, summary: parsed.summary } }
    });

    return NextResponse.json({ ...result, summary: parsed.summary, columns: parsed.columns });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
