import { z } from 'zod';

export const DiagnosisSchema = z.object({
  code: z.string().describe("ICD-10 diagnosis code"),
  description: z.string().optional().describe("Description of the diagnosis")
});

export const ClientDiagnosisSchema = z.object({
  summary: z.string().describe("Patient-friendly explanation of their diagnosis"),
  hidden: z.boolean().default(true).describe("Whether to hide diagnosis from client view - defaults to hidden until therapist approves")
});

export const ClinicalGoalSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(["ACTIVE", "IN_PROGRESS", "COMPLETED", "MAINTAINED", "DEFERRED", "DISCONTINUED"]),
  targetDate: z.string().optional()
});

export const ClientGoalSchema = z.object({
  id: z.string(), // Must match clinicalGoals ID
  description: z.string().describe("Simplified, empowering version of the clinical goal"),
  emoji: z.string().default('🎯').describe("A relevant single emoji")
});

export const TreatmentPlanSchema = z.object({
  riskScore: z.enum(["LOW", "MEDIUM", "HIGH"]),
  riskRationale: z.string().optional().describe("Explanation of the risk assessment"),
  riskFlags: z.array(z.string()).optional().describe("Specific risk indicators identified"),
  therapistNote: z.string().describe("Professional SOAP note summary"),
  clientSummary: z.string().describe("Warm, empathetic summary for the client"),

  // Diagnosis codes
  primaryDiagnosis: DiagnosisSchema.optional().describe("Primary ICD-10 diagnosis"),
  secondaryDiagnoses: z.array(DiagnosisSchema).optional().describe("Secondary ICD-10 diagnoses"),
  clientDiagnosis: ClientDiagnosisSchema.optional().describe("Patient-friendly diagnosis explanation"),

  clinicalGoals: z.array(ClinicalGoalSchema),

  clientGoals: z.array(ClientGoalSchema),

  interventions: z.array(z.string()).describe("List of clinical techniques used (e.g. CBT Thought Record)"),
  homework: z.string().describe("Actionable tasks for next session")
});

export type Diagnosis = z.infer<typeof DiagnosisSchema>;
export type ClientDiagnosis = z.infer<typeof ClientDiagnosisSchema>;
export type ClinicalGoal = z.infer<typeof ClinicalGoalSchema>;
export type ClientGoal = z.infer<typeof ClientGoalSchema>;
export type TreatmentPlan = z.infer<typeof TreatmentPlanSchema>;
