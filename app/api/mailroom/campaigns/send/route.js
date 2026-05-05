import { NextResponse } from 'next/server';
import { APP_URL, MAX_RECIPIENTS_PER_SEND } from '@/lib/constants';
import { getSessionFromRequest } from '@/lib/auth';
import { getOrCreateProfile, getRecipientsForList, profileHasRequiredSendFields, saveCampaignSend } from '@/lib/mailroomDb';
import { createUnsubscribeToken, renderCampaignHtml, renderPlainText } from '@/lib/emailRenderer';
import { formatSender, getResendClient } from '@/lib/resendClient';
import { senderDomain } from '@/lib/validators';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const gates = body.gates || {};
    if (!gates.consent || !gates.reviewed || !gates.officialSender) {
      return NextResponse.json({ error: 'All send gates must be checked before sending.' }, { status: 400 });
    }

    const profile = await getOrCreateProfile(session);
    const missing = profileHasRequiredSendFields(profile);
    if (missing.length) return NextResponse.json({ error: `Complete profile before sending: ${missing.join(', ')}.` }, { status: 400 });

    const domain = senderDomain(profile.sender_email);
    if (profile.sending_domain && domain && profile.sending_domain !== domain) {
      return NextResponse.json({ error: `Sender email domain (${domain}) does not match profile sending domain (${profile.sending_domain}).` }, { status: 400 });
    }

    const listId = body.listId;
    if (!listId) return NextResponse.json({ error: 'Choose a contact list.' }, { status: 400 });

    const recipients = await getRecipientsForList(profile.id, listId);
    if (!recipients.length) return NextResponse.json({ error: 'No sendable recipients found. They may all be unsubscribed or invalid.' }, { status: 400 });
    if (recipients.length > MAX_RECIPIENTS_PER_SEND) {
      return NextResponse.json({ error: `This beta send is capped at ${MAX_RECIPIENTS_PER_SEND} recipients. Split the list or raise MAILROOM_MAX_RECIPIENTS_PER_SEND intentionally.` }, { status: 400 });
    }

    const campaign = body.campaign || {};
    const resend = getResendClient();
    const emails = recipients.map((contact) => {
      const token = createUnsubscribeToken(profile.id, contact.email);
      const unsubscribeUrl = `${APP_URL}/api/mailroom/unsubscribe?token=${encodeURIComponent(token)}`;
      return {
        from: formatSender(profile),
        to: [contact.email],
        replyTo: profile.reply_to_email,
        subject: campaign.selected_subject || campaign.subject || 'Update',
        html: renderCampaignHtml({ campaign, profile, contact, unsubscribeUrl }),
        text: renderPlainText({ campaign, profile, contact, unsubscribeUrl }),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        }
      };
    });

    const campaignForRecord = { ...campaign, html_body: emails[0]?.html || campaign.html_body || '', text_body: emails[0]?.text || campaign.text_body || '' };
    const { data, error } = await resend.batch.send(emails);
    if (error) {
      await saveCampaignSend({ profileId: profile.id, listId, campaign: campaignForRecord, status: 'failed', recipientCount: recipients.length, resendResponse: error });
      return NextResponse.json({ error: error.message || 'Resend rejected the campaign.' }, { status: 502 });
    }

    const saved = await saveCampaignSend({ profileId: profile.id, listId, campaign: campaignForRecord, status: 'sent', recipientCount: recipients.length, resendResponse: data });
    return NextResponse.json({ ok: true, recipients: recipients.length, data, campaignRecord: saved });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
