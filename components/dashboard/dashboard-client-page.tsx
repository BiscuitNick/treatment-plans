'use client'

import { useState } from 'react';
import { UploadSessionDialog } from '@/components/dashboard/upload-session-dialog';
import { SessionList } from '@/components/dashboard/session-list';
import { DualViewPlan } from '@/components/plan/DualViewPlan';
import { MagicButton } from '@/components/dashboard/magic-button';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TreatmentPlan } from '@/lib/schemas/plan'; // Import the Zod schema type
import { SafetyCheckResult, RiskLevel } from '@/services/safety';
import { AlertTriangle } from 'lucide-react';

const mockTreatmentPlan: TreatmentPlan = {
  riskScore: 'MEDIUM',
  therapistNote: `Patient presented with increased anxiety symptoms related to work stress and social gatherings. Reports difficulty sleeping and occasional panic attacks. Goal-setting focused on developing coping mechanisms and gradual exposure to social situations.`,
  clientSummary: `It sounds like you've been feeling overwhelmed with worries about work and social events. We're going to work together on some strategies to help you feel more at ease and confident in these situations.`,
  clinicalGoals: [
    { id: '1', description: 'Reduce GAD symptoms by 30% as measured by GAD-7 score.', status: 'IN_PROGRESS', targetDate: '2025-12-31' },
    { id: '2', description: 'Implement 3 new coping strategies for social anxiety.', status: 'IN_PROGRESS' },
    { id: '3', description: 'Engage in 2 planned social activities per week.', status: 'DEFERRED' },
  ],
  clientGoals: [
    { id: '1', description: 'Feel calmer and more in control when facing stressful situations.', emoji: '🧘‍♀️' },
    { id: '2', description: 'Learn new ways to handle social discomfort.', emoji: '🤝' },
    { id: '3', description: 'Connect with friends and family more often.', emoji: '😊' },
  ],
  interventions: [
    'Cognitive Behavioral Therapy (CBT)',
    'Relaxation Techniques (Deep Breathing)',
    'Exposure Therapy (gradual social engagement)',
  ],
  homework: `Practice deep breathing exercises daily for 10 minutes. Identify one small social interaction to engage in before next session.`,
};

const mockSafetyResult: SafetyCheckResult = {
  safeToGenerate: true,
  riskLevel: RiskLevel.LOW,
  riskFlags: [],
  reasoning: 'No immediate safety concerns detected.',
};

export function DashboardClientPage({ sessions, user }: { sessions: any[], user: any }) {
  const [isPlanViewerOpen, setIsPlanViewerOpen] = useState(false);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Therapist Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name}. Here are your recent sessions.
          </p>
        </div>
        <div className="flex space-x-2">
            <MagicButton userId={user.id} />
            
          {/* Button to open DualViewPlan with mock data */}
          <Dialog open={isPlanViewerOpen} onOpenChange={setIsPlanViewerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <AlertTriangle className="h-4 w-4" /> View Sample Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl p-0"> {/* Adjusted for larger content */}
              <DialogHeader className="p-6 pb-2">
                <DialogTitle>Treatment Plan Viewer</DialogTitle>
              </DialogHeader>
              <div className="p-6 pt-0">
                <DualViewPlan plan={mockTreatmentPlan} safetyResult={mockSafetyResult} />
              </div>
            </DialogContent>
          </Dialog>
          <UploadSessionDialog userId={user.id} />
        </div>
      </div>

      <SessionList sessions={sessions} />
    </div>
  );
}
