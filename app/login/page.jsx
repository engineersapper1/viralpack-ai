import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next = params?.next || '/mailroom';
  const session = await getSession();
  if (session) redirect(next);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fff2bd,transparent_32%),linear-gradient(135deg,#f8f6f0,#ebe6d9)] px-6 py-10">
      <div className="mailroom-card w-full max-w-md p-8">
        <p className="text-sm font-bold uppercase tracking-[0.35em] text-black/45">ViralPack beta</p>
        <h1 className="mt-4 text-4xl font-black">Client Mailroom</h1>
        <p className="mt-3 leading-7 text-black/65">Login-only room for beta contact lists and official client email sends.</p>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
