import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import {
  BROOKE_BUSINESS_NAME,
  BROOKE_WEBSITE_URL,
  BROOKE_CTA_URL,
  BROOKE_SENDER_NAME,
  BROOKE_SENDER_EMAIL,
  BROOKE_REPLY_TO_EMAIL,
  BROOKE_SENDING_DOMAIN,
  BROOKE_CITY,
  BROOKE_STATE,
  BROOKE_COUNTRY,
  BROOKE_BRAND_PROFILE
} from '@/lib/mailroomConfig';
import { cleanString, normalizeEmail } from '@/lib/validators';

const BROOKE_PROFILE_USER_KEY = 'brooke';

function hardcodedProfile(existing = {}) {
  return {
    ...existing,
    user_key: BROOKE_PROFILE_USER_KEY,
    display_name: BROOKE_BUSINESS_NAME,
    business_name: BROOKE_BUSINESS_NAME,
    website_url: BROOKE_WEBSITE_URL,
    sender_name: BROOKE_SENDER_NAME,
    sender_email: BROOKE_SENDER_EMAIL,
    reply_to_email: BROOKE_REPLY_TO_EMAIL,
    sending_domain: BROOKE_SENDING_DOMAIN,
    address_line1: '',
    address_line2: '',
    city: BROOKE_CITY,
    state: BROOKE_STATE,
    postal_code: '',
    country: BROOKE_COUNTRY,
    brand_profile: {
      ...(existing.brand_profile || {}),
      ...BROOKE_BRAND_PROFILE,
      contact_url: BROOKE_CTA_URL
    },
    updated_at: new Date().toISOString()
  };
}

function mailroomUserKey() {
  return BROOKE_PROFILE_USER_KEY;
}

export async function getOrCreateProfile(session) {
  const supabase = getSupabaseAdmin();
  const userKey = mailroomUserKey(session);

  const existing = await supabase
    .from('mailroom_profiles')
    .select('*')
    .eq('user_key', userKey)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (existing.data) {
    const desired = hardcodedProfile(existing.data);
    const saved = await supabase
      .from('mailroom_profiles')
      .update(desired)
      .eq('id', existing.data.id)
      .select('*')
      .single();

    if (saved.error) throw saved.error;
    return saved.data;
  }

  const inserted = await supabase
    .from('mailroom_profiles')
    .insert(hardcodedProfile())
    .select('*')
    .single();

  if (inserted.error) {
    const message = String(inserted.error.message || '');
    if (
      inserted.error.code === '23505' ||
      message.includes('duplicate key') ||
      message.includes('mailroom_profiles_user_key_key')
    ) {
      const retry = await supabase
        .from('mailroom_profiles')
        .select('*')
        .eq('user_key', userKey)
        .maybeSingle();

      if (retry.error) throw retry.error;
      if (retry.data) return retry.data;
    }
    throw inserted.error;
  }

  return inserted.data;
}

export async function saveProfile(session, payload = {}) {
  const supabase = getSupabaseAdmin();
  const current = await getOrCreateProfile(session);
  const update = hardcodedProfile(current);

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
  return [];
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

async function upsertMasterContacts(supabase, profile, list, contacts, source = {}) {
  if (!contacts.length) return;

  const rows = contacts.map((contact) => {
    const email = normalizeEmail(contact.email);
    return {
      profile_id: profile.id,
      email,
      first_name: cleanString(contact.first_name, 100),
      last_name: cleanString(contact.last_name, 100),
      full_name: cleanString(contact.full_name, 200),
      raw_first_name: cleanString(contact.raw_first_name ?? contact.first_name, 200),
      raw_last_name: cleanString(contact.raw_last_name ?? contact.last_name, 200),
      raw_email: cleanString(contact.raw_email ?? contact.email, 300),
      raw_payload: contact.raw || {},
      source_list_id: list.id,
      source_filename: cleanString(source.filename || source.url || '', 500),
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    };
  });

  const result = await supabase
    .from('mailroom_master_contacts')
    .upsert(rows, { onConflict: 'profile_id,email' });

  if (result.error && !String(result.error.message || '').includes('mailroom_master_contacts')) {
    throw result.error;
  }
}

export async function createContactList(session, { name, contacts, rejected = [], source = {} }) {
  const supabase = getSupabaseAdmin();
  const profile = await getOrCreateProfile(session);

  const listResult = await supabase
    .from('mailroom_contact_lists')
    .insert({
      profile_id: profile.id,
      name: cleanString(name || 'MYB contact list', 150),
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

    await upsertMasterContacts(supabase, profile, list, contacts, source);
  }

  return { list, contactsImported: contacts.length, rejected };
}

export async function getRecipientsForList(profileId, listId) {
  const supabase = getSupabaseAdmin();

  let contactsResult = null;

  if (listId === 'master') {
    contactsResult = await supabase
      .from('mailroom_master_contacts')
      .select('*')
      .eq('profile_id', profileId)
      .is('unsubscribed_at', null)
      .order('created_at', { ascending: true });
  } else {
    contactsResult = await supabase
      .from('mailroom_contacts')
      .select('*')
      .eq('profile_id', profileId)
      .eq('list_id', listId)
      .order('created_at', { ascending: true });
  }

  if (contactsResult.error) throw contactsResult.error;

  const emails = (contactsResult.data || []).map((row) => normalizeEmail(row.email));
  if (!emails.length) return [];

  const suppressions = await supabase
    .from('mailroom_suppression')
    .select('email')
    .eq('profile_id', profileId)
    .in('email', emails);

  if (suppressions.error) throw suppressions.error;
  const blocked = new Set((suppressions.data || []).map((row) => normalizeEmail(row.email)));
  return (contactsResult.data || []).filter((contact) => !blocked.has(normalizeEmail(contact.email)));
}

export async function listCampaigns(session) {
  const supabase = getSupabaseAdmin();
  const profile = await getOrCreateProfile(session);

  const { data, error } = await supabase
    .from('mailroom_campaigns')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw error;
  return data || [];
}

export async function saveCampaignSend({ profileId, listId, campaign, status, recipientCount, resendResponse }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('mailroom_campaigns')
    .insert({
      profile_id: profileId,
      list_id: listId && listId !== 'master' ? listId : null,
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
