import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getOrCreateProfile, saveProfile } from '@/lib/mailroomDb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await getOrCreateProfile(session);
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // Brooke-only beta: profile values are hardcoded server-side in lib/mailroomDb.js.
    // This endpoint exists for compatibility but does not expose client profile editing.
    const profile = await saveProfile(session, {});
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
