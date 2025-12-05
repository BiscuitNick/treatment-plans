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
  /** The session content to analyze (summary preferred, transcript as fallback) */
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
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  const systemPrompt = `You are an AI Clinical Assistant specializing in ${clinicalModality} therapy. Your role is to analyze therapy sessions and suggest SPECIFIC, INCREMENTAL updates to treatment plans.

## CURRENT DATE: ${currentDate}

When suggesting target dates for goals, they MUST be in the future relative to today (${currentDate}). Use relative timeframes like "3 months" or specific future dates.

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
1. Analyze how this session relates to EXISTING goals - check EVERY existing goal
2. UPDATE existing goal statuses based on progress (use COMPLETED/MAINTAINED when warranted)
3. Create NEW goals ONLY for genuinely NEW clinical concerns not covered by existing goals
4. Do NOT rewrite existing goal descriptions unless factually incorrect
5. PRESERVE continuity - therapy is a long journey, not reset each session
6. If session discusses termination/maintenance, prioritize marking goals COMPLETED or MAINTAINED
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
        "suggestedTargetDate": "relative timeframe like '3 months' or FUTURE date after today",
        "priority": "HIGH|MEDIUM|LOW",
        "clientDescription": "simplified version for client",
        "emoji": "single relevant emoji"
      }
    ],
    "interventionsUsed": ["1-2 interventions from CANONICAL LIST only"],
    "suggestedInterventions": [],
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
    "diagnosisUpdate": {
      "primaryDiagnosis": {
        "code": "ICD-10 code like F41.1",
        "description": "Diagnosis name"
      } or null if not determinable,
      "secondaryDiagnoses": [{"code": "...", "description": "..."}],
      "clientSummary": "patient-friendly explanation of what you're working on",
      "rationale": "clinical rationale for this diagnosis",
      "isNew": true/false whether this is a new diagnosis
    } or null if unable to determine from session,
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
6. **No Fabrication**: Only reference what's actually in the transcript
7. **Diagnosis**: If transcript suggests a clinical diagnosis, include appropriate ICD-10 codes. Preserve existing diagnoses unless evidence suggests change. Set diagnosisUpdate to null if unable to determine from session content. For new diagnoses, set isNew: true.

## GOAL STATUS GUIDELINES (CRITICAL)

**PRIORITIZE updating existing goals over creating new ones.**

**COMPLETED** - Use when:
- Patient reports symptom resolution or goal achievement
- Session focuses on termination planning for this specific issue
- Clinical measures show targets have been met
- Patient demonstrates sustained improvement over multiple sessions

**MAINTAINED** - Use when:
- Goal was previously achieved and patient is maintaining gains
- Session discusses maintenance strategies for this issue
- Focus has shifted from active treatment to relapse prevention
- Patient is in termination phase but gains are stable

**IN_PROGRESS** - Use when:
- Active therapeutic work continues toward the goal
- Partial progress is being made
- Goal remains a focus of treatment

**DEFERRED** - Use when:
- Goal is temporarily on hold due to other priorities
- External circumstances prevent active work on this goal

**DISCONTINUED** - Use when:
- Goal is no longer clinically relevant
- Treatment direction has fundamentally changed

## TERMINATION & PROGRESS INDICATORS

If the session includes ANY of these, strongly consider marking relevant goals as COMPLETED or MAINTAINED:
- Termination planning discussions
- Relapse prevention planning
- Patient reports significant/sustained improvement
- Maintenance strategy development
- Patient expresses readiness to end treatment
- Review of progress and consolidation of gains
- Discussion of "what worked" and future self-management

## GOAL REDUNDANCY PREVENTION

BEFORE creating any new goal:
1. Review EACH existing goal in the plan
2. Check if the session content relates to an existing goal
3. If it does, UPDATE that goal's status instead of creating a new one
4. ONLY create new goals for genuinely NEW clinical concerns not already covered

Do NOT create goals that:
- Overlap with existing goals
- Reframe existing goals in different words
- Break down existing goals into sub-goals (unless explicitly requested)

## CLIENT GOALS REQUIREMENTS

Client goals (clientDescription) MUST:
- Have a 1:1 correspondence with the clinical goal
- Cover the SAME clinical concern in patient-friendly language
- NOT introduce new concepts not in the clinical goal
- Use warm, encouraging, accessible language
- AVOID clinical jargon (no "symptom reduction", "cognitive restructuring", "affect regulation", etc.)

Good example:
- Clinical: "Reduce frequency and severity of panic attacks through exposure-based interventions"
- Client: "Feel more confident handling anxious moments without them taking over your day"

Bad example:
- Clinical: "Reduce anxiety symptoms"
- Client: "Work on trauma processing and attachment patterns" (introduces new concepts!)

## INTERVENTION RULES (CRITICAL)

**CANONICAL INTERVENTIONS LIST** - Use ONLY these exact names:
${getCanonicalInterventionsList()}

**Rules:**
- Use ONLY names from the canonical list above - no variations, no elaborations
- Maximum 1-2 interventions per session in "interventionsUsed"
- Leave "suggestedInterventions" as empty array []
- Do NOT include interventions already in the existing plan
- Use umbrella terms (e.g., "Relaxation Techniques" not "breathing exercises", "progressive muscle relaxation", etc.)
- "CBT" covers all CBT techniques - don't add "Cognitive Restructuring" if "CBT" is already present`.trim();

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

  parts.push(`## SESSION CONTENT

${transcript}`);

  parts.push(`## YOUR TASK

Analyze this session and provide your structured response as JSON.
${isNewPatient
  ? 'Since this is a new patient, focus on creating appropriate initial goals and assessments.'
  : `PRIORITY ORDER for existing patients:
1. First, check EACH existing goal and determine if this session shows progress
2. Update goal statuses to COMPLETED or MAINTAINED if the session indicates achievement or maintenance
3. Only THEN consider if any genuinely NEW clinical concerns emerged that aren't covered by existing goals
4. Do NOT create new goals that overlap with or reframe existing goals`
}`);

  return parts.join('\n\n');
}

// Canonical intervention names - use these EXACT names only
const CANONICAL_INTERVENTIONS = [
  'CBT',
  'DBT',
  'ACT',
  'Psychodynamic Therapy',
  'EMDR',
  'Motivational Interviewing',
  'Relaxation Techniques',
  'Mindfulness',
  'Exposure Therapy',
  'Behavioral Activation',
  'Cognitive Restructuring',
  'Thought Records',
  'Values Clarification',
  'Distress Tolerance Skills',
  'Emotion Regulation',
  'Sleep Hygiene',
  'Journaling',
  'Psychoeducation',
];

function getModalityInterventions(modality: string): string {
  const interventions: Record<string, string> = {
    'CBT': 'CBT, Cognitive Restructuring, Behavioral Activation, Exposure Therapy, Thought Records',
    'DBT': 'DBT, Mindfulness, Distress Tolerance Skills, Emotion Regulation',
    'ACT': 'ACT, Mindfulness, Values Clarification, Behavioral Activation',
    'Psychodynamic': 'Psychodynamic Therapy, Journaling',
    'EMDR': 'EMDR, Relaxation Techniques, Mindfulness',
    'MI': 'Motivational Interviewing, Psychoeducation',
    'Integrative': 'Psychoeducation, Mindfulness, Cognitive Restructuring, Behavioral Activation, Relaxation Techniques',
  };

  return interventions[modality] || interventions['Integrative'];
}

function getCanonicalInterventionsList(): string {
  return CANONICAL_INTERVENTIONS.join(', ');
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
