import {
  assemblePromptContext,
  generateContextAwarePrompt,
  AnalysisContext,
} from './prompt-service';

describe('Prompt Service', () => {
  describe('assemblePromptContext', () => {
    it('should return legacy prompt structure', async () => {
      const result = await assemblePromptContext('Test transcript');
      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userPrompt');
      expect(result.systemPrompt).toBe('Legacy Prompt');
      expect(result.userPrompt).toBe('Test transcript');
    });

    it('should accept optional userId', async () => {
      const result = await assemblePromptContext('Test transcript', 'user-123');
      expect(result).toHaveProperty('systemPrompt');
      expect(result).toHaveProperty('userPrompt');
    });
  });

  describe('generateContextAwarePrompt', () => {
    it('should generate prompt for new patient (no current plan)', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'Patient describes anxiety symptoms.',
        clinicalModality: 'CBT',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.systemPrompt).toContain('CBT');
      expect(result.systemPrompt).toContain('AI Clinical Assistant');
      expect(result.userPrompt).toContain('No existing plan');
      expect(result.userPrompt).toContain('Patient describes anxiety symptoms.');
    });

    it('should generate prompt with existing plan', () => {
      const mockPlan = {
        riskScore: 'LOW',
        therapistNote: 'Previous note',
        clinicalGoals: [{ id: '1', description: 'Goal 1', status: 'IN_PROGRESS' }],
      };

      const context: AnalysisContext = {
        currentPlan: mockPlan,
        recentHistory: [],
        newTranscript: 'Follow-up session content.',
        clinicalModality: 'DBT',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.systemPrompt).toContain('DBT');
      expect(result.userPrompt).toContain(JSON.stringify(mockPlan, null, 2));
      expect(result.userPrompt).toContain('Follow-up session content.');
    });

    it('should include recent history when provided', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: ['Session 1 summary', 'Session 2 summary'],
        newTranscript: 'Current session.',
        clinicalModality: 'ACT',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.userPrompt).toContain('Session 1 summary');
      expect(result.userPrompt).toContain('Session 2 summary');
    });

    it('should handle empty recent history', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'New session.',
        clinicalModality: 'Integrative',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.userPrompt).toContain('No recent history available');
    });

    it('should include CBT-specific interventions', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'Test.',
        clinicalModality: 'CBT',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.systemPrompt).toContain('Cognitive Restructuring');
      expect(result.systemPrompt).toContain('Exposure');
      expect(result.systemPrompt).toContain('Behavioral Activation');
    });

    it('should include DBT-specific interventions', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'Test.',
        clinicalModality: 'DBT',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.systemPrompt).toContain('Mindfulness');
      expect(result.systemPrompt).toContain('Distress Tolerance');
      expect(result.systemPrompt).toContain('Emotion Regulation');
    });

    it('should include ACT-specific interventions', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'Test.',
        clinicalModality: 'ACT',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.systemPrompt).toContain('Acceptance');
      expect(result.systemPrompt).toContain('Defusion');
      expect(result.systemPrompt).toContain('Values Clarification');
    });

    it('should include Psychodynamic-specific interventions', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'Test.',
        clinicalModality: 'Psychodynamic',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.systemPrompt).toContain('Free Association');
      expect(result.systemPrompt).toContain('Transference');
      expect(result.systemPrompt).toContain('Dream Analysis');
    });

    it('should use default interventions for unknown modality', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'Test.',
        clinicalModality: 'Unknown Modality',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.systemPrompt).toContain('Active Listening');
      expect(result.systemPrompt).toContain('Psychoeducation');
      expect(result.systemPrompt).toContain('Coping Skills Training');
    });

    it('should include ICD-10 instructions in system prompt', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'Test.',
        clinicalModality: 'CBT',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.systemPrompt).toContain('ICD-10');
      expect(result.systemPrompt).toContain('diagnosis');
    });

    it('should mention risk assessment in system prompt', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'Test.',
        clinicalModality: 'CBT',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.systemPrompt).toContain('Risk Assessment');
      expect(result.systemPrompt).toContain('risk score');
    });

    it('should generate using provided modality in instructions', () => {
      const context: AnalysisContext = {
        currentPlan: null,
        recentHistory: [],
        newTranscript: 'Test.',
        clinicalModality: 'Integrative',
      };

      const result = generateContextAwarePrompt(context);

      expect(result.userPrompt).toContain('Integrative framework');
    });
  });
});
