'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreatmentPlan, ClinicalGoal } from "@/lib/schemas/plan";
import { Separator } from "@/components/ui/separator"; // Assuming Separator is available

interface TherapistViewProps {
  plan: TreatmentPlan;
}

const renderGoalStatus = (status: ClinicalGoal['status']) => {
  switch (status) {
    case 'IN_PROGRESS':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
    case 'COMPLETED':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case 'DEFERRED':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Deferred</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export function TherapistView({ plan }: TherapistViewProps) {
  const { riskScore, therapistNote, clinicalGoals, interventions, homework } = plan;

  return (
    <div className="space-y-6">
      {/* Risk Assessment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Risk Assessment
            <Badge 
              className={
                riskScore === 'HIGH' ? "bg-red-100 text-red-800" : 
                riskScore === 'MEDIUM' ? "bg-orange-100 text-orange-800" : 
                "bg-green-100 text-green-800"
              }
            >
              {riskScore}
            </Badge>
          </CardTitle>
          <CardDescription>
            Overall safety and risk level identified during the session.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Therapist Note (SOAP - Objective/Assessment) */}
      <Card>
        <CardHeader>
          <CardTitle>Therapist Note</CardTitle>
          <CardDescription>Professional observations and clinical assessment.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{therapistNote}</p>
        </CardContent>
      </Card>

      {/* Clinical Goals (SOAP - Plan) */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Goals</CardTitle>
          <CardDescription>Specific, measurable, achievable, relevant, time-bound objectives.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {clinicalGoals.length === 0 ? (
            <p className="text-muted-foreground italic">No clinical goals defined.</p>
          ) : (
            clinicalGoals.map((goal, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div>{renderGoalStatus(goal.status)}</div>
                <div className="flex-1">
                  <p className="font-medium">{goal.description}</p>
                  {goal.targetDate && (
                    <p className="text-sm text-muted-foreground">Target: {goal.targetDate}</p>
                  )}
                  {/* Placeholder for ICD-10 codes related to this goal */}
                  <p className="text-xs text-muted-foreground mt-1">
                    ICD-10: <span className="italic">Not specified (placeholder)</span>
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Interventions */}
      <Card>
        <CardHeader>
          <CardTitle>Interventions</CardTitle>
          <CardDescription>Therapeutic techniques and strategies employed or planned.</CardDescription>
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <p className="text-muted-foreground italic">No interventions noted.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1">
              {interventions.map((intervention, index) => (
                <li key={index}>{intervention}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Homework */}
      <Card>
        <CardHeader>
          <CardTitle>Homework / Action Items</CardTitle>
          <CardDescription>Tasks assigned for completion before the next session.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{homework || <span className="italic text-muted-foreground">No homework assigned.</span>}</p>
        </CardContent>
      </Card>
    </div>
  );
}
