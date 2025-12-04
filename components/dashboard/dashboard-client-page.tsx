'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SessionList } from '@/components/dashboard/session-list';
import { ReviewsDueWidget } from '@/components/dashboard/reviews-due-widget';
import { AddSessionModal } from '@/components/sessions/add-session-modal';
import { CreatePatientModal } from '@/components/sessions/create-patient-modal';

interface Patient {
  id: string;
  name: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DashboardClientPage({ sessions, user, patients: initialPatients }: { sessions: any[], user: any, patients: Patient[] }) {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [createPatientModal, setCreatePatientModal] = useState(false);

  const handlePatientCreated = (patient: Patient) => {
    setPatients([...patients, patient].sort((a, b) => a.name.localeCompare(b.name)));
    setCreatePatientModal(false);
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Therapist Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name}. Here are your recent sessions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/tools">
              <Settings className="h-4 w-4 mr-2" />
              Tools
            </Link>
          </Button>
          <AddSessionModal
            patients={patients}
            onSessionsCreated={() => router.refresh()}
            onCreatePatient={() => setCreatePatientModal(true)}
          />
        </div>
      </div>

      <CreatePatientModal
        isOpen={createPatientModal}
        onClose={() => setCreatePatientModal(false)}
        userId={user.id}
        onPatientCreated={handlePatientCreated}
      />

      {/* Main content grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Sessions list - takes 2 columns */}
        <div className="md:col-span-2">
          <SessionList sessions={sessions} />
        </div>

        {/* Right sidebar - 90-day reviews widget */}
        <div className="space-y-6">
          <ReviewsDueWidget maxItems={5} />
        </div>
      </div>
    </div>
  );
}
