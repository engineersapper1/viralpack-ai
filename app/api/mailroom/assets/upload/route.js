import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getOrCreateProfile } from '@/lib/mailroomDb';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { DEFAULT_BUCKET } from '@/lib/constants';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getOrCreateProfile(session);
    const form = await request.formData();
    const files = form.getAll('files').filter((file) => file && typeof file.arrayBuffer === 'function');
    if (!files.length) return NextResponse.json({ error: 'Choose at least one image.' }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const uploaded = [];

    for (const file of files.slice(0, 5)) {
      if (!String(file.type || '').startsWith('image/')) continue;
      const ext = (file.name || 'image').split('.').pop()?.toLowerCase() || 'jpg';
      const key = `${profile.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error } = await supabase.storage.from(DEFAULT_BUCKET).upload(key, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false
      });
      if (error) throw error;
      const { data } = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(key);
      uploaded.push({ url: data.publicUrl, path: key, name: file.name });
    }

    return NextResponse.json({ uploaded });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
