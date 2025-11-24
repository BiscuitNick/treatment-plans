import { getDashboardSessions } from '@/app/actions/sessions';
import { UploadSessionDialog } from '@/components/dashboard/upload-session-dialog';
import { SessionList } from '@/components/dashboard/session-list';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // TODO: Integrate real authentication (e.g., NextAuth, Cognito)
  // For prototype, we use the seeded user "Anxious Andy" (Clinician context)
  const user = await prisma.user.findFirst({
    where: { email: "andy@example.com" }
  });

  // If no user found (e.g. seed didn't run), handle gracefully or show empty state
  // In a real app, this would redirect to login
  if (!user) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-red-500">User Not Found</h1>
        <p>Please run the database seed script.</p>
      </div>
    );
  }

  const sessions = await getDashboardSessions(user.id);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Therapist Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name}. Here are your recent sessions.
          </p>
        </div>
        <UploadSessionDialog userId={user.id} />
      </div>

      <SessionList sessions={sessions} />
    </div>
  );
}