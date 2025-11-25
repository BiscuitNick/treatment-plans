import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { UserCircle } from 'lucide-react';

export default async function ProfilePage() {
  // Hardcoded user for now, as per previous implementation
  const user = await prisma.user.findFirst({
    where: { email: "sarah@tavahealth.com" }
  });

  if (!user) return <div>User not found</div>;

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account details.</p>
      </div>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCircle className="h-6 w-6" />
              Clinician Details
            </CardTitle>
            <CardDescription>
              Your personal information visible to patients and administrators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={user.name || ''} readOnly disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={user.email} readOnly disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={user.role} readOnly disabled className="capitalize" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
