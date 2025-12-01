import { z } from 'zod';

export const ClinicalGoalSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(["IN_PROGRESS", "COMPLETED", "DEFERRED"]),
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
  
  clinicalGoals: z.array(ClinicalGoalSchema),
  
  clientGoals: z.array(ClientGoalSchema),
  
  interventions: z.array(z.string()).describe("List of clinical techniques used (e.g. CBT Thought Record)"),
  homework: z.string().describe("Actionable tasks for next session")
});

export type ClinicalGoal = z.infer<typeof ClinicalGoalSchema>;
export type ClientGoal = z.infer<typeof ClientGoalSchema>;
export type TreatmentPlan = z.infer<typeof TreatmentPlanSchema>;
