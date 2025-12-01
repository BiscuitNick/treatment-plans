import { z } from 'zod';

/**
 * Zod schemas for validating AI-generated suggestions.
 * These ensure the AI returns properly structured data.
 */

export const RiskLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const GoalPrioritySchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const GoalStatusSchema = z.enum([
  'ACTIVE',
  'IN_PROGRESS',
  'COMPLETED',
  'MAINTAINED',
  'DEFERRED',
  'DISCONTINUED'
]);

export const GoalUpdateSchema = z.object({
  goalId: z.string(),
  currentStatus: z.string(),
  suggestedStatus: z.string(),
  progressNote: z.string().describe('What happened this session related to this goal'),
  rationale: z.string().describe('Why this status change is suggested'),
});

export const NewGoalSchema = z.object({
  description: z.string().describe('Clinical goal description'),
  clinicalRationale: z.string().describe('Why this goal should be added'),
  suggestedTargetDate: z.string().optional().describe('Target date like "3 months" or ISO date'),
  priority: GoalPrioritySchema,
  clientDescription: z.string().optional().describe('Simplified version for client'),
  emoji: z.string().optional().describe('Single emoji for client view'),
});

export const SuggestedInterventionSchema = z.object({
  intervention: z.string(),
  rationale: z.string(),
});

export const HomeworkUpdateSchema = z.object({
  current: z.string().describe('Current homework assignment'),
  suggested: z.string().describe('Suggested new homework'),
  rationale: z.string().describe('Why this change'),
});

export const RiskAssessmentSchema = z.object({
  currentLevel: RiskLevelSchema,
  suggestedLevel: RiskLevelSchema,
  rationale: z.string().describe('Rationale for risk level'),
  flags: z.array(z.string()).describe('Specific risk flags identified'),
});

export const DiagnosisSuggestionSchema = z.object({
  code: z.string().describe('ICD-10 diagnosis code'),
  description: z.string().describe('Description of the diagnosis'),
});

export const DiagnosisUpdateSchema = z.object({
  primaryDiagnosis: DiagnosisSuggestionSchema.nullable().describe('Primary ICD-10 diagnosis or null if not determinable'),
  secondaryDiagnoses: z.array(DiagnosisSuggestionSchema).describe('Secondary diagnoses if applicable'),
  clientSummary: z.string().describe('Patient-friendly explanation of their diagnosis'),
  rationale: z.string().describe('Clinical rationale for this diagnosis'),
  isNew: z.boolean().describe('Whether this is a new diagnosis vs existing'),
});

/**
 * Main schema for AI-generated suggested changes.
 * This is what the AI should return when analyzing a session.
 */
export const SuggestedChangesSchema = z.object({
  goalUpdates: z.array(GoalUpdateSchema).describe('Updates to existing goals'),
  newGoals: z.array(NewGoalSchema).describe('New goals to add'),
  interventionsUsed: z.array(z.string()).describe('Interventions used in this session'),
  suggestedInterventions: z.array(SuggestedInterventionSchema).describe('Suggested future interventions'),
  homeworkUpdate: HomeworkUpdateSchema.nullable().describe('Homework update or null if no change'),
  riskAssessment: RiskAssessmentSchema.describe('Risk assessment for this session'),
  diagnosisUpdate: DiagnosisUpdateSchema.nullable().describe('Diagnosis update or null if unable to determine'),
  therapistNote: z.string().optional().describe('SOAP-style clinical note'),
  clientSummary: z.string().optional().describe('Warm summary for client'),
});

/**
 * Schema for the session analysis output (what AI returns)
 */
export const SessionAnalysisOutputSchema = z.object({
  sessionSummary: z.string().describe('2-3 sentence summary of what happened'),
  progressNotes: z.string().describe('Clinical progress notes for this session'),
  suggestedChanges: SuggestedChangesSchema,
});

// Type exports inferred from schemas
export type GoalUpdate = z.infer<typeof GoalUpdateSchema>;
export type NewGoal = z.infer<typeof NewGoalSchema>;
export type SuggestedIntervention = z.infer<typeof SuggestedInterventionSchema>;
export type HomeworkUpdate = z.infer<typeof HomeworkUpdateSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
export type DiagnosisSuggestion = z.infer<typeof DiagnosisSuggestionSchema>;
export type DiagnosisUpdate = z.infer<typeof DiagnosisUpdateSchema>;
export type SuggestedChanges = z.infer<typeof SuggestedChangesSchema>;
export type SessionAnalysisOutput = z.infer<typeof SessionAnalysisOutputSchema>;
