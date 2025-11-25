/**
 * Service for generating and managing treatment plan suggestions.
 *
 * This replaces the old "auto-commit" flow with a "suggest and review" flow:
 * 1. AI analyzes session → creates PlanSuggestion (PENDING)
 * 2. Therapist reviews suggestion
 * 3. Therapist approves/modifies/rejects
 * 4. Only on approval: PlanVersion created, TreatmentPlan updated
 */

import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { prisma } from '@/lib/db';
import { SessionAnalysisOutputSchema, type SessionAnalysisOutput } from '@/lib/schemas/suggestion';
import { TreatmentPlanSchema, type TreatmentPlan } from '@/lib/schemas/plan';
import { generateSuggestionPrompt } from '@/services/suggestion-prompt';
import { validateContent } from '@/services/safety';
import { SuggestionStatus } from '@prisma/client';

export interface CreateSuggestionResult {
  success: boolean;
  suggestionId?: string;
  suggestion?: {
    id: string;
    status: SuggestionStatus;
    sessionSummary: string;
    progressNotes: string | null;
    suggestedChanges: SessionAnalysisOutput['suggestedChanges'];
    createdAt: Date;
  };
  error?: string;
  safetyResult?: {
    safeToGenerate: boolean;
    riskLevel: string;
    reasoning?: string;
  };
}

/**
 * Analyze a session and create a PlanSuggestion for therapist review.
 * Does NOT auto-update the treatment plan.
 */
export async function createSessionSuggestion(
  sessionId: string,
  userId?: string
): Promise<CreateSuggestionResult> {
  // 1. Fetch session with patient and plan data
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      patient: {
        include: {
          treatmentPlan: {
            include: {
              versions: {
                orderBy: { version: 'desc' },
                take: 1,
              },
            },
          },
          clinician: {
            select: { preferences: true },
          },
        },
      },
      suggestion: true,
    },
  });

  if (!session) {
    return { success: false, error: 'Session not found' };
  }

  if (!session.transcript) {
    return { success: false, error: 'Session has no transcript' };
  }

  // Check if suggestion already exists for this session
  if (session.suggestion) {
    return {
      success: true,
      suggestionId: session.suggestion.id,
      suggestion: {
        id: session.suggestion.id,
        status: session.suggestion.status,
        sessionSummary: session.suggestion.sessionSummary,
        progressNotes: session.suggestion.progressNotes,
        suggestedChanges: session.suggestion.suggestedChanges as SessionAnalysisOutput['suggestedChanges'],
        createdAt: session.suggestion.createdAt,
      },
    };
  }

  // 2. Safety check on transcript
  const safetyResult = await validateContent(session.transcript);
  if (!safetyResult.safeToGenerate) {
    return {
      success: false,
      error: 'Safety Alert Detected',
      safetyResult: {
        safeToGenerate: false,
        riskLevel: safetyResult.riskLevel,
        reasoning: safetyResult.reasoning,
      },
    };
  }

  // 3. Get current plan content (if exists)
  let currentPlan: TreatmentPlan | null = null;
  if (session.patient.treatmentPlan?.versions?.[0]?.content) {
    try {
      currentPlan = TreatmentPlanSchema.parse(session.patient.treatmentPlan.versions[0].content);
    } catch {
      // If plan doesn't match schema, treat as new patient
      currentPlan = null;
    }
  }

  // 4. Get clinical modality from preferences
  const preferences = session.patient.clinician.preferences as Record<string, unknown> | null;
  const clinicalModality = (preferences?.clinicalModality as string) || 'Integrative';
  const llmModel = (preferences?.llmModel as string) || 'gpt-4o';

  // 5. Fetch recent session summaries for context
  const recentSessions = await prisma.planSuggestion.findMany({
    where: {
      treatmentPlan: {
        patientId: session.patientId,
      },
      status: { in: ['APPROVED', 'MODIFIED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { sessionSummary: true },
  });
  const recentSessionSummaries = recentSessions.map(s => s.sessionSummary);

  // 6. Generate prompt
  const { systemPrompt, userPrompt } = generateSuggestionPrompt({
    currentPlan,
    transcript: session.transcript,
    clinicalModality,
    recentSessionSummaries,
  });

  // 7. Call AI
  const result = await generateObject({
    model: openai(llmModel),
    schema: SessionAnalysisOutputSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  const analysisOutput = result.object;

  // 8. Ensure treatment plan exists (create if needed for new patients)
  let treatmentPlanId: string;
  if (session.patient.treatmentPlan) {
    treatmentPlanId = session.patient.treatmentPlan.id;
  } else {
    const newPlan = await prisma.treatmentPlan.create({
      data: {
        patientId: session.patientId,
        // nextReviewDue will be set when first version is approved
      },
    });
    treatmentPlanId = newPlan.id;
  }

  // 9. Create PlanSuggestion (PENDING status)
  const suggestion = await prisma.planSuggestion.create({
    data: {
      treatmentPlanId,
      sessionId,
      status: 'PENDING',
      suggestedChanges: analysisOutput.suggestedChanges,
      sessionSummary: analysisOutput.sessionSummary,
      progressNotes: analysisOutput.progressNotes,
    },
  });

  // 10. Update session with progress note
  await prisma.session.update({
    where: { id: sessionId },
    data: {
      progressNote: analysisOutput.progressNotes,
    },
  });

  return {
    success: true,
    suggestionId: suggestion.id,
    suggestion: {
      id: suggestion.id,
      status: suggestion.status,
      sessionSummary: suggestion.sessionSummary,
      progressNotes: suggestion.progressNotes,
      suggestedChanges: analysisOutput.suggestedChanges,
      createdAt: suggestion.createdAt,
    },
    safetyResult: {
      safeToGenerate: true,
      riskLevel: analysisOutput.suggestedChanges.riskAssessment.suggestedLevel,
    },
  };
}

/**
 * Get a pending suggestion for a session (if exists)
 */
export async function getPendingSuggestion(sessionId: string) {
  return prisma.planSuggestion.findUnique({
    where: { sessionId },
    include: {
      session: {
        select: {
          transcript: true,
          patient: {
            select: { name: true },
          },
        },
      },
      treatmentPlan: {
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      },
    },
  });
}

/**
 * Get all pending suggestions for a clinician's patients
 */
export async function getPendingSuggestionsForClinician(clinicianId: string) {
  return prisma.planSuggestion.findMany({
    where: {
      status: 'PENDING',
      treatmentPlan: {
        patient: {
          clinicianId,
        },
      },
    },
    include: {
      session: {
        select: {
          createdAt: true,
          patient: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
