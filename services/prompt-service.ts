import { prisma } from '@/lib/db';

export interface PromptContext {
  systemPrompt: string;
  userPrompt: string;
}

export async function assemblePromptContext(
  transcript: string,
  userId?: string
): Promise<PromptContext> {
  
  // Placeholder for Therapist Preferences
  // In a full implementation, we would fetch these from the User model:
  // const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  const therapistPreferences = {
    modality: "Cognitive Behavioral Therapy (CBT)",
    tone: "Professional, clinical, yet empathetic",
    language: "English"
  };

  // Placeholder for Previous Plan Context
  // In a full implementation with Client/Patient entities, we would fetch the last plan:
  // const lastPlan = await prisma.treatmentPlan.findFirst({ ... });
  const previousPlanContext = "No previous treatment plan available for reference.";

  const systemPrompt = `
You are an AI Clinical Assistant designed to help therapists create structured treatment plans from session transcripts.
You must analyze the transcript and produce a JSON output matching the defined schema.

**Guidelines:**
1. **Clinical Goals:** Extract specific, measurable goals based on the session content.
2. **Client Goals:** Rephrase the clinical goals into warm, first-person language that the client would understand and feel empowered by.
3. **Risk Assessment:** Evaluate the transcript for any immediate risks (Self-harm, Harm to others).
4. **Interventions:** List specific therapeutic techniques used or recommended (based on the ${therapistPreferences.modality} modality).
5. **Tone:** Maintain a ${therapistPreferences.tone} tone in the notes.

**Context:**
${previousPlanContext}
`.trim();

  const userPrompt = `
**Session Transcript:**
${transcript}

**Task:**
Generate a structured treatment plan based on the transcript above.
`.trim();

  return {
    systemPrompt,
    userPrompt
  };
}
