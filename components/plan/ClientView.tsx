'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TreatmentPlan } from "@/lib/schemas/plan";

interface ClientViewProps {
  plan: TreatmentPlan;
}

export function ClientView({ plan }: ClientViewProps) {
  const { clientSummary, clientGoals, homework, clientDiagnosis } = plan;

  return (
    <div className="space-y-6 w-full overflow-hidden">
      {/* Client Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Your Session Summary</CardTitle>
          <CardDescription>A friendly recap of our conversation.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <p className="whitespace-pre-wrap break-words">{clientSummary}</p>
        </CardContent>
      </Card>

      {/* Understanding Your Path - Patient-friendly diagnosis */}
      {clientDiagnosis && !clientDiagnosis.hidden && clientDiagnosis.summary && (
        <Card>
          <CardHeader>
            <CardTitle>Understanding Your Path</CardTitle>
            <CardDescription>What we&apos;re working on together.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <p className="whitespace-pre-wrap break-words">{clientDiagnosis.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Your Goals */}
      <Card>
        <CardHeader>
          <CardTitle>Your Journey Forward</CardTitle>
          <CardDescription>Here are the steps we&apos;re taking together.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 overflow-hidden">
          {(clientGoals || []).length === 0 ? (
            <p className="text-muted-foreground italic">No goals set yet. We&apos;ll work on this together!</p>
          ) : (
            (clientGoals || []).map((goal, index) => (
              <div key={index} className="flex items-start space-x-3">
                <span className="text-2xl shrink-0">{goal.emoji || '✨'}</span>
                <p className="flex-1 min-w-0 font-medium break-words">{goal.description}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Your Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>What to Practice This Week</CardTitle>
          <CardDescription>Small steps for big changes.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <p className="whitespace-pre-wrap break-words">{homework || <span className="italic text-muted-foreground">No specific tasks this week.</span>}</p>
        </CardContent>
      </Card>
    </div>
  );
}
