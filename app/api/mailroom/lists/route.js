import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { listContactLists } from '@/lib/mailroomDb';

export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const lists = await listContactLists(session);
    return NextResponse.json({ lists });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
