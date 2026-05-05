import { redirect } from 'next/navigation';
import MailroomApp from '@/components/MailroomApp';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function MailroomPage() {
  const session = await getSession();
  if (!session) redirect('/login?next=/mailroom');
  return <MailroomApp session={session} />;
}
