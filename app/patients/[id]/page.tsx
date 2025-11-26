import { getPatientById } from '@/app/actions/patients';
import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DualViewPlan } from '@/components/plan/DualViewPlan';
// Adapter for SessionList to work with Patient Sessions
// Note: SessionList expects DashboardSession type which has 'user', but here we have 'patient' context.
// We might need to refactor SessionList or map the data.

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDetailPage(props: PageProps) {
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
        <p className="text-muted-foreground">Patient Profile</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="plan">Treatment Plan</TabsTrigger>
          <TabsTrigger value="sessions">Session History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Demographics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Status</span>
                <span>{patient.status}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Joined</span>
                <span>{new Date(patient.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="font-medium">Total Sessions</span>
                <span>{patient.sessions.length}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="mt-6">
          {activePlanContent ? (
            <DualViewPlan
                plan={activePlanContent}
                planId={latestPlan?.id}
                sessionId={latestSession?.id}
            />
          ) : (
            <div className="p-8 text-center border rounded-md bg-muted/10 text-muted-foreground">
                No active treatment plan. Start a session to generate one.
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
            {/* We can reuse SessionList if we map the data, or build a simple table */}
            <div className="rounded-md border">
                <div className="p-4">
                    <h3 className="font-medium mb-4">Past Sessions</h3>
                    {patient.sessions.length === 0 ? (
                        <p className="text-muted-foreground">No sessions recorded.</p>
                    ) : (
                        <ul className="space-y-4">
                            {patient.sessions.map(session => (
                                <li key={session.id} className="flex justify-between items-center border-b last:border-0 pb-2">
                                    <div>
                                        <p className="font-medium">{new Date(session.createdAt).toLocaleDateString()}</p>
                                        <p className="text-xs text-muted-foreground truncate w-64">
                                            {session.transcript ? session.transcript.substring(0, 50) + "..." : "No transcript"}
                                        </p>
                                    </div>
                                    {/* Link to session detail if we had one, or Play button */}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
