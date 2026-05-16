import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getOrCreateProfile, profileHasRequiredSendFields } from '@/lib/mailroomDb';
import { isValidEmail } from '@/lib/validators';
import { renderCampaignHtml, renderPlainText } from '@/lib/emailRenderer';
import { formatSender, getResendClient } from '@/lib/resendClient';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const testEmail = String(body.testEmail || '').trim();
    if (!isValidEmail(testEmail)) return NextResponse.json({ error: 'Enter a valid test email.' }, { status: 400 });

    const profile = await getOrCreateProfile(session);
    const missing = profileHasRequiredSendFields(profile);
    if (missing.length) return NextResponse.json({ error: `Missing required sender setup: ${missing.join(', ')}.` }, { status: 400 });

    const campaign = body.campaign || {};
    const contact = { first_name: 'Test', full_name: 'Test Contact', email: testEmail };
    const html = renderCampaignHtml({ campaign, profile, contact });
    const text = renderPlainText({ campaign, profile, contact });
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: formatSender(profile),
      to: [testEmail],
      replyTo: profile.reply_to_email,
      subject: `[TEST] ${campaign.selected_subject || campaign.subject || 'Made You Brooke preview'}`,
      html,
      text
    });

    if (error) return NextResponse.json({ error: error.message || 'Resend rejected the test email.' }, { status: 502 });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Test send failed.' }, { status: 500 });
  }
}
