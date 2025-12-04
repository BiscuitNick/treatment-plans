import {
  DiagnosisSchema,
  ClientDiagnosisSchema,
  ClinicalGoalSchema,
  ClientGoalSchema,
  TreatmentPlanSchema,
} from './plan';

describe('DiagnosisSchema', () => {
  it('should validate a valid diagnosis with code only', () => {
    const result = DiagnosisSchema.safeParse({
      code: 'F32.1',
    });
    expect(result.success).toBe(true);
  });

  it('should validate a diagnosis with code and description', () => {
    const result = DiagnosisSchema.safeParse({
      code: 'F32.1',
      description: 'Major depressive disorder, single episode, moderate',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe('F32.1');
      expect(result.data.description).toBe('Major depressive disorder, single episode, moderate');
    }
  });

  it('should reject diagnosis without code', () => {
    const result = DiagnosisSchema.safeParse({
      description: 'Some description',
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-string code', () => {
    const result = DiagnosisSchema.safeParse({
      code: 123,
    });
    expect(result.success).toBe(false);
  });
});

describe('ClientDiagnosisSchema', () => {
  it('should validate with summary only (hidden defaults to true)', () => {
    const result = ClientDiagnosisSchema.safeParse({
      summary: 'A mood condition that affects how you feel and think.',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hidden).toBe(true);
    }
  });

  it('should validate with explicit hidden value', () => {
    const result = ClientDiagnosisSchema.safeParse({
      summary: 'A mood condition',
      hidden: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hidden).toBe(false);
    }
  });

  it('should reject without summary', () => {
    const result = ClientDiagnosisSchema.safeParse({
      hidden: true,
    });
    expect(result.success).toBe(false);
  });
});

describe('ClinicalGoalSchema', () => {
  it('should validate a complete clinical goal', () => {
    const result = ClinicalGoalSchema.safeParse({
      id: 'goal-1',
      description: 'Reduce depressive symptoms',
      status: 'IN_PROGRESS',
      targetDate: '2024-06-01',
    });
    expect(result.success).toBe(true);
  });

  it('should validate without optional targetDate', () => {
    const result = ClinicalGoalSchema.safeParse({
      id: 'goal-1',
      description: 'Reduce depressive symptoms',
      status: 'COMPLETED',
    });
    expect(result.success).toBe(true);
  });

  it('should accept all valid statuses', () => {
    const statuses = ['IN_PROGRESS', 'COMPLETED', 'DEFERRED'];
    statuses.forEach((status) => {
      const result = ClinicalGoalSchema.safeParse({
        id: 'goal-1',
        description: 'Test goal',
        status,
      });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid status', () => {
    const result = ClinicalGoalSchema.safeParse({
      id: 'goal-1',
      description: 'Test goal',
      status: 'INVALID_STATUS',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    expect(ClinicalGoalSchema.safeParse({ id: 'goal-1' }).success).toBe(false);
    expect(ClinicalGoalSchema.safeParse({ description: 'Test' }).success).toBe(false);
    expect(ClinicalGoalSchema.safeParse({ status: 'IN_PROGRESS' }).success).toBe(false);
  });
});

describe('ClientGoalSchema', () => {
  it('should validate with default emoji', () => {
    const result = ClientGoalSchema.safeParse({
      id: 'goal-1',
      description: 'Feel better every day',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emoji).toBe('🎯');
    }
  });

  it('should validate with custom emoji', () => {
    const result = ClientGoalSchema.safeParse({
      id: 'goal-1',
      description: 'Sleep better at night',
      emoji: '😴',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.emoji).toBe('😴');
    }
  });

  it('should reject without id', () => {
    const result = ClientGoalSchema.safeParse({
      description: 'Test goal',
    });
    expect(result.success).toBe(false);
  });

  it('should reject without description', () => {
    const result = ClientGoalSchema.safeParse({
      id: 'goal-1',
    });
    expect(result.success).toBe(false);
  });
});

describe('TreatmentPlanSchema', () => {
  const validPlan = {
    riskScore: 'LOW',
    therapistNote: 'Patient presented with mild anxiety symptoms.',
    clientSummary: 'We talked about how you have been feeling anxious lately.',
    clinicalGoals: [
      {
        id: 'goal-1',
        description: 'Reduce anxiety symptoms',
        status: 'IN_PROGRESS',
      },
    ],
    clientGoals: [
      {
        id: 'goal-1',
        description: 'Feel calmer in stressful situations',
      },
    ],
    interventions: ['CBT Thought Record', 'Breathing exercises'],
    homework: 'Practice deep breathing for 5 minutes daily',
  };

  it('should validate a complete treatment plan', () => {
    const result = TreatmentPlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it('should validate with all optional fields', () => {
    const fullPlan = {
      ...validPlan,
      riskRationale: 'No immediate concerns identified',
      riskFlags: ['Past history of self-harm'],
      primaryDiagnosis: { code: 'F41.1', description: 'Generalized anxiety disorder' },
      secondaryDiagnoses: [{ code: 'F32.0' }],
      clientDiagnosis: { summary: 'You experience excessive worry', hidden: false },
    };
    const result = TreatmentPlanSchema.safeParse(fullPlan);
    expect(result.success).toBe(true);
  });

  it('should accept all valid risk scores', () => {
    const riskScores = ['LOW', 'MEDIUM', 'HIGH'];
    riskScores.forEach((riskScore) => {
      const result = TreatmentPlanSchema.safeParse({ ...validPlan, riskScore });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid risk score', () => {
    const result = TreatmentPlanSchema.safeParse({
      ...validPlan,
      riskScore: 'CRITICAL',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const requiredFields = ['riskScore', 'therapistNote', 'clientSummary', 'clinicalGoals', 'clientGoals', 'interventions', 'homework'];

    requiredFields.forEach((field) => {
      const planWithoutField = { ...validPlan };
      delete (planWithoutField as Record<string, unknown>)[field];
      const result = TreatmentPlanSchema.safeParse(planWithoutField);
      expect(result.success).toBe(false);
    });
  });

  it('should reject empty clinical goals array is valid (edge case)', () => {
    const result = TreatmentPlanSchema.safeParse({
      ...validPlan,
      clinicalGoals: [],
    });
    // Empty array is valid per schema - no minimum
    expect(result.success).toBe(true);
  });

  it('should reject invalid clinical goal in array', () => {
    const result = TreatmentPlanSchema.safeParse({
      ...validPlan,
      clinicalGoals: [{ id: 'goal-1', description: 'Test' }], // missing status
    });
    expect(result.success).toBe(false);
  });

  it('should validate interventions as array of strings', () => {
    const result = TreatmentPlanSchema.safeParse({
      ...validPlan,
      interventions: 'Not an array',
    });
    expect(result.success).toBe(false);
  });
});
