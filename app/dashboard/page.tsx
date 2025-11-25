import { getDashboardSessions } from '@/app/actions/sessions';
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

  const sessions = await getDashboardSessions(user.id);
  return <DashboardClientPage sessions={sessions} user={user} />;
}
