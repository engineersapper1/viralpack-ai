import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { cleanString, cleanUrl, normalizeEmail } from '@/lib/validators';

export async function getOrCreateProfile(session) {
  const supabase = getSupabaseAdmin();
  const userKey = session.userKey || session.username;

  const existing = await supabase
    .from('mailroom_profiles')
    .select('*')
    .eq('user_key', userKey)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (existing.data) return existing.data;

  const inserted = await supabase
    .from('mailroom_profiles')
    .insert({
      user_key: userKey,
      display_name: session.displayName || session.username,
      business_name: '',
      sender_name: '',
      sender_email: '',
      reply_to_email: '',
      sending_domain: '',
      country: 'US'
    })
    .select('*')
    .single();

  if (inserted.error) throw inserted.error;
  return inserted.data;
}

export async function saveProfile(session, payload) {
  const supabase = getSupabaseAdmin();
  const current = await getOrCreateProfile(session);

  const update = {
    display_name: cleanString(payload.display_name, 150),
    business_name: cleanString(payload.business_name, 150),
    website_url: cleanUrl(payload.website_url),
    sender_name: cleanString(payload.sender_name, 150),
    sender_email: normalizeEmail(payload.sender_email),
    reply_to_email: normalizeEmail(payload.reply_to_email || payload.sender_email),
    sending_domain: cleanString(payload.sending_domain, 255).toLowerCase(),
    address_line1: cleanString(payload.address_line1, 255),
    address_line2: cleanString(payload.address_line2, 255),
    city: cleanString(payload.city, 100),
    state: cleanString(payload.state, 100),
    postal_code: cleanString(payload.postal_code, 50),
    country: cleanString(payload.country || 'US', 50),
    updated_at: new Date().toISOString()
  };

  const saved = await supabase
    .from('mailroom_profiles')
    .update(update)
    .eq('id', current.id)
    .select('*')
    .single();

  if (saved.error) throw saved.error;
  return saved.data;
}

export function profileHasRequiredSendFields(profile) {
  const missing = [];
  if (!profile?.business_name) missing.push('business name');
  if (!profile?.sender_name) missing.push('sender name');
  if (!profile?.sender_email) missing.push('sender email');
  if (!profile?.reply_to_email) missing.push('reply-to email');
  if (!profile?.address_line1) missing.push('mailing address line 1');
  if (!profile?.city) missing.push('city');
  if (!profile?.state) missing.push('state');
  if (!profile?.postal_code) missing.push('postal code');
  return missing;
}

export async function listContactLists(session) {
  const supabase = getSupabaseAdmin();
  const profile = await getOrCreateProfile(session);

  const { data, error } = await supabase
    .from('mailroom_contact_lists')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createContactList(session, { name, contacts, rejected = [], source = {} }) {
  const supabase = getSupabaseAdmin();
  const profile = await getOrCreateProfile(session);

  const listResult = await supabase
    .from('mailroom_contact_lists')
    .insert({
      profile_id: profile.id,
      name: cleanString(name || `List ${new Date().toLocaleDateString()}`, 150),
      source_filename: cleanString(source.filename || source.url || '', 500),
      source_kind: cleanString(source.kind || 'upload', 50),
      total_rows: contacts.length + rejected.length,
      valid_contacts: contacts.length,
      rejected_contacts: rejected.length,
      upload_notes: source.notes || {}
    })
    .select('*')
    .single();

  if (listResult.error) throw listResult.error;
  const list = listResult.data;

  if (contacts.length) {
    const rows = contacts.map((contact) => ({
      profile_id: profile.id,
      list_id: list.id,
      email: normalizeEmail(contact.email),
      first_name: cleanString(contact.first_name, 100),
      last_name: cleanString(contact.last_name, 100),
      full_name: cleanString(contact.full_name, 200),
      tags: contact.tags || [],
      raw_payload: contact.raw || {}
    }));

    const contactResult = await supabase
      .from('mailroom_contacts')
      .upsert(rows, { onConflict: 'profile_id,list_id,email' });

    if (contactResult.error) throw contactResult.error;
  }

  return { list, contactsImported: contacts.length, rejected };
}

export async function getRecipientsForList(profileId, listId) {
  const supabase = getSupabaseAdmin();

  const contactsResult = await supabase
    .from('mailroom_contacts')
    .select('*')
    .eq('profile_id', profileId)
    .eq('list_id', listId)
    .order('created_at', { ascending: true });

  if (contactsResult.error) throw contactsResult.error;

  const emails = (contactsResult.data || []).map((row) => row.email);
  if (!emails.length) return [];

  const suppressions = await supabase
    .from('mailroom_suppression')
    .select('email')
    .eq('profile_id', profileId)
    .in('email', emails);

  if (suppressions.error) throw suppressions.error;
  const blocked = new Set((suppressions.data || []).map((row) => row.email));
  return (contactsResult.data || []).filter((contact) => !blocked.has(contact.email));
}

export async function saveCampaignSend({ profileId, listId, campaign, status, recipientCount, resendResponse }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('mailroom_campaigns')
    .insert({
      profile_id: profileId,
      list_id: listId || null,
      mode: campaign.mode || 'manual',
      theme: campaign.theme || '',
      subject: campaign.subject || campaign.selected_subject || '',
      preview_text: campaign.preview_text || '',
      html_body: campaign.html_body || '',
      text_body: campaign.text_body || campaign.plain_text || '',
      status,
      recipient_count: recipientCount || 0,
      resend_response: resendResponse || null,
      sent_at: status === 'sent' ? new Date().toISOString() : null
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
