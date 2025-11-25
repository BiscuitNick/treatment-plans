'use server'

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { processSession } from '@/services/analysis';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';

export async function generateDemoSession(userId: string, patientId?: string) {
  if (!userId) throw new Error("User ID is required");

  try {
    let contextPrompt = "";

    if (patientId) {
      // 1a. Fetch Patient Context
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          treatmentPlan: {
            include: {
              versions: { orderBy: { version: 'desc' }, take: 1 }
            }
          },
          sessions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { transcript: true }
          }
        }
      });

      if (patient) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const plan = patient.treatmentPlan?.versions[0]?.content as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const goals = plan?.clinicalGoals?.map((g: any) => g.description).join(", ") || "No goals set";
        const lastSession = patient.sessions[0]?.transcript || "No prior session";

        contextPrompt = `
        **Patient Context:**
        The patient is ${patient.name}.
        Current Goals: ${goals}.
        Risk Score: ${plan?.riskScore || "Unknown"}.
        
        **Context from Last Session:**
        ${lastSession.substring(0, 500)}... (truncated)

        **Instruction:**
        Generate a session that follows up on the previous session and addresses the current goals.
        The patient should report progress or challenges related to: ${goals}.
        `;
      }
    } else {
      // 1b. Default New Persona Context
      contextPrompt = `
      The client should exhibit symptoms of either Anxiety, Depression, or Work Stress.
      Create a new persona with a unique name and background.
      `;
    }

    // 2. Generate Synthetic Transcript
    const { text: transcript } = await generateText({
      model: openai('gpt-4o'),
      system: `You are a scriptwriter for a clinical training simulation. 
      Write a realistic dialogue between a Therapist and a Client (approx 500 words).
      Do not include stage directions like [Client sighs], just the spoken text.
      Format: "Therapist: ... \n Client: ..."
      ${contextPrompt}`,
      prompt: "Generate a new therapy session transcript.",
    });

    // 3. Process the Session (Safety Check -> Plan Generation -> DB Save)
    // Pass patientId if we have it
    const result = await processSession(transcript, userId, undefined, patientId);

    if (!result.success) {
      throw new Error(result.error || "Failed to process demo session");
    }

    // 4. Revalidate Dashboard
    revalidatePath('/dashboard');
    if (patientId) revalidatePath(`/patients/${patientId}`);

    return { success: true, planId: result.savedPlanId };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Demo Generation Failed:", error);
    return { success: false, error: error.message };
  }
}