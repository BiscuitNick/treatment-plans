import { getPatientById } from '@/app/actions/patients';
import { notFound, redirect } from 'next/navigation';
import { DualViewPlan } from '@/components/plan/DualViewPlan';
import { PatientHeader } from '@/components/patients/patient-header';
import { auth } from '@/lib/auth';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage(props: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  const params = await props.params;
  const patient = await getPatientById(params.id);

  if (!patient) {
    return notFound();
  }

  // Get the latest plan content if available
  const latestPlan = patient.treatmentPlan;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activePlanContent = latestPlan?.versions[0]?.content as any;

  // Get the most recent session for Update Plan functionality
  const latestSession = patient.sessions.length > 0
    ? patient.sessions.reduce((latest, session) =>
        new Date(session.createdAt) > new Date(latest.createdAt) ? session : latest
      )
    : null;

  return (
    <div className="container mx-auto py-10 space-y-8">
      {/* Header with Demographics */}
      <PatientHeader
        patient={{
          id: patient.id,
          name: patient.name,
          age: patient.age,
          gender: patient.gender,
          diagnosis: patient.diagnosis,
          notes: patient.notes,
          status: patient.status,
          createdAt: patient.createdAt,
          sessionsCount: patient.sessions.length,
        }}
        userId={session.user.id}
      />

      {/* Treatment Plan Section */}
      <DualViewPlan
          plan={activePlanContent || null}
          planId={latestPlan?.id}
          patientId={patient.id}
          sessionId={latestSession?.id}
          sessions={patient.sessions}
      />
    </div>
  );
}
