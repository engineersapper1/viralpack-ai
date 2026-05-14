import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { cleanString, cleanUrl, normalizeEmail } from '@/lib/validators';

const BROOKE_PROFILE_USER_KEY = 'brooke';

const BROOKE_PROFILE_BASE = {
  user_key: BROOKE_PROFILE_USER_KEY,
  display_name: 'Made You Brooke',
  business_name: 'Made You Brooke',
  website_url: 'https://www.madeyoubrookephoto.com/',
  sender_name: 'Made You Brooke',
  sender_email: 'mailroom@viralpack.ai',
  reply_to_email: 'brooke@madeyoubrookellc.com',
  sending_domain: 'viralpack.ai',
  address_line1: '',
  address_line2: '',
  city: 'St. Petersburg',
  state: 'FL',
  postal_code: '',
  country: 'US',
  brand_profile: {
    business: 'Made You Brooke',
    website: 'https://www.madeyoubrookephoto.com/',
    contact_url: 'https://www.madeyoubrookephoto.com/contact',
    brand_voice: 'warm, polished, friendly, concise photography studio email copy'
  }
};

function brookeProfileDefaults(existing = {}) {
  return {
    ...BROOKE_PROFILE_BASE,
    // Hardcoded for the Brooke-only beta. These values are not shown as profile inputs.
    // They exist only so campaign sends have a complete compliance footer.
    address_line1: process.env.MAILROOM_ADDRESS_LINE1 || BROOKE_PROFILE_BASE.address_line1,
    address_line2: process.env.MAILROOM_ADDRESS_LINE2 || BROOKE_PROFILE_BASE.address_line2,
    city: process.env.MAILROOM_ADDRESS_CITY || BROOKE_PROFILE_BASE.city,
    state: process.env.MAILROOM_ADDRESS_STATE || BROOKE_PROFILE_BASE.state,
    postal_code: process.env.MAILROOM_ADDRESS_POSTAL_CODE || BROOKE_PROFILE_BASE.postal_code,
    country: process.env.MAILROOM_ADDRESS_COUNTRY || BROOKE_PROFILE_BASE.country,
    updated_at: new Date().toISOString()
  };
}

function mailroomUserKey() {
  // This beta room is intentionally locked to one client profile.
  // Daniel/admin and Brooke/client both land in the same Made You Brooke workspace.
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
    const desired = brookeProfileDefaults(existing.data);
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
    .insert(brookeProfileDefaults())
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

  const update = brookeProfileDefaults({
    ...current,
    address_line1: payload.address_line1 || current.address_line1,
    address_line2: payload.address_line2 || current.address_line2,
    city: payload.city || current.city,
    state: payload.state || current.state,
    postal_code: payload.postal_code || current.postal_code,
    country: payload.country || current.country
  });

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

  // Address values are hardcoded server-side for the Brooke-only beta.
  // No client profile/address setup screen should exist.
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

