import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { prisma } from '@/lib/db';
import { TreatmentPlanSchema } from '@/lib/schemas/plan';
import { validateContent } from '@/services/safety';
import { assemblePromptContext } from '@/services/prompt-service';

export async function processSession(transcript: string, userId?: string, sessionId?: string) {
  // 1. Safety Check
  const safetyResult = await validateContent(transcript);
  
  // If High Risk, we stop generation and return the alert
  if (!safetyResult.safeToGenerate) {
    return {
      success: false,
      error: "Safety Alert Detected",
      safetyResult
    };
  }

  // 2. Assemble Prompts
  const { systemPrompt, userPrompt } = await assemblePromptContext(transcript, userId);

  // 3. Generate Plan
  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: TreatmentPlanSchema,
    system: systemPrompt,
    prompt: userPrompt,
  });

  const planData = result.object;
  let savedPlanId = null;

  // 4. Save to Database (if userId is provided)
  if (userId) {
    let targetSessionId = sessionId;

    // Ensure Session Exists
    if (!targetSessionId) {
      const newSession = await prisma.session.create({
        data: {
          userId: userId,
          transcript: transcript,
        }
      });
      targetSessionId = newSession.id;
    }

    // Check for existing Plan
    const existingPlan = await prisma.treatmentPlan.findFirst({
      where: { sessionId: targetSessionId }
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
          version: nextVersion
        }
      });
      savedPlanId = existingPlan.id;
    } else {
      // Create new Plan and Version
      const newPlan = await prisma.treatmentPlan.create({
        data: {
          sessionId: targetSessionId,
                      versions: {
                        create: {
                          content: planData as any, // eslint-disable-line @typescript-eslint/no-explicit-any
                          version: 1
                        }
                      }        }
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
