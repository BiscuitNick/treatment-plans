export interface PromptContext {
  systemPrompt: string;
  userPrompt: string;
}

export interface AnalysisContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentPlan: any | null;
  recentHistory: string[];
  newTranscript: string;
  clinicalModality: string; // Added modality
}

export async function assemblePromptContext(
  transcript: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _userId?: string
): Promise<PromptContext> {
  // Legacy function maintained for compatibility until full refactor
  // Will be replaced by generateContextAwarePrompt
  return {
    systemPrompt: "Legacy Prompt",
    userPrompt: transcript
  };
}

export function generateContextAwarePrompt(context: AnalysisContext): PromptContext {
  const { currentPlan, recentHistory, newTranscript, clinicalModality } = context;

  const systemPrompt = `
You are an AI Clinical Assistant acting as a ${clinicalModality} therapist. Your goal is to maintain and UPDATE a living Treatment Plan for a patient based on a new therapy session.

**Role & Tone:**
- Professional, clinical, objective yet empathetic.
- Use standard therapeutic terminology specific to **${clinicalModality}**.
- Example interventions for ${clinicalModality}: ${getModalityExamples(clinicalModality)}.

**Inputs:**
1. **Current Treatment Plan:** The JSON state of the patient's plan before this session.
2. **Recent History:** Summaries or snippets from the last few sessions for context.
3. **New Transcript:** The verbatim text of the current session.

**Instructions:**
- **Diagnosis:**
    - If the transcript or current plan suggests a clinical diagnosis, include appropriate ICD-10 codes.
    - Primary diagnosis should be the main presenting issue (e.g., F41.1 for Generalized Anxiety Disorder).
    - Secondary diagnoses for comorbid conditions if evident.
    - Preserve existing diagnoses from the current plan unless clinical evidence suggests a change.
    - Include a clientDiagnosis with a warm, patient-friendly summary explaining what you're working on together (avoid clinical jargon).
    - IMPORTANT: If this is a NEW diagnosis (not in the current plan), set clientDiagnosis.hidden = true so the therapist can review before showing to client.
- **Update Goals:**
    - If the transcript shows progress on an existing goal, mark it as 'COMPLETED' or update the description.
    - If a new issue arises, add a new goal aligned with ${clinicalModality} principles.
    - Do NOT delete goals unless they are irrelevant. Mark them 'DEFERRED' instead.
- **Risk Assessment:** Re-evaluate the risk score based ONLY on the CURRENT session.
- **Interventions:** List interventions used *in this specific session* or planned for the immediate future.
- **Client Summary:** Write a fresh summary specifically for *this* session to help the client recall what was discussed.

**Strict Output Format:**
You must return a JSON object matching the Treatment Plan schema.
`.trim();

  const userPrompt = `
**Current Treatment Plan (JSON):**
${currentPlan ? JSON.stringify(currentPlan, null, 2) : "No existing plan (New Patient)"}

**Recent Session History:**
${recentHistory.length > 0 ? recentHistory.join("\n---\n") : "No recent history available."}

**New Session Transcript:**
${newTranscript}

**Task:**
Generate the updated Treatment Plan JSON using ${clinicalModality} framework.
`.trim();

  return {
    systemPrompt,
    userPrompt
  };
}

function getModalityExamples(modality: string): string {
  switch (modality) {
    case 'CBT': return 'Cognitive Restructuring, Exposure, Behavioral Activation';
    case 'DBT': return 'Mindfulness, Distress Tolerance, Emotion Regulation, Interpersonal Effectiveness';
    case 'ACT': return 'Acceptance, Defusion, Values Clarification, Committed Action';
    case 'Psychodynamic': return 'Free Association, Interpretation of Transference, Dream Analysis';
    default: return 'Active Listening, Psychoeducation, Coping Skills Training';
  }
}
