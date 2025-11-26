import { prisma } from '@/lib/db';
import { getUserSettings } from '@/app/actions/settings';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ToolsPageClient } from './tools-page-client';

export default async function ToolsPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) return <div>User not found in database. Please contact support.</div>;

  const settings = await getUserSettings(user.id);

  // Fetch patients for the audio generator
  const patients = await prisma.patient.findMany({
    where: { clinicianId: user.id },
    select: {
      id: true,
      name: true,
      _count: {
        select: { sessions: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <ToolsPageClient
      userId={user.id}
      initialSettings={settings}
      patients={patients.map(p => ({
        id: p.id,
        name: p.name,
        sessionCount: p._count.sessions
      }))}
    />
  );
}
