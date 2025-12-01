import { getPatientById } from '@/app/actions/patients';
import { notFound } from 'next/navigation';
import { Badge } from "@/components/ui/badge";
import { DualViewPlan } from '@/components/plan/DualViewPlan';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage(props: PageProps) {
  const params = await props.params;
  const patient = await getPatientById(params.id);

  if (!patient) {
    return notFound();
  }

  // Generate demo email from patient name
  const generateDemoEmail = (name: string) => {
    const firstName = name.split(' ')[0].toLowerCase();
    return `${firstName}@example.com`;
  };

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
          <p className="text-muted-foreground">{generateDemoEmail(patient.name)}</p>
          <p className="text-sm text-muted-foreground">Patient Profile</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant="outline">{patient.status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Joined:</span>
            <span className="font-medium">{new Date(patient.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Sessions:</span>
            <span className="font-medium">{patient.sessions.length}</span>
          </div>
        </div>
      </div>

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
