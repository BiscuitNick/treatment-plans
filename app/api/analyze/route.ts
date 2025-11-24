import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { TreatmentPlanSchema } from '@/lib/schemas/plan';
import { validateContent } from '@/services/safety';
import { assemblePromptContext } from '@/services/prompt-service';
import { NextResponse } from 'next/server';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, userId, sessionId } = z.object({
      transcript: z.string(),
      userId: z.string().optional(),
      sessionId: z.string().optional()
    }).parse(body);

    // 1. Safety Check
    const safetyResult = await validateContent(transcript);
    
    // If High Risk, we stop generation and return the alert
    if (!safetyResult.safeToGenerate) {
      return NextResponse.json({
        error: "Safety Alert Detected",
        safetyResult
      }, { status: 400 });
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
            content: planData as any,
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
                content: planData as any,
                version: 1
              }
            }
          }
        });
        savedPlanId = newPlan.id;
      }
    }

    return NextResponse.json({ 
      plan: planData,
      safetyResult,
      savedPlanId
    });

  } catch (error) {
    console.error("Plan Generation Error:", error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid Input", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
