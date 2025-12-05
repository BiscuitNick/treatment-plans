'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TreatmentPlan, ClinicalGoal } from "@/lib/schemas/plan";

interface TherapistViewProps {
  plan: TreatmentPlan;
}

const renderGoalStatus = (status: ClinicalGoal['status']) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Active</Badge>;
    case 'IN_PROGRESS':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">In Progress</Badge>;
    case 'COMPLETED':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
    case 'MAINTAINED':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Maintained</Badge>;
    case 'DEFERRED':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Deferred</Badge>;
    case 'DISCONTINUED':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Discontinued</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
};

export function TherapistView({ plan }: TherapistViewProps) {
  const { riskScore, riskRationale, riskFlags, therapistNote, clinicalGoals, interventions, homework, primaryDiagnosis, secondaryDiagnoses } = plan;

  return (
    <div className="space-y-6 w-full overflow-hidden">
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
        {(riskRationale || (riskFlags && riskFlags.length > 0)) && (
          <CardContent className="space-y-3">
            {riskRationale && (
              <p className="text-sm text-muted-foreground">{riskRationale}</p>
            )}
            {riskFlags && riskFlags.length > 0 && (
              <div className="overflow-hidden">
                <h4 className="text-sm font-medium mb-2">Risk Flags</h4>
                <div className="flex flex-wrap gap-2">
                  {riskFlags.map((flag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs whitespace-normal text-left shrink break-words h-auto py-1">
                      {flag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnosis</CardTitle>
          <CardDescription>Primary and secondary diagnostic codes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 overflow-hidden">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">Primary</span>
            {primaryDiagnosis ? (
              <span className="text-sm min-w-0 break-words">
                <Badge variant="secondary" className="font-mono mr-2">{primaryDiagnosis.code}</Badge>
                {primaryDiagnosis.description}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground italic">None</span>
            )}
          </div>
          {secondaryDiagnoses && secondaryDiagnoses.length > 0 && (
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-sm font-medium text-muted-foreground w-20 shrink-0">Secondary</span>
              <div className="space-y-1 min-w-0">
                {secondaryDiagnoses.map((diagnosis, idx) => (
                  <div key={idx} className="text-sm break-words">
                    <Badge variant="secondary" className="font-mono mr-2">{diagnosis.code}</Badge>
                    {diagnosis.description}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Therapist Note (SOAP - Objective/Assessment) */}
      <Card>
        <CardHeader>
          <CardTitle>Therapist Note</CardTitle>
          <CardDescription>Professional observations and clinical assessment.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-hidden">
          <p className="whitespace-pre-wrap break-words">{therapistNote}</p>
        </CardContent>
      </Card>

      {/* Clinical Goals (SOAP - Plan) */}
      <Card>
        <CardHeader>
          <CardTitle>Clinical Goals</CardTitle>
          <CardDescription>Specific, measurable, achievable, relevant, time-bound objectives.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 overflow-hidden">
          {(clinicalGoals || []).length === 0 ? (
            <p className="text-muted-foreground italic">No clinical goals defined.</p>
          ) : (
            (clinicalGoals || []).map((goal, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="shrink-0">{renderGoalStatus(goal.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium break-words">{goal.description}</p>
                  {goal.targetDate && (
                    <p className="text-sm text-muted-foreground">Target: {goal.targetDate}</p>
                  )}
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
        <CardContent className="overflow-hidden">
          {(interventions || []).length === 0 ? (
            <p className="text-muted-foreground italic">No interventions noted.</p>
          ) : (
            <ul className="list-disc list-inside space-y-1">
              {(interventions || []).map((intervention, index) => (
                <li key={index} className="break-words">{intervention}</li>
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
        <CardContent className="overflow-hidden">
          <p className="whitespace-pre-wrap break-words">{homework || <span className="italic text-muted-foreground">No homework assigned.</span>}</p>
        </CardContent>
      </Card>
    </div>
  );
}
