/**
 * Plan Merger Utility
 *
 * Applies SuggestedChanges to a TreatmentPlan to create an updated version.
 * This is a PURE function - no side effects, deterministic output.
 */

import type { TreatmentPlan, ClinicalGoal, ClientGoal } from '@/lib/schemas/plan';
import type { SuggestedChanges, GoalUpdate, NewGoal } from '@/lib/schemas/suggestion';

export interface MergeResult {
  /** The merged plan */
  updatedPlan: TreatmentPlan;
  /** Summary of changes made */
  changeSummary: string;
  /** List of goal IDs that had status changes */
  changedGoalIds: string[];
  /** List of new goal IDs added */
  newGoalIds: string[];
}

export interface GoalChange {
  goalId: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
}

/**
 * Apply suggested changes to a treatment plan.
 * Returns a new plan object (does not mutate input).
 */
export function applyChanges(
  currentPlan: TreatmentPlan | null,
  changes: SuggestedChanges,
  modifications?: Partial<SuggestedChanges>
): MergeResult {
  // Merge in any therapist modifications
  const effectiveChanges: SuggestedChanges = modifications
    ? mergeModifications(changes, modifications)
    : changes;

  // If no current plan, create initial plan from suggestions
  if (!currentPlan) {
    return createInitialPlan(effectiveChanges);
  }

  // Track changes for summary
  const changedGoalIds: string[] = [];
  const newGoalIds: string[] = [];
  const changeDescriptions: string[] = [];

  // 1. Apply goal status updates
  const updatedClinicalGoals = currentPlan.clinicalGoals.map(goal => {
    const update = effectiveChanges.goalUpdates.find(u => u.goalId === goal.id);
    if (update && update.suggestedStatus !== goal.status) {
      changedGoalIds.push(goal.id);
      changeDescriptions.push(
        `Goal "${goal.description.substring(0, 30)}..." status: ${goal.status} → ${update.suggestedStatus}`
      );
      return {
        ...goal,
        status: update.suggestedStatus as ClinicalGoal['status'],
      };
    }
    return goal;
  });

  // 2. Add new goals
  const newClinicalGoals: ClinicalGoal[] = effectiveChanges.newGoals.map(newGoal => {
    const id = generateGoalId();
    newGoalIds.push(id);
    changeDescriptions.push(`Added new goal: "${newGoal.description.substring(0, 40)}..."`);
    return {
      id,
      description: newGoal.description,
      status: 'IN_PROGRESS' as const,
      targetDate: newGoal.suggestedTargetDate,
    };
  });

  // 3. Create corresponding client goals for new clinical goals
  const newClientGoals: ClientGoal[] = effectiveChanges.newGoals.map((newGoal, index) => ({
    id: newGoalIds[index],
    description: newGoal.clientDescription || simplifyGoalDescription(newGoal.description),
    emoji: newGoal.emoji || '🎯',
  }));

  // 4. Update client goals to match clinical goal updates
  const updatedClientGoals = currentPlan.clientGoals.map(clientGoal => {
    // Client goals should mirror clinical goals, no status needed
    return clientGoal;
  });

  // 5. Merge interventions (add new ones, keep unique)
  const existingInterventions = new Set(currentPlan.interventions);
  const newInterventions = [
    ...effectiveChanges.interventionsUsed,
    ...effectiveChanges.suggestedInterventions.map(i => i.intervention),
  ].filter(i => !existingInterventions.has(i));

  if (newInterventions.length > 0) {
    changeDescriptions.push(`Added ${newInterventions.length} new intervention(s)`);
  }

  // 6. Update homework if changed
  let updatedHomework = currentPlan.homework;
  if (effectiveChanges.homeworkUpdate) {
    updatedHomework = effectiveChanges.homeworkUpdate.suggested;
    changeDescriptions.push('Updated homework assignment');
  }

  // 7. Update risk score, rationale, and flags if changed
  let updatedRiskScore = currentPlan.riskScore;
  let updatedRiskRationale = currentPlan.riskRationale;
  let updatedRiskFlags = currentPlan.riskFlags;
  if (effectiveChanges.riskAssessment.suggestedLevel !== currentPlan.riskScore) {
    updatedRiskScore = effectiveChanges.riskAssessment.suggestedLevel;
    changeDescriptions.push(
      `Risk level: ${currentPlan.riskScore} → ${effectiveChanges.riskAssessment.suggestedLevel}`
    );
  }
  // Always update rationale and flags from the assessment
  if (effectiveChanges.riskAssessment.rationale) {
    updatedRiskRationale = effectiveChanges.riskAssessment.rationale;
  }
  if (effectiveChanges.riskAssessment.flags && effectiveChanges.riskAssessment.flags.length > 0) {
    updatedRiskFlags = effectiveChanges.riskAssessment.flags;
  }

  // 8. Update notes if provided
  const updatedTherapistNote = effectiveChanges.therapistNote || currentPlan.therapistNote;
  const updatedClientSummary = effectiveChanges.clientSummary || currentPlan.clientSummary;

  // Build updated plan
  const updatedPlan: TreatmentPlan = {
    riskScore: updatedRiskScore,
    riskRationale: updatedRiskRationale,
    riskFlags: updatedRiskFlags,
    therapistNote: updatedTherapistNote,
    clientSummary: updatedClientSummary,
    clinicalGoals: [...updatedClinicalGoals, ...newClinicalGoals],
    clientGoals: [...updatedClientGoals, ...newClientGoals],
    interventions: [...currentPlan.interventions, ...newInterventions],
    homework: updatedHomework,
  };

  // Generate change summary
  const changeSummary = changeDescriptions.length > 0
    ? changeDescriptions.join('; ')
    : 'No changes applied';

  return {
    updatedPlan,
    changeSummary,
    changedGoalIds,
    newGoalIds,
  };
}

/**
 * Create initial plan from suggestions (for new patients).
 */
function createInitialPlan(changes: SuggestedChanges): MergeResult {
  const newGoalIds: string[] = [];
  const changeDescriptions: string[] = ['Initial treatment plan created'];

  // Create clinical goals from new goals
  const clinicalGoals: ClinicalGoal[] = changes.newGoals.map(newGoal => {
    const id = generateGoalId();
    newGoalIds.push(id);
    return {
      id,
      description: newGoal.description,
      status: 'IN_PROGRESS' as const,
      targetDate: newGoal.suggestedTargetDate,
    };
  });

  // Create client goals
  const clientGoals: ClientGoal[] = changes.newGoals.map((newGoal, index) => ({
    id: newGoalIds[index],
    description: newGoal.clientDescription || simplifyGoalDescription(newGoal.description),
    emoji: newGoal.emoji || '🎯',
  }));

  changeDescriptions.push(`${clinicalGoals.length} initial goal(s) established`);

  const updatedPlan: TreatmentPlan = {
    riskScore: changes.riskAssessment.suggestedLevel,
    riskRationale: changes.riskAssessment.rationale,
    riskFlags: changes.riskAssessment.flags,
    therapistNote: changes.therapistNote || 'Initial assessment completed.',
    clientSummary: changes.clientSummary || 'Welcome to your treatment journey.',
    clinicalGoals,
    clientGoals,
    interventions: [
      ...changes.interventionsUsed,
      ...changes.suggestedInterventions.map(i => i.intervention),
    ],
    homework: changes.homeworkUpdate?.suggested || '',
  };

  return {
    updatedPlan,
    changeSummary: changeDescriptions.join('; '),
    changedGoalIds: [],
    newGoalIds,
  };
}

/**
 * Merge therapist modifications into AI suggestions.
 */
function mergeModifications(
  original: SuggestedChanges,
  modifications: Partial<SuggestedChanges>
): SuggestedChanges {
  return {
    goalUpdates: modifications.goalUpdates ?? original.goalUpdates,
    newGoals: modifications.newGoals ?? original.newGoals,
    interventionsUsed: modifications.interventionsUsed ?? original.interventionsUsed,
    suggestedInterventions: modifications.suggestedInterventions ?? original.suggestedInterventions,
    homeworkUpdate: modifications.homeworkUpdate !== undefined
      ? modifications.homeworkUpdate
      : original.homeworkUpdate,
    riskAssessment: modifications.riskAssessment ?? original.riskAssessment,
    therapistNote: modifications.therapistNote ?? original.therapistNote,
    clientSummary: modifications.clientSummary ?? original.clientSummary,
  };
}

/**
 * Extract goal changes for history tracking.
 */
export function extractGoalChanges(
  currentPlan: TreatmentPlan | null,
  changes: SuggestedChanges
): GoalChange[] {
  if (!currentPlan) return [];

  const goalChanges: GoalChange[] = [];

  for (const update of changes.goalUpdates) {
    const existingGoal = currentPlan.clinicalGoals.find(g => g.id === update.goalId);
    if (existingGoal && existingGoal.status !== update.suggestedStatus) {
      goalChanges.push({
        goalId: update.goalId,
        previousStatus: existingGoal.status,
        newStatus: update.suggestedStatus,
        reason: update.rationale,
      });
    }
  }

  return goalChanges;
}

/**
 * Generate a unique goal ID.
 */
function generateGoalId(): string {
  return `goal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract goal status changes between two plan versions.
 * Used for tracking changes during manual edits.
 */
export function extractManualGoalChanges(
  oldPlan: TreatmentPlan | null,
  newPlan: TreatmentPlan
): GoalChange[] {
  if (!oldPlan) {
    // For new plans, all goals are "new" - record them as NEW -> their current status
    return newPlan.clinicalGoals.map(goal => ({
      goalId: goal.id,
      previousStatus: 'NEW',
      newStatus: goal.status,
      reason: 'Initial goal created',
    }));
  }

  const goalChanges: GoalChange[] = [];

  // Check each goal in the new plan
  for (const newGoal of newPlan.clinicalGoals) {
    // Try to find matching goal in old plan by ID
    let oldGoal = oldPlan.clinicalGoals.find(g => g.id === newGoal.id);

    // If not found by ID, try matching by description (for regenerated goals)
    if (!oldGoal) {
      oldGoal = oldPlan.clinicalGoals.find(
        g => g.description.toLowerCase() === newGoal.description.toLowerCase()
      );
    }

    if (oldGoal) {
      // Existing goal - check if status changed
      if (oldGoal.status !== newGoal.status) {
        goalChanges.push({
          goalId: newGoal.id,
          previousStatus: oldGoal.status,
          newStatus: newGoal.status,
          reason: 'Manual status update',
        });
      }
    } else {
      // New goal added
      goalChanges.push({
        goalId: newGoal.id,
        previousStatus: 'NEW',
        newStatus: newGoal.status,
        reason: 'New goal added',
      });
    }
  }

  return goalChanges;
}

/**
 * Simplify clinical goal description for client view.
 */
function simplifyGoalDescription(clinicalDescription: string): string {
  // Remove clinical jargon, make more accessible
  return clinicalDescription
    .replace(/reduction in/gi, 'reducing')
    .replace(/amelioration of/gi, 'improving')
    .replace(/symptomatology/gi, 'symptoms')
    .replace(/cognitive restructuring/gi, 'changing thinking patterns')
    .replace(/behavioral activation/gi, 'getting more active')
    .substring(0, 100);
}
