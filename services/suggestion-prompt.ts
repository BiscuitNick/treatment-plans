/**
 * Prompt generation for incremental session analysis.
 *
 * Unlike the old approach that rewrites the entire plan,
 * this generates prompts that ask the AI to suggest SPECIFIC CHANGES
 * that therapists can review before applying.
 */

import type { TreatmentPlan } from '@/lib/schemas/plan';

export interface SuggestionPromptContext {
  /** Current plan content (null for new patients) */
  currentPlan: TreatmentPlan | null;
  /** The session transcript to analyze */
  transcript: string;
  /** Clinical modality (CBT, DBT, etc.) */
  clinicalModality: string;
  /** Recent session summaries for context (optional) */
  recentSessionSummaries?: string[];
}

export interface GeneratedPrompt {
  systemPrompt: string;
  userPrompt: string;
}

/**
 * Generate prompts for incremental session analysis.
 * The AI will return SuggestedChanges, not a full plan rewrite.
 */
export function generateSuggestionPrompt(context: SuggestionPromptContext): GeneratedPrompt {
  const { currentPlan, transcript, clinicalModality, recentSessionSummaries } = context;
  const isNewPatient = !currentPlan;

  const systemPrompt = `You are an AI Clinical Assistant specializing in ${clinicalModality} therapy. Your role is to analyze therapy sessions and suggest SPECIFIC, INCREMENTAL updates to treatment plans.

## CRITICAL INSTRUCTIONS

${isNewPatient ? `
### NEW PATIENT MODE
This is a new patient without an existing treatment plan. You will:
1. Analyze the intake session to understand presenting concerns
2. Suggest initial goals based on what was discussed
3. Identify risk factors and set initial risk level
4. Do NOT make up information not present in the transcript
` : `
### EXISTING PATIENT MODE
This patient has an existing treatment plan. You will:
1. Analyze how this session relates to EXISTING goals
2. Suggest status changes ONLY if clearly warranted by session content
3. Suggest NEW goals ONLY if genuinely new issues emerged
4. Do NOT rewrite existing goal descriptions unless factually incorrect
5. PRESERVE continuity - therapy is a long journey, not reset each session
`}

## YOUR OUTPUT MUST BE STRUCTURED JSON

You must return a JSON object with EXACTLY this structure:

{
  "sessionSummary": "2-3 sentence summary of the session",
  "progressNotes": "Clinical progress notes (SOAP format preferred)",
  "suggestedChanges": {
    "goalUpdates": [
      {
        "goalId": "string - ID of existing goal",
        "currentStatus": "current status from plan",
        "suggestedStatus": "ACTIVE|IN_PROGRESS|COMPLETED|MAINTAINED|DEFERRED|DISCONTINUED",
        "progressNote": "what happened this session related to this goal",
        "rationale": "why you suggest this status change"
      }
    ],
    "newGoals": [
      {
        "description": "clinical goal description",
        "clinicalRationale": "why this goal should be added",
        "suggestedTargetDate": "e.g., '3 months' or specific date",
        "priority": "HIGH|MEDIUM|LOW",
        "clientDescription": "simplified version for client",
        "emoji": "single relevant emoji"
      }
    ],
    "interventionsUsed": ["list of interventions used THIS session"],
    "suggestedInterventions": [
      {
        "intervention": "name of intervention",
        "rationale": "why it might help"
      }
    ],
    "homeworkUpdate": {
      "current": "current homework or empty string",
      "suggested": "new homework assignment",
      "rationale": "why this homework"
    } or null if no change needed,
    "riskAssessment": {
      "currentLevel": "LOW|MEDIUM|HIGH",
      "suggestedLevel": "LOW|MEDIUM|HIGH",
      "rationale": "assessment reasoning",
      "flags": ["any specific risk flags identified"]
    },
    "therapistNote": "SOAP-style clinical note for this session",
    "clientSummary": "warm, empathetic summary for the client"
  }
}

## ${clinicalModality.toUpperCase()} FRAMEWORK

Use ${clinicalModality} principles when:
- Framing goals and interventions
- Selecting appropriate techniques
- Writing clinical notes

Common ${clinicalModality} interventions: ${getModalityInterventions(clinicalModality)}

## IMPORTANT GUIDELINES

1. **Be Conservative**: Only suggest status changes with clear evidence from the session
2. **Preserve History**: Don't suggest removing or drastically changing goals without strong justification
3. **Focus on Progress**: Note even small progress toward goals
4. **Risk Assessment**: Always assess risk based on THIS session's content
5. **Client Language**: Client-facing content should be warm, non-clinical, and encouraging
6. **No Fabrication**: Only reference what's actually in the transcript`.trim();

  const userPrompt = buildUserPrompt(currentPlan, transcript, recentSessionSummaries, isNewPatient);

  return { systemPrompt, userPrompt };
}

function buildUserPrompt(
  currentPlan: TreatmentPlan | null,
  transcript: string,
  recentSessionSummaries?: string[],
  isNewPatient?: boolean
): string {
  const parts: string[] = [];

  if (isNewPatient) {
    parts.push(`## PATIENT STATUS: NEW PATIENT (No existing plan)

This is an intake or early session. Create initial treatment recommendations.`);
  } else {
    parts.push(`## CURRENT TREATMENT PLAN

\`\`\`json
${JSON.stringify(currentPlan, null, 2)}
\`\`\``);
  }

  if (recentSessionSummaries && recentSessionSummaries.length > 0) {
    parts.push(`## RECENT SESSION CONTEXT

${recentSessionSummaries.map((s, i) => `### Session ${recentSessionSummaries.length - i} sessions ago:\n${s}`).join('\n\n')}`);
  }

  parts.push(`## SESSION TRANSCRIPT

${transcript}`);

  parts.push(`## YOUR TASK

Analyze this session and provide your structured response as JSON.
${isNewPatient
  ? 'Since this is a new patient, focus on creating appropriate initial goals and assessments.'
  : 'Focus on what CHANGED or PROGRESSED in this session relative to the existing plan. Be conservative with status changes.'
}`);

  return parts.join('\n\n');
}

function getModalityInterventions(modality: string): string {
  const interventions: Record<string, string> = {
    'CBT': 'Cognitive Restructuring, Behavioral Activation, Exposure Therapy, Thought Records, Socratic Questioning, Activity Scheduling',
    'DBT': 'Mindfulness Skills, Distress Tolerance (TIPP, ACCEPTS), Emotion Regulation, Interpersonal Effectiveness (DEAR MAN, GIVE, FAST), Diary Cards',
    'ACT': 'Acceptance Exercises, Cognitive Defusion, Values Clarification, Committed Action, Self-as-Context, Present Moment Awareness',
    'Psychodynamic': 'Free Association, Transference Analysis, Dream Interpretation, Exploring Defense Mechanisms, Working Through, Interpretation',
    'EMDR': 'Bilateral Stimulation, Target Identification, Desensitization, Installation, Body Scan, Future Template',
    'MI': 'Open-Ended Questions, Affirmations, Reflective Listening, Summarizing, Developing Discrepancy, Rolling with Resistance',
    'Integrative': 'Psychoeducation, Active Listening, Coping Skills Training, Mindfulness, Cognitive Techniques, Behavioral Strategies',
  };

  return interventions[modality] || interventions['Integrative'];
}

/**
 * Generate a prompt for creating the initial treatment plan (intake).
 * Used for new patients or when explicitly creating a baseline plan.
 */
export function generateInitialPlanPrompt(
  transcript: string,
  clinicalModality: string
): GeneratedPrompt {
  return generateSuggestionPrompt({
    currentPlan: null,
    transcript,
    clinicalModality,
    recentSessionSummaries: [],
  });
}
