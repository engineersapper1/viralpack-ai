import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { listCampaigns } from '@/lib/mailroomDb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const campaigns = await listCampaigns(session);
    return NextResponse.json({ campaigns });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not load campaigns.' }, { status: 500 });
  }
}
