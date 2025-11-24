'use server'

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { processSession } from '@/services/analysis';
import { revalidatePath } from 'next/cache';

export async function generateDemoSession(userId: string) {
  if (!userId) throw new Error("User ID is required");

  try {
    // 1. Generate Synthetic Transcript
    const { text: transcript } = await generateText({
      model: openai('gpt-4o'),
      system: `You are a scriptwriter for a clinical training simulation. 
      Write a realistic dialogue between a Therapist and a Client (approx 500 words).
      The client should exhibit symptoms of either Anxiety, Depression, or Work Stress.
      Do not include stage directions like [Client sighs], just the spoken text.
      Format: "Therapist: ... \n Client: ...`,
      prompt: "Generate a new therapy session transcript.",
    });

    // 2. Process the Session (Safety Check -> Plan Generation -> DB Save)
    const result = await processSession(transcript, userId);

    if (!result.success) {
      throw new Error(result.error || "Failed to process demo session");
    }

    // 3. Revalidate Dashboard
    revalidatePath('/dashboard');

    return { success: true, planId: result.savedPlanId };
  } catch (error: any) {
    console.error("Demo Generation Failed:", error);
    return { success: false, error: error.message };
  }
}
