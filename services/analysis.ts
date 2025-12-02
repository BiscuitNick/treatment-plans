import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { prisma } from '@/lib/db';
import { TreatmentPlanSchema } from '@/lib/schemas/plan';
import { validateContent } from '@/services/safety';
import { generateContextAwarePrompt, AnalysisContext } from '@/services/prompt-service';
import { generateRandomName } from '@/lib/utils/random-name';
import { SessionStatus } from '@prisma/client';

export async function processSession(transcript: string, userId?: string, sessionId?: string, patientId?: string) {
  // 1. Safety Check
  const safetyResult = await validateContent(transcript);
  
  if (!safetyResult.safeToGenerate) {
    return {
      success: false,
      error: "Safety Alert Detected",
      safetyResult
    };
  }

  // 2. Fetch Context (if patientId provided)
  const context: AnalysisContext = {
    currentPlan: null,
    recentHistory: [],
    newTranscript: transcript,
    clinicalModality: 'Integrative' // Default
  };

  let llmModel = 'gpt-5.1'; // Default

  if (userId) {
    // Fetch User Preferences
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
    });
    if (user?.preferences) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prefs = user.preferences as any;
        context.clinicalModality = prefs.clinicalModality || 'Integrative';
        if (prefs.llmModel) llmModel = prefs.llmModel;
    }
  }

  if (patientId) {
    // Fetch active plan
    const activePlan = await prisma.treatmentPlan.findUnique({
      where: { patientId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } }
    });

    if (activePlan && activePlan.versions.length > 0) {
      context.currentPlan = activePlan.versions[0].content;
    }

    // Fetch recent history (last 3 sessions)
    const recentSessions = await prisma.session.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { transcript: true }
    });

    context.recentHistory = recentSessions
      .map(s => s.transcript)
      .filter((t): t is string => t !== null);
  }

  // 3. Generate Prompts
  const { systemPrompt, userPrompt } = generateContextAwarePrompt(context);

  // 4. Generate Plan
  const result = await generateObject({
    model: openai(llmModel), // Use configured model
    schema: TreatmentPlanSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  const planData = result.object;
  let savedPlanId = null;

  // 5. Save to Database
  // If no patientId, create a new patient for this session (New Persona flow)
  let finalPatientId = patientId;
  
  if (!finalPatientId && userId) {
    // Use random name generator instead of timestamp
    const randomName = generateRandomName();
    const newPatient = await prisma.patient.create({
        data: {
            name: randomName,
            status: 'ACTIVE',
            clinicianId: userId
        }
    });
    finalPatientId = newPatient.id;
  }

  if (finalPatientId) {
    // Save Session - PROCESSED since plan is generated immediately
    await prisma.session.create({
      data: {
        patientId: finalPatientId,
        transcript,
        status: SessionStatus.PROCESSED,
      }
    });

    // Save/Update Plan
    const existingPlan = await prisma.treatmentPlan.findUnique({
      where: { patientId: finalPatientId }
    });

    if (existingPlan) {
      // Create new version
      const nextVersion = await prisma.planVersion.count({
        where: { treatmentPlanId: existingPlan.id }
      }) + 1;

      await prisma.planVersion.create({
        data: {
          treatmentPlanId: existingPlan.id,
          content: planData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          version: nextVersion,
          changeReason: "AI Session Update"
        }
      });
      savedPlanId = existingPlan.id;
    } else {
      // Create new Plan and Version
      const newPlan = await prisma.treatmentPlan.create({
        data: {
          patientId: finalPatientId,
          versions: {
            create: {
              content: planData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
              version: 1,
              changeReason: "Initial Plan"
            }
          }
        }
      });
      savedPlanId = newPlan.id;
    }
  }

  return {
    success: true,
    plan: planData,
    safetyResult,
    savedPlanId
  };
}
