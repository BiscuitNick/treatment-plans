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

  // 5. Merge interventions with consolidation and deduplication
  const incomingInterventions = [
    ...effectiveChanges.interventionsUsed,
    ...effectiveChanges.suggestedInterventions.map(i => i.intervention),
  ];
  const interventionMerge = mergeInterventions(currentPlan.interventions, incomingInterventions);

  if (interventionMerge.added > 0) {
    changeDescriptions.push(`Added ${interventionMerge.added} new intervention(s)`);
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

  // 9. Update diagnosis if provided
  let updatedPrimaryDiagnosis = currentPlan.primaryDiagnosis;
  let updatedSecondaryDiagnoses = currentPlan.secondaryDiagnoses;
  let updatedClientDiagnosis = currentPlan.clientDiagnosis;

  if (effectiveChanges.diagnosisUpdate) {
    const diagUpdate = effectiveChanges.diagnosisUpdate;
    if (diagUpdate.primaryDiagnosis) {
      updatedPrimaryDiagnosis = {
        code: diagUpdate.primaryDiagnosis.code,
        description: diagUpdate.primaryDiagnosis.description,
      };
      changeDescriptions.push(`Diagnosis: ${diagUpdate.primaryDiagnosis.code}`);
    }
    if (diagUpdate.secondaryDiagnoses.length > 0) {
      updatedSecondaryDiagnoses = diagUpdate.secondaryDiagnoses.map(d => ({
        code: d.code,
        description: d.description,
      }));
    }
    if (diagUpdate.clientSummary) {
      updatedClientDiagnosis = {
        summary: diagUpdate.clientSummary,
        // New diagnoses are hidden by default until therapist approves
        hidden: diagUpdate.isNew ? true : (currentPlan.clientDiagnosis?.hidden ?? true),
      };
    }
  }

  // Build updated plan
  const updatedPlan: TreatmentPlan = {
    riskScore: updatedRiskScore,
    riskRationale: updatedRiskRationale,
    riskFlags: updatedRiskFlags,
    therapistNote: updatedTherapistNote,
    clientSummary: updatedClientSummary,
    primaryDiagnosis: updatedPrimaryDiagnosis,
    secondaryDiagnoses: updatedSecondaryDiagnoses,
    clientDiagnosis: updatedClientDiagnosis,
    clinicalGoals: [...updatedClinicalGoals, ...newClinicalGoals],
    clientGoals: [...updatedClientGoals, ...newClientGoals],
    interventions: interventionMerge.merged,
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

  // Handle diagnosis for initial plan
  const diagUpdate = changes.diagnosisUpdate;
  const primaryDiagnosis = diagUpdate?.primaryDiagnosis ? {
    code: diagUpdate.primaryDiagnosis.code,
    description: diagUpdate.primaryDiagnosis.description,
  } : undefined;

  const secondaryDiagnoses = diagUpdate?.secondaryDiagnoses?.map(d => ({
    code: d.code,
    description: d.description,
  }));

  const clientDiagnosis = diagUpdate?.clientSummary ? {
    summary: diagUpdate.clientSummary,
    hidden: true, // New diagnoses are always hidden until therapist approves
  } : undefined;

  if (primaryDiagnosis) {
    changeDescriptions.push(`Diagnosis: ${primaryDiagnosis.code}`);
  }

  const updatedPlan: TreatmentPlan = {
    riskScore: changes.riskAssessment.suggestedLevel,
    riskRationale: changes.riskAssessment.rationale,
    riskFlags: changes.riskAssessment.flags,
    therapistNote: changes.therapistNote || 'Initial assessment completed.',
    clientSummary: changes.clientSummary || 'Welcome to your treatment journey.',
    primaryDiagnosis,
    secondaryDiagnoses,
    clientDiagnosis,
    clinicalGoals,
    clientGoals,
    interventions: mergeInterventions([], [
      ...changes.interventionsUsed,
      ...changes.suggestedInterventions.map(i => i.intervention),
    ]).merged,
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
    diagnosisUpdate: modifications.diagnosisUpdate !== undefined
      ? modifications.diagnosisUpdate
      : original.diagnosisUpdate,
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

// Maximum number of interventions allowed
const MAX_INTERVENTIONS = 10;

// Consolidation map: maps variations to canonical names
const INTERVENTION_CONSOLIDATION: Record<string, string> = {
  // CBT variations
  'cognitive behavioral therapy': 'CBT',
  'cognitive behaviour therapy': 'CBT',
  'cbt thought record': 'CBT',
  'thought records': 'CBT',
  'cognitive restructuring': 'CBT',
  'socratic questioning': 'CBT',
  'activity scheduling': 'CBT',

  // DBT variations
  'dialectical behavior therapy': 'DBT',
  'dialectical behaviour therapy': 'DBT',
  'dbt skills': 'DBT',
  'diary cards': 'DBT',
  'dear man': 'DBT',
  'interpersonal effectiveness': 'DBT',

  // Relaxation variations
  'breathing exercises': 'Relaxation Techniques',
  'deep breathing': 'Relaxation Techniques',
  'progressive muscle relaxation': 'Relaxation Techniques',
  'relaxation training': 'Relaxation Techniques',
  'guided relaxation': 'Relaxation Techniques',
  'box breathing': 'Relaxation Techniques',
  'diaphragmatic breathing': 'Relaxation Techniques',

  // Mindfulness variations
  'mindfulness meditation': 'Mindfulness',
  'mindfulness skills': 'Mindfulness',
  'mindfulness exercises': 'Mindfulness',
  'present moment awareness': 'Mindfulness',
  'grounding exercises': 'Mindfulness',
  'grounding techniques': 'Mindfulness',

  // Sleep variations
  'sleep hygiene education': 'Sleep Hygiene',
  'cbt-i': 'Sleep Hygiene',
  'cognitive behavioral therapy for insomnia': 'Sleep Hygiene',

  // Journaling variations
  'journaling for anxiety': 'Journaling',
  'thought journaling': 'Journaling',
  'worry journaling': 'Journaling',

  // ACT variations
  'acceptance and commitment therapy': 'ACT',
  'values clarification': 'ACT',
  'committed action': 'ACT',
  'cognitive defusion': 'ACT',

  // Other consolidations
  'positive affirmations': 'Psychoeducation',
  'worry time technique': 'CBT',
  'behavioral experiments': 'CBT',
  'exposure': 'Exposure Therapy',
  'gradual exposure': 'Exposure Therapy',
  'in vivo exposure': 'Exposure Therapy',
  'distress tolerance': 'Distress Tolerance Skills',
  'emotion regulation skills': 'Emotion Regulation',
  'psychodynamic exploration': 'Psychodynamic Therapy',
  'defense mechanisms': 'Psychodynamic Therapy',
  'transference analysis': 'Psychodynamic Therapy',
};

/**
 * Normalize and consolidate an intervention name.
 * Returns the canonical form or the original if no match.
 */
function normalizeIntervention(intervention: string): string {
  const normalized = intervention.toLowerCase().trim();

  // Check for exact match in consolidation map
  if (INTERVENTION_CONSOLIDATION[normalized]) {
    return INTERVENTION_CONSOLIDATION[normalized];
  }

  // Check for partial matches (e.g., "CBT thought monitoring and restructuring")
  for (const [pattern, canonical] of Object.entries(INTERVENTION_CONSOLIDATION)) {
    if (normalized.includes(pattern) || pattern.includes(normalized)) {
      return canonical;
    }
  }

  // Return original with proper casing if no consolidation found
  return intervention.trim();
}

/**
 * Check if an intervention is already covered by existing ones.
 * Returns true if the new intervention should be skipped.
 */
function isInterventionCovered(newIntervention: string, existingInterventions: string[]): boolean {
  const normalizedNew = normalizeIntervention(newIntervention).toLowerCase();

  for (const existing of existingInterventions) {
    const normalizedExisting = normalizeIntervention(existing).toLowerCase();

    // Exact match after normalization
    if (normalizedNew === normalizedExisting) {
      return true;
    }

    // Check if CBT covers CBT-specific techniques
    if (normalizedExisting === 'cbt' &&
        ['cognitive restructuring', 'thought records', 'behavioral activation', 'exposure therapy'].includes(normalizedNew)) {
      return true;
    }

    // Check if DBT covers DBT-specific techniques
    if (normalizedExisting === 'dbt' &&
        ['distress tolerance skills', 'emotion regulation', 'mindfulness'].includes(normalizedNew)) {
      return true;
    }
  }

  return false;
}

/**
 * Merge interventions with deduplication, consolidation, and length cap.
 */
function mergeInterventions(
  existingInterventions: string[],
  newInterventions: string[]
): { merged: string[]; added: number } {
  // Normalize existing interventions
  const normalizedExisting = existingInterventions.map(normalizeIntervention);
  const uniqueExisting = [...new Set(normalizedExisting)];

  // Filter and normalize new interventions
  const addedInterventions: string[] = [];

  for (const intervention of newInterventions) {
    const normalized = normalizeIntervention(intervention);

    // Skip if already covered
    if (isInterventionCovered(normalized, [...uniqueExisting, ...addedInterventions])) {
      continue;
    }

    addedInterventions.push(normalized);
  }

  // Combine and enforce max limit
  const combined = [...uniqueExisting, ...addedInterventions];
  const capped = combined.slice(0, MAX_INTERVENTIONS);

  return {
    merged: capped,
    added: Math.min(addedInterventions.length, MAX_INTERVENTIONS - uniqueExisting.length),
  };
}
