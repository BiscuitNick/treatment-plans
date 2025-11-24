import { getDashboardSessions } from '@/app/actions/sessions';
import { prisma } from '@/lib/db';
import { DashboardClientPage } from '@/components/dashboard/dashboard-client-page';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await prisma.user.findFirst({
    where: { email: "andy@example.com" }
  });

  if (!user) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">User Not Found</h1>
        <p>Please run the database seed script.</p>
      </div>
    );
  }

  const sessions = await getDashboardSessions(user.id);
  return <DashboardClientPage sessions={sessions} user={user} />;
}
