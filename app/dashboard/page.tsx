import { getDashboardSessions } from '@/app/actions/sessions';
import { getPatientsForSelect } from '@/app/actions/patients';
import { prisma } from '@/lib/db';
import { DashboardClientPage } from '@/components/dashboard/dashboard-client-page';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Fetch full user from Prisma using the authenticated session
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    // Edge case: user exists in Cognito but not in DB
    redirect('/auth/error?error=UserNotFound');
  }

  // Patients should use the portal, not the dashboard
  if (user.role === 'PATIENT') {
    redirect('/portal');
  }

  const [sessions, patients] = await Promise.all([
    getDashboardSessions(user.id),
    getPatientsForSelect(user.id),
  ]);

  return <DashboardClientPage sessions={sessions} user={user} patients={patients} />;
}
