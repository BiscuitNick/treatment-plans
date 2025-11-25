import { prisma } from '@/lib/db';
import { getUserSettings } from '@/app/actions/settings';
import { SettingsForm } from '@/components/settings/settings-form';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const session = await auth();
  
  if (!session?.user?.email) {
    redirect('/auth/signin');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });

  if (!user) return <div>User not found in database. Please contact support.</div>;

  const settings = await getUserSettings(user.id);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and clinical preferences.</p>
      </div>

      <div className="max-w-2xl">
        <SettingsForm userId={user.id} initialSettings={settings} />
      </div>
    </div>
  );
}