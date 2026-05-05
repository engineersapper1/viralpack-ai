import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getOrCreateProfile } from '@/lib/mailroomDb';
import { generateCampaign } from '@/lib/campaignGenerator';
import { renderCampaignHtml } from '@/lib/emailRenderer';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getOrCreateProfile(session);
    const body = await request.json();
    const campaign = await generateCampaign({
      profile,
      mode: body.mode || 'manual',
      theme: body.theme || '',
      manualMessage: body.manualMessage || '',
      ctaUrl: body.ctaUrl || profile.website_url || '',
      offer: body.offer || '',
      assetUrls: Array.isArray(body.assetUrls) ? body.assetUrls : []
    });
    const html = renderCampaignHtml({ campaign, profile, contact: { first_name: 'Preview', full_name: 'Preview Contact', email: 'preview@example.com' } });
    return NextResponse.json({ campaign: { ...campaign, html_body: html }, profile });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
