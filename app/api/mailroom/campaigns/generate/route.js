import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getOrCreateProfile } from '@/lib/mailroomDb';
import { generateCampaign } from '@/lib/campaignGenerator';
import { renderCampaignHtml } from '@/lib/emailRenderer';
import { BROOKE_CTA_URL } from '@/lib/mailroomConfig';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const profile = await getOrCreateProfile(session);
    const campaign = await generateCampaign({
      profile,
      mode: body.mode || 'manual',
      theme: body.theme || '',
      manualMessage: body.manualMessage || '',
      offer: body.offer || '',
      ctaUrl: BROOKE_CTA_URL,
      assetUrls: Array.isArray(body.assetUrls) ? body.assetUrls : []
    });

    const html = renderCampaignHtml({ campaign, profile });
    return NextResponse.json({ campaign: { ...campaign, html_body: html } });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not generate campaign.' }, { status: 500 });
  }
}
