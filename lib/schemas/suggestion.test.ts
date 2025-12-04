import {
  RiskLevelSchema,
  GoalPrioritySchema,
  GoalStatusSchema,
  GoalUpdateSchema,
  NewGoalSchema,
  SuggestedInterventionSchema,
  HomeworkUpdateSchema,
  RiskAssessmentSchema,
  DiagnosisSuggestionSchema,
  DiagnosisUpdateSchema,
  SuggestedChangesSchema,
  SessionAnalysisOutputSchema,
} from './suggestion';

describe('RiskLevelSchema', () => {
  it('should accept valid risk levels', () => {
    expect(RiskLevelSchema.safeParse('LOW').success).toBe(true);
    expect(RiskLevelSchema.safeParse('MEDIUM').success).toBe(true);
    expect(RiskLevelSchema.safeParse('HIGH').success).toBe(true);
  });

  it('should reject invalid risk levels', () => {
    expect(RiskLevelSchema.safeParse('CRITICAL').success).toBe(false);
    expect(RiskLevelSchema.safeParse('low').success).toBe(false);
    expect(RiskLevelSchema.safeParse('').success).toBe(false);
  });
});

describe('GoalPrioritySchema', () => {
  it('should accept valid priorities', () => {
    expect(GoalPrioritySchema.safeParse('HIGH').success).toBe(true);
    expect(GoalPrioritySchema.safeParse('MEDIUM').success).toBe(true);
    expect(GoalPrioritySchema.safeParse('LOW').success).toBe(true);
  });

  it('should reject invalid priorities', () => {
    expect(GoalPrioritySchema.safeParse('URGENT').success).toBe(false);
  });
});

describe('GoalStatusSchema', () => {
  it('should accept all valid statuses', () => {
    const validStatuses = ['ACTIVE', 'IN_PROGRESS', 'COMPLETED', 'MAINTAINED', 'DEFERRED', 'DISCONTINUED'];
    validStatuses.forEach((status) => {
      expect(GoalStatusSchema.safeParse(status).success).toBe(true);
    });
  });

  it('should reject invalid statuses', () => {
    expect(GoalStatusSchema.safeParse('PENDING').success).toBe(false);
    expect(GoalStatusSchema.safeParse('DONE').success).toBe(false);
  });
});

describe('GoalUpdateSchema', () => {
  const validGoalUpdate = {
    goalId: 'goal-123',
    currentStatus: 'IN_PROGRESS',
    suggestedStatus: 'COMPLETED',
    progressNote: 'Patient achieved all session objectives',
    rationale: 'Consistent progress over past 4 sessions',
  };

  it('should validate a complete goal update', () => {
    const result = GoalUpdateSchema.safeParse(validGoalUpdate);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const fields = ['goalId', 'currentStatus', 'suggestedStatus', 'progressNote', 'rationale'];
    fields.forEach((field) => {
      const partial = { ...validGoalUpdate };
      delete (partial as Record<string, unknown>)[field];
      expect(GoalUpdateSchema.safeParse(partial).success).toBe(false);
    });
  });
});

describe('NewGoalSchema', () => {
  const validNewGoal = {
    description: 'Improve sleep hygiene',
    clinicalRationale: 'Patient reports difficulty sleeping',
    priority: 'HIGH',
  };

  it('should validate a minimal new goal', () => {
    const result = NewGoalSchema.safeParse(validNewGoal);
    expect(result.success).toBe(true);
  });

  it('should validate with all optional fields', () => {
    const fullGoal = {
      ...validNewGoal,
      suggestedTargetDate: '3 months',
      clientDescription: 'Get better sleep',
      emoji: '😴',
    };
    const result = NewGoalSchema.safeParse(fullGoal);
    expect(result.success).toBe(true);
  });

  it('should reject invalid priority', () => {
    const result = NewGoalSchema.safeParse({
      ...validNewGoal,
      priority: 'URGENT',
    });
    expect(result.success).toBe(false);
  });
});

describe('SuggestedInterventionSchema', () => {
  it('should validate a complete intervention', () => {
    const result = SuggestedInterventionSchema.safeParse({
      intervention: 'Mindfulness meditation',
      rationale: 'To help manage anxiety symptoms',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing fields', () => {
    expect(SuggestedInterventionSchema.safeParse({ intervention: 'Test' }).success).toBe(false);
    expect(SuggestedInterventionSchema.safeParse({ rationale: 'Test' }).success).toBe(false);
  });
});

describe('HomeworkUpdateSchema', () => {
  it('should validate a complete homework update', () => {
    const result = HomeworkUpdateSchema.safeParse({
      current: 'Practice breathing exercises',
      suggested: 'Practice breathing exercises and journaling',
      rationale: 'Adding journaling to track triggers',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    expect(HomeworkUpdateSchema.safeParse({ current: 'Test' }).success).toBe(false);
    expect(HomeworkUpdateSchema.safeParse({ suggested: 'Test' }).success).toBe(false);
    expect(HomeworkUpdateSchema.safeParse({ rationale: 'Test' }).success).toBe(false);
  });
});

describe('RiskAssessmentSchema', () => {
  const validRiskAssessment = {
    currentLevel: 'LOW',
    suggestedLevel: 'MEDIUM',
    rationale: 'Increased stress reported',
    flags: ['increased_stress', 'sleep_issues'],
  };

  it('should validate a complete risk assessment', () => {
    const result = RiskAssessmentSchema.safeParse(validRiskAssessment);
    expect(result.success).toBe(true);
  });

  it('should validate with empty flags array', () => {
    const result = RiskAssessmentSchema.safeParse({
      ...validRiskAssessment,
      flags: [],
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid risk levels', () => {
    expect(RiskAssessmentSchema.safeParse({
      ...validRiskAssessment,
      currentLevel: 'INVALID',
    }).success).toBe(false);
  });
});

describe('DiagnosisSuggestionSchema', () => {
  it('should validate a complete diagnosis', () => {
    const result = DiagnosisSuggestionSchema.safeParse({
      code: 'F41.1',
      description: 'Generalized anxiety disorder',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing fields', () => {
    expect(DiagnosisSuggestionSchema.safeParse({ code: 'F41.1' }).success).toBe(false);
    expect(DiagnosisSuggestionSchema.safeParse({ description: 'Test' }).success).toBe(false);
  });
});

describe('DiagnosisUpdateSchema', () => {
  const validDiagnosisUpdate = {
    primaryDiagnosis: { code: 'F41.1', description: 'GAD' },
    secondaryDiagnoses: [],
    clientSummary: 'You experience excessive worry',
    rationale: 'Symptoms match GAD criteria',
    isNew: true,
  };

  it('should validate a complete diagnosis update', () => {
    const result = DiagnosisUpdateSchema.safeParse(validDiagnosisUpdate);
    expect(result.success).toBe(true);
  });

  it('should validate with null primary diagnosis', () => {
    const result = DiagnosisUpdateSchema.safeParse({
      ...validDiagnosisUpdate,
      primaryDiagnosis: null,
    });
    expect(result.success).toBe(true);
  });

  it('should validate with secondary diagnoses', () => {
    const result = DiagnosisUpdateSchema.safeParse({
      ...validDiagnosisUpdate,
      secondaryDiagnoses: [
        { code: 'F32.0', description: 'Mild depression' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('SuggestedChangesSchema', () => {
  const validSuggestedChanges = {
    goalUpdates: [],
    newGoals: [],
    interventionsUsed: ['CBT', 'Motivational interviewing'],
    suggestedInterventions: [],
    homeworkUpdate: null,
    riskAssessment: {
      currentLevel: 'LOW',
      suggestedLevel: 'LOW',
      rationale: 'No concerns',
      flags: [],
    },
    diagnosisUpdate: null,
  };

  it('should validate minimal suggested changes', () => {
    const result = SuggestedChangesSchema.safeParse(validSuggestedChanges);
    expect(result.success).toBe(true);
  });

  it('should validate with all fields populated', () => {
    const fullChanges = {
      ...validSuggestedChanges,
      goalUpdates: [{
        goalId: 'goal-1',
        currentStatus: 'IN_PROGRESS',
        suggestedStatus: 'COMPLETED',
        progressNote: 'Great progress',
        rationale: 'Achieved objectives',
      }],
      newGoals: [{
        description: 'New goal',
        clinicalRationale: 'Based on session',
        priority: 'MEDIUM',
      }],
      suggestedInterventions: [{
        intervention: 'Journaling',
        rationale: 'To track mood',
      }],
      homeworkUpdate: {
        current: 'Old homework',
        suggested: 'New homework',
        rationale: 'Updated based on progress',
      },
      therapistNote: 'Clinical note here',
      clientSummary: 'Summary for client',
    };
    const result = SuggestedChangesSchema.safeParse(fullChanges);
    expect(result.success).toBe(true);
  });
});

describe('SessionAnalysisOutputSchema', () => {
  const validOutput = {
    sessionSummary: 'Patient discussed work stress and anxiety symptoms.',
    progressNotes: 'Patient showed improvement in coping skills.',
    suggestedChanges: {
      goalUpdates: [],
      newGoals: [],
      interventionsUsed: ['CBT'],
      suggestedInterventions: [],
      homeworkUpdate: null,
      riskAssessment: {
        currentLevel: 'LOW',
        suggestedLevel: 'LOW',
        rationale: 'No concerns',
        flags: [],
      },
      diagnosisUpdate: null,
    },
  };

  it('should validate a complete session analysis output', () => {
    const result = SessionAnalysisOutputSchema.safeParse(validOutput);
    expect(result.success).toBe(true);
  });

  it('should reject missing sessionSummary', () => {
    const { sessionSummary, ...rest } = validOutput;
    const result = SessionAnalysisOutputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject missing progressNotes', () => {
    const { progressNotes, ...rest } = validOutput;
    const result = SessionAnalysisOutputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('should reject invalid suggestedChanges', () => {
    const result = SessionAnalysisOutputSchema.safeParse({
      ...validOutput,
      suggestedChanges: { invalid: 'data' },
    });
    expect(result.success).toBe(false);
  });
});
