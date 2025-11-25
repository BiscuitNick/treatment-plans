import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientView } from "@/components/plan/ClientView";
import { TreatmentPlan } from "@/lib/schemas/plan";

export const dynamic = "force-dynamic";

export default async function PatientPortalPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Get user with role
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/auth/error?error=UserNotFound");
  }

  // Only patients can access this portal
  if (user.role !== "PATIENT") {
    redirect("/dashboard");
  }

  // Get the patient record linked to this user
  const patient = await prisma.patient.findUnique({
    where: { userId: user.id },
    include: {
      clinician: true,
      treatmentPlan: {
        include: {
          versions: {
            orderBy: { version: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!patient) {
    return (
      <div className="container mx-auto max-w-4xl py-16 px-6">
        <Card>
          <CardHeader>
            <CardTitle>Welcome, {user.name}</CardTitle>
            <CardDescription>
              Your patient profile is being set up. Please check back soon.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const latestPlanVersion = patient.treatmentPlan?.versions[0];
  const planContent = latestPlanVersion?.content as TreatmentPlan | null;

  return (
    <div className="container mx-auto max-w-4xl py-10 px-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Treatment Plan</h1>
        <p className="text-muted-foreground">
          Welcome back, {patient.name}. Here is your personalized treatment plan from {patient.clinician.name}.
        </p>
      </div>

      {planContent ? (
        <Card>
          <CardContent className="pt-6">
            <ClientView plan={planContent} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Treatment Plan Yet</CardTitle>
            <CardDescription>
              Your therapist hasn&apos;t created a treatment plan for you yet.
              Check back after your next session.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Therapist</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{patient.clinician.name}</p>
          <p className="text-sm text-muted-foreground">{patient.clinician.email}</p>
        </CardContent>
      </Card>
    </div>
  );
}
