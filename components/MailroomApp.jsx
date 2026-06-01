'use client';

import { useEffect, useMemo, useState } from 'react';

const BROOKE_CTA_URL = 'https://www.madeyoubrookephoto.com/';

const BROOKE_PROFILE = {
  display_name: 'Made You Brooke',
  business_name: 'Made You Brooke',
  website_url: 'https://www.madeyoubrookephoto.com/',
  sender_name: 'Made You Brooke',
  sender_email: 'hello@madeyoubrookephoto.com',
  reply_to_email: 'hello@madeyoubrookephoto.com',
  sending_domain: 'madeyoubrookephoto.com',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'US'
};

const emptyProfile = { ...BROOKE_PROFILE };

const initialCampaignForm = {
  mode: 'manual',
  theme: '',
  manualMessage: '',
  offer: '',
  ctaUrl: BROOKE_CTA_URL
};

function normalizeBrookeProfile(raw = {}) {
  return {
    ...emptyProfile,
    ...raw,
    display_name: BROOKE_PROFILE.display_name,
    business_name: BROOKE_PROFILE.business_name,
    website_url: BROOKE_PROFILE.website_url,
    sender_name: BROOKE_PROFILE.sender_name,
    sender_email: BROOKE_PROFILE.sender_email,
    reply_to_email: BROOKE_PROFILE.reply_to_email,
    sending_domain: BROOKE_PROFILE.sending_domain,
    country: raw.country || BROOKE_PROFILE.country
  };
}

export default function MailroomApp({ session }) {
  const [tab, setTab] = useState('contacts');
  const [profile, setProfile] = useState(emptyProfile);
  const [lists, setLists] = useState([]);
  const [campaignHistory, setCampaignHistory] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [listName, setListName] = useState('MYB contact list');
  const [sheetUrl, setSheetUrl] = useState('');
  const [contactFile, setContactFile] = useState(null);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [assetFiles, setAssetFiles] = useState([]);
  const [assetUrls, setAssetUrls] = useState([]);
  const [campaignForm, setCampaignForm] = useState(initialCampaignForm);
  const [campaign, setCampaign] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [selectedListId, setSelectedListId] = useState('');
  const [gates, setGates] = useState({ consent: false, reviewed: false, officialSender: false });

  const selectedList = useMemo(() => lists.find((item) => item.id === selectedListId), [lists, selectedListId]);
  const previewHtml = useMemo(() => campaign ? buildClientPreviewHtml(campaign, profile) : '', [campaign, profile]);

  useEffect(() => {
    refresh();
  }, []);

  async function api(path, options = {}) {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  async function refresh() {
    setError('');
    try {
      const [profileData, listData, campaignData] = await Promise.all([
        api('/api/mailroom/profile'),
        api('/api/mailroom/lists'),
        api('/api/mailroom/campaigns')
      ]);
      setProfile(normalizeBrookeProfile(profileData.profile || {}));
      setLists(listData.lists || []);
      setCampaignHistory(campaignData.campaigns || []);
      if (!selectedListId && listData.lists?.[0]?.id) setSelectedListId(listData.lists[0].id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login?next=/mailroom';
  }

  function updateCampaign(key, value) {
    setCampaignForm((current) => ({ ...current, [key]: value }));
  }

  function updateGeneratedCampaign(key, value) {
    setCampaign((current) => current ? ({ ...current, [key]: value }) : current);
  }

  function updateGeneratedParagraph(index, value) {
    setCampaign((current) => {
      if (!current) return current;
      const paragraphs = Array.isArray(current.body_paragraphs) ? [...current.body_paragraphs] : [];
      paragraphs[index] = value;
      return { ...current, body_paragraphs: paragraphs };
    });
  }

  async function uploadContacts() {
    setBusy(true);
    setError('');
    setStatus('');
    setUploadSummary(null);
    try {
      const form = new FormData();
      form.append('listName', listName || 'MYB contact list');
      form.append('sheetUrl', sheetUrl);
      if (contactFile) form.append('file', contactFile);
      const data = await api('/api/mailroom/contacts/upload', { method: 'POST', body: form });
      setUploadSummary(data);
      setStatus(`Imported ${data.contactsImported} contact(s). Master list updated.`);
      setListName('MYB contact list');
      setSheetUrl('');
      setContactFile(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function uploadAssets() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const form = new FormData();
      for (const file of assetFiles) form.append('files', file);
      const data = await api('/api/mailroom/assets/upload', { method: 'POST', body: form });
      setAssetUrls((current) => [...current, ...(data.uploaded || []).map((item) => item.url)]);
      setStatus(`Uploaded ${(data.uploaded || []).length} image(s).`);
      setAssetFiles([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function generateCampaign() {
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const data = await api('/api/mailroom/campaigns/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...campaignForm, ctaUrl: BROOKE_CTA_URL, assetUrls })
      });
      setCampaign(data.campaign);
      setStatus('Campaign generated. Review it before sending.');
      setTab('send');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    if (!campaign) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      await api('/api/mailroom/campaigns/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, testEmail })
      });
      setStatus(`Test email sent to ${testEmail}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendCampaign() {
    if (!campaign) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const data = await api('/api/mailroom/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign, listId: selectedListId, gates })
      });
      setStatus(`Campaign sent to ${data.recipients} recipient(s).`);
      setGates({ consent: false, reviewed: false, officialSender: false });
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const tabs = [
    ['contacts', '1. Contacts'],
    ['campaign', '2. Campaign'],
    ['send', '3. Preview & Send'],
    ['history', 'History']
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#fff6d6,transparent_34%),linear-gradient(135deg,#f8f6f0,#ece7dc)] px-5 py-8">
      <section className="mx-auto max-w-7xl">
        <header className="mailroom-card p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.35em] text-black/45">Private campaign room</p>
              <h1 className="mt-3 text-4xl font-black md:text-6xl">Made You Brooke Mailroom</h1>
              <p className="mt-3 max-w-3xl leading-7 text-black/65">
                Upload contacts, describe the campaign, review the email, send yourself a test, then send to the selected list. The booking link and sender setup are already handled.
              </p>
            </div>
            <button className="mailroom-button-secondary" onClick={logout}>Log out</button>
          </div>
        </header>

        <div className="mt-5 flex flex-wrap gap-2">
          {tabs.map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={tab === id ? 'mailroom-button' : 'mailroom-button-secondary'}>{label}</button>
          ))}
        </div>

        {(error || status) && (
          <div className="mt-5 grid gap-3">
            {error && <div className="rounded-3xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
            {status && <div className="rounded-3xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800">{status}</div>}
          </div>
        )}

        {tab === 'contacts' && (
          <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="mailroom-card mt-6 p-6 md:p-8">
              <h2 className="text-3xl font-black">Upload contacts</h2>
              <p className="mt-2 leading-7 text-black/65">Upload a CSV or Excel contact sheet. Required columns: first name, last name, email. Headers are not case sensitive.</p>
              <div className="mt-6 grid gap-4">
                <Field label="List name" value={listName} onChange={setListName} placeholder="Spring mini-session list" />
                <label className="grid gap-2">
                  <span className="mailroom-label">Contact file</span>
                  <input className="mailroom-input" type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setContactFile(e.target.files?.[0] || null)} />
                  <span className="text-sm text-black/55">CSV, XLSX, or XLS. Best columns: first name, last name, email. Data starts on row 2.</span>
                </label>
                <details className="rounded-3xl border border-black/10 bg-white/60 p-4">
                  <summary className="cursor-pointer font-bold">Optional: use a shared Google Sheet instead</summary>
                  <div className="mt-4">
                    <Field label="Shared Google Sheets / CSV URL" value={sheetUrl} onChange={setSheetUrl} placeholder="https://docs.google.com/spreadsheets/d/..." />
                  </div>
                </details>
                <button className="mailroom-button" onClick={uploadContacts} disabled={busy}>{busy ? 'Uploading...' : 'Import contacts'}</button>
              </div>
              {uploadSummary && (
                <div className="mt-6 rounded-3xl bg-black/5 p-4 text-sm leading-7">
                  <p><strong>Rows:</strong> {uploadSummary.summary?.totalRows}</p>
                  <p><strong>Imported:</strong> {uploadSummary.contactsImported}</p>
                  <p><strong>Rejected:</strong> {uploadSummary.summary?.rejected}</p>
                  <p><strong>Format:</strong> first name, last name, email</p>
                  <p><strong>Email column:</strong> {uploadSummary.columns?.email || 'detected'}</p>
                </div>
              )}
            </div>
            <div className="mailroom-card mt-6 p-6 md:p-8">
              <h2 className="text-3xl font-black">Uploaded lists</h2>
              <div className="mt-5 grid gap-3">
                {lists.length === 0 && <p className="text-black/60">No lists yet. Upload the first contact sheet on the left.</p>}
                {lists.length > 0 && (
                  <button type="button" onClick={() => setSelectedListId('master')} className={`rounded-2xl border p-4 text-left ${selectedListId === 'master' ? 'border-black bg-white' : 'border-black/10 bg-white/60'}`}>
                    <div className="font-black">Master contact list</div>
                    <div className="mt-1 text-sm text-black/60">All uploaded contacts, minus unsubscribes</div>
                  </button>
                )}
                {lists.map((list) => (
                  <button key={list.id} type="button" onClick={() => setSelectedListId(list.id)} className={`rounded-2xl border p-4 text-left ${selectedListId === list.id ? 'border-black bg-white' : 'border-black/10 bg-white/60'}`}>
                    <div className="font-black">{list.name}</div>
                    <div className="mt-1 text-sm text-black/60">{list.valid_contacts} valid, {list.rejected_contacts} rejected</div>
                    <div className="mt-1 text-xs text-black/45">{new Date(list.created_at).toLocaleString()}</div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {tab === 'campaign' && (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="mailroom-card mt-6 p-6 md:p-8">
              <h2 className="text-3xl font-black">Campaign details</h2>
              <p className="mt-2 leading-7 text-black/65">Write the rough idea. Mailroom will turn it into a short, natural Made You Brooke email.</p>
              <div className="mt-6 grid gap-4">
                <Field label="Campaign topic" value={campaignForm.theme} onChange={(v) => updateCampaign('theme', v)} placeholder="Fall family photo sessions" />
                <Field label="Offer or important detail, optional" value={campaignForm.offer} onChange={(v) => updateCampaign('offer', v)} placeholder="Limited weekend spots, booking closes Friday" />
                <label className="grid gap-2">
                  <span className="mailroom-label">What should the email say?</span>
                  <textarea className="mailroom-input min-h-[210px]" value={campaignForm.manualMessage} onChange={(e) => updateCampaign('manualMessage', e.target.value)} placeholder="Write the rough message here. Dates, session type, mood, who it is for, and anything Brooke wants people to know." />
                </label>
                <input type="hidden" value={BROOKE_CTA_URL} readOnly />
              </div>
            </div>

            <div className="mailroom-card mt-6 p-6 md:p-8">
              <h2 className="text-3xl font-black">Photos for the campaign</h2>
              <p className="mt-2 leading-7 text-black/65">Optional. Add a few photos for the email, then generate the campaign. The button link is already set to the Made You Brooke contact page.</p>
              <div className="mt-5 grid gap-4">
                <input className="mailroom-input" type="file" accept="image/*" multiple onChange={(e) => setAssetFiles(Array.from(e.target.files || []))} />
                <button className="mailroom-button-secondary" onClick={uploadAssets} disabled={busy || !assetFiles.length}>Upload selected images</button>
                {assetUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {assetUrls.map((url) => <img key={url} src={url} alt="Uploaded campaign asset" className="h-32 w-full rounded-2xl object-cover" />)}
                  </div>
                )}
                <button className="mailroom-button" onClick={generateCampaign} disabled={busy}>{busy ? 'Generating...' : 'Generate email campaign'}</button>
              </div>
            </div>
          </section>
        )}

        {tab === 'send' && (
          <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="mailroom-card mt-6 p-6 md:p-8">
              <h2 className="text-3xl font-black">Preview & send</h2>
              {!campaign && <p className="mt-4 text-black/60">Generate a campaign first.</p>}
              {campaign && (
                <div className="mt-5 grid gap-4">
                  <div className="rounded-2xl bg-black/5 p-4">
                    <p className="text-sm font-bold text-black/50">Final edit pass</p>
                    <p className="mt-1 text-sm text-black/60">Edit anything that feels off before sending.</p>
                  </div>
                  <Field label="Subject" value={campaign.selected_subject || ''} onChange={(v) => updateGeneratedCampaign('selected_subject', v)} />
                  <Field label="Preview text" value={campaign.preview_text || ''} onChange={(v) => updateGeneratedCampaign('preview_text', v)} />
                  <Field label="Headline" value={campaign.headline || ''} onChange={(v) => updateGeneratedCampaign('headline', v)} />
                  {(campaign.body_paragraphs || []).map((paragraph, index) => (
                    <label key={index} className="grid gap-2">
                      <span className="mailroom-label">Body paragraph {index + 1}</span>
                      <textarea className="mailroom-input min-h-[96px]" value={paragraph || ''} onChange={(e) => updateGeneratedParagraph(index, e.target.value)} />
                    </label>
                  ))}
                  <label className="grid gap-2">
                    <span className="mailroom-label">Send test to</span>
                    <input className="mailroom-input" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
                  </label>
                  <button className="mailroom-button-secondary" onClick={sendTest} disabled={busy || !campaign}>Send test email</button>
                  <label className="grid gap-2">
                    <span className="mailroom-label">Contact list</span>
                    <select className="mailroom-input" value={selectedListId} onChange={(e) => setSelectedListId(e.target.value)}>
                      <option value="">Choose list</option>
                      {lists.length > 0 && <option value="master">Master contact list</option>}
                      {lists.map((list) => <option key={list.id} value={list.id}>{list.name} ({list.valid_contacts})</option>)}
                    </select>
                  </label>

                  <div className="rounded-3xl border border-black/10 bg-white p-4">
                    <h3 className="font-black">Ready to send?</h3>
                    <Gate checked={gates.consent} onChange={(v) => setGates((g) => ({ ...g, consent: v }))} label="This contact list contains customers, subscribers, or people who gave permission to receive emails from Made You Brooke." />
                    <Gate checked={gates.reviewed} onChange={(v) => setGates((g) => ({ ...g, reviewed: v }))} label="I reviewed the subject, message, links, dates, and details." />
                    <Gate checked={gates.officialSender} onChange={(v) => setGates((g) => ({ ...g, officialSender: v }))} label="I approve sending this Made You Brooke campaign now." />
                  </div>

                  <button className="mailroom-button" onClick={sendCampaign} disabled={busy || !campaign || !selectedListId || !gates.consent || !gates.reviewed || !gates.officialSender}>
                    {busy ? 'Sending...' : `Send campaign${selectedList ? ` to ${selectedList.valid_contacts}` : ''}`}
                  </button>
                </div>
              )}
            </div>

            <div className="mailroom-card mt-6 overflow-hidden p-3">
              {campaign?.html_body ? (
                <iframe className="h-[760px] w-full rounded-2xl bg-white" srcDoc={previewHtml} title="Email preview" />
              ) : (
                <div className="flex h-[500px] items-center justify-center rounded-2xl bg-white text-black/50">Email preview appears here.</div>
              )}
            </div>
          </section>
        )}

        {tab === 'history' && (
          <section className="mailroom-card mt-6 p-6 md:p-8">
            <h2 className="text-3xl font-black">Campaign history</h2>
            <p className="mt-2 leading-7 text-black/65">Recent final sends are recorded here.</p>
            <div className="mt-6 grid gap-3">
              {campaignHistory.length === 0 && <p className="text-black/60">No campaign sends recorded yet.</p>}
              {campaignHistory.map((item) => (
                <div key={item.id} className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-black">{item.subject || 'Untitled campaign'}</div>
                      <div className="mt-1 text-sm text-black/60">{item.theme || item.mode || 'Campaign'} Ãƒâ€šÃ‚Â· {item.recipient_count || 0} recipient(s)</div>
                    </div>
                    <div className="text-sm font-bold text-black/60">{item.status || 'recorded'}</div>
                  </div>
                  <div className="mt-2 text-xs text-black/45">{new Date(item.sent_at || item.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </section>
        )}

      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="grid gap-2">
      <span className="mailroom-label">{label}</span>
      <input className="mailroom-input" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function Gate({ checked, onChange, label }) {
  return (
    <label className="mt-3 flex gap-3 text-sm leading-6 text-black/70">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4" />
      <span>{label}</span>
    </label>
  );
}

function escapePreview(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function buildClientPreviewHtml(campaign, profile) {
  const design = campaign.design || {};
  const primary = design.primary_color || '#111111';
  const accent = design.accent_color || '#D7A84F';
  const background = design.background_color || '#F8F6F0';
  const images = Array.isArray(campaign.asset_urls) ? campaign.asset_urls.slice(0, 3) : [];
  const paragraphs = Array.isArray(campaign.body_paragraphs) ? campaign.body_paragraphs : [];
  return `<!doctype html><html><body style="margin:0;background:${escapePreview(background)};font-family:Arial,Helvetica,sans-serif;padding:24px;"><div style="max-width:640px;margin:auto;background:#fff;border-radius:24px;overflow:hidden;border:1px solid rgba(0,0,0,.08);"><div style="padding:28px 28px 8px;"><div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:${escapePreview(accent)};font-weight:700;">${escapePreview(profile.business_name || '')}</div><h1 style="margin:12px 0 14px;color:${escapePreview(primary)};font-size:30px;line-height:1.12;">${escapePreview(campaign.headline || campaign.selected_subject || '')}</h1></div>${images.map((url) => `<img src="${escapePreview(url)}" style="width:100%;display:block;max-width:600px;margin:0 auto 18px;border-radius:18px;" />`).join('')}<div style="padding:8px 28px 30px;">${paragraphs.map((p) => `<p style="margin:0 0 16px;color:#252525;font-size:16px;line-height:1.62;">${escapePreview(p)}</p>`).join('')}${campaign.cta_url ? `<div style="margin-top:24px;"><a href="${escapePreview(campaign.cta_url)}" style="display:inline-block;background:${escapePreview(primary)};color:#fff;text-decoration:none;border-radius:999px;padding:13px 20px;font-weight:700;">${escapePreview(campaign.cta_label || 'Book now')}</a></div>` : ''}</div></div><div style="max-width:640px;margin:18px auto 0;text-align:center;color:#777;font-size:12px;line-height:1.6;">${escapePreview(profile.address_line1 || '')}<br />${escapePreview([profile.city, profile.state, profile.postal_code].filter(Boolean).join(', '))}<br /><br /><u>Unsubscribe</u></div></body></html>`;
}
