/**
 * Types for the treatment plan suggestion system.
 * These types define the structure of AI-generated suggestions
 * that therapists review before applying to treatment plans.
 */

// Re-export Prisma enums for convenience
export { SuggestionStatus, GoalStatus, ChangeType } from '@prisma/client';

/**
 * Risk levels for treatment plans
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Priority levels for new goals
 */
export type GoalPriority = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Represents a suggested update to an existing goal
 */
export interface GoalUpdate {
  /** ID of the existing goal in the treatment plan */
  goalId: string;
  /** Current status before this session */
  currentStatus: string;
  /** AI-suggested new status */
  suggestedStatus: string;
  /** What happened this session related to this goal */
  progressNote: string;
  /** Why the AI suggests this status change */
  rationale: string;
}

/**
 * Represents a new goal the AI suggests adding
 */
export interface NewGoal {
  /** Goal description */
  description: string;
  /** Clinical rationale for adding this goal */
  clinicalRationale: string;
  /** Suggested target date (ISO string or relative like "3 months") */
  suggestedTargetDate?: string;
  /** Priority level */
  priority: GoalPriority;
  /** Client-friendly version of the goal */
  clientDescription?: string;
  /** Emoji for client view */
  emoji?: string;
}

/**
 * Represents a suggested new intervention
 */
export interface SuggestedIntervention {
  /** Name/description of the intervention */
  intervention: string;
  /** Why this intervention is suggested */
  rationale: string;
}

/**
 * Represents a suggested update to homework
 */
export interface HomeworkUpdate {
  /** Current homework assignment */
  current: string;
  /** Suggested new homework */
  suggested: string;
  /** Why this change is suggested */
  rationale: string;
}

/**
 * Represents the risk assessment update
 */
export interface RiskAssessment {
  /** Current risk level */
  currentLevel: RiskLevel;
  /** Suggested risk level after this session */
  suggestedLevel: RiskLevel;
  /** Rationale for any change (or confirmation of same level) */
  rationale: string;
  /** Specific risk flags identified in the session */
  flags: string[];
}

/**
 * The main suggested changes object returned by AI analysis.
 * This is stored in PlanSuggestion.suggestedChanges as JSON.
 */
export interface SuggestedChanges {
  /** Updates to existing goals */
  goalUpdates: GoalUpdate[];

  /** New goals to add */
  newGoals: NewGoal[];

  /** Interventions used in THIS session */
  interventionsUsed: string[];

  /** Suggested new interventions for future sessions */
  suggestedInterventions: SuggestedIntervention[];

  /** Suggested homework update (null if no change) */
  homeworkUpdate: HomeworkUpdate | null;

  /** Risk assessment for this session */
  riskAssessment: RiskAssessment;

  /** Updated therapist note/SOAP summary */
  therapistNote?: string;

  /** Updated client-friendly summary */
  clientSummary?: string;
}

/**
 * Response from the session analysis endpoint
 */
export interface SessionAnalysisResponse {
  /** ID of the created suggestion */
  suggestionId: string;
  /** The suggestion data */
  suggestion: {
    id: string;
    status: string;
    sessionSummary: string;
    progressNotes: string | null;
    suggestedChanges: SuggestedChanges;
    createdAt: string;
  };
  /** Whether review is required (always true for now) */
  requiresReview: boolean;
}

/**
 * Request to approve a suggestion
 */
export interface ApproveSuggestionRequest {
  /** Optional modifications to the suggested changes */
  modifications?: Partial<SuggestedChanges>;
  /** Therapist notes about the approval */
  therapistNotes?: string;
}

/**
 * Request to reject a suggestion
 */
export interface RejectSuggestionRequest {
  /** Reason for rejection */
  reason: string;
}

/**
 * A single entry in goal history
 */
export interface GoalHistoryEntry {
  id: string;
  goalId: string;
  goalDescription: string | null;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
  changedBy: string | null;
  reason: string | null;
  sessionId: string | null;
}

/**
 * Goal with its history for display
 */
export interface GoalWithHistory {
  goalId: string;
  description: string;
  currentStatus: string;
  history: GoalHistoryEntry[];
}

/**
 * Diff view structure for comparing current plan vs suggestion
 */
export interface PlanDiff {
  /** Goals that would have status changes */
  goalChanges: {
    goalId: string;
    description: string;
    currentStatus: string;
    suggestedStatus: string;
    rationale: string;
  }[];

  /** New goals that would be added */
  newGoals: NewGoal[];

  /** Interventions that would be added */
  newInterventions: string[];

  /** Homework change if any */
  homeworkChange: HomeworkUpdate | null;

  /** Risk level change if any */
  riskChange: {
    from: RiskLevel;
    to: RiskLevel;
    rationale: string;
  } | null;
}

/**
 * Plan review due information for dashboard
 */
export interface ReviewDueItem {
  planId: string;
  patientId: string;
  patientName: string;
  lastReviewedAt: string | null;
  nextReviewDue: string | null;
  daysSinceReview: number;
  daysOverdue: number;
}
