import { prisma } from '@/lib/db';
import { getUserSettings } from '@/app/actions/settings';
import { SettingsForm } from '@/components/settings/settings-form';

export default async function SettingsPage() {
  // Hardcoded user for now
  const user = await prisma.user.findFirst({
    where: { email: "sarah@tavahealth.com" }
  });

  if (!user) return <div>User not found</div>;

  const settings = await getUserSettings(user.id);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and clinical preferences.</p>
      </div>

      <div className="max-w-2xl">
        <SettingsForm userId={user.id} initialModality={settings.clinicalModality} />
      </div>
    </div>
  );
}
