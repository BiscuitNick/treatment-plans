import {
  generateSuggestionPrompt,
  generateInitialPlanPrompt,
  SuggestionPromptContext,
} from './suggestion-prompt';
import type { TreatmentPlan } from '@/lib/schemas/plan';

describe('Suggestion Prompt Service', () => {
  const mockCurrentPlan: TreatmentPlan = {
    riskScore: 'LOW',
    therapistNote: 'Patient showed good progress.',
    clientSummary: 'We made good progress today.',
    clinicalGoals: [
      {
        id: 'goal-1',
        description: 'Reduce anxiety symptoms',
        status: 'IN_PROGRESS',
        targetDate: '2024-06-01',
      },
    ],
    clientGoals: [
      {
        id: 'goal-1',
        description: 'Feel calmer in stressful situations',
        emoji: '😌',
      },
    ],
    interventions: ['CBT', 'Breathing exercises'],
    homework: 'Practice deep breathing daily',
  };

  describe('generateSuggestionPrompt', () => {
    it('should generate prompt for new patient', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'This is my first therapy session.',
        clinicalModality: 'CBT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('NEW PATIENT MODE');
      expect(result.systemPrompt).toContain('CBT');
      expect(result.userPrompt).toContain('NEW PATIENT');
      expect(result.userPrompt).toContain('This is my first therapy session.');
    });

    it('should generate prompt for existing patient', () => {
      const context: SuggestionPromptContext = {
        currentPlan: mockCurrentPlan,
        transcript: 'Follow-up session discussion.',
        clinicalModality: 'DBT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('EXISTING PATIENT MODE');
      expect(result.systemPrompt).toContain('DBT');
      expect(result.userPrompt).toContain('CURRENT TREATMENT PLAN');
      expect(result.userPrompt).toContain(JSON.stringify(mockCurrentPlan, null, 2));
    });

    it('should include recent session summaries when provided', () => {
      const context: SuggestionPromptContext = {
        currentPlan: mockCurrentPlan,
        transcript: 'Current session.',
        clinicalModality: 'ACT',
        recentSessionSummaries: ['Summary of session 1', 'Summary of session 2'],
      };

      const result = generateSuggestionPrompt(context);

      expect(result.userPrompt).toContain('RECENT SESSION CONTEXT');
      expect(result.userPrompt).toContain('Summary of session 1');
      expect(result.userPrompt).toContain('Summary of session 2');
    });

    it('should not include recent context section when no summaries', () => {
      const context: SuggestionPromptContext = {
        currentPlan: mockCurrentPlan,
        transcript: 'Current session.',
        clinicalModality: 'CBT',
        recentSessionSummaries: [],
      };

      const result = generateSuggestionPrompt(context);

      expect(result.userPrompt).not.toContain('RECENT SESSION CONTEXT');
    });

    it('should include CBT interventions', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'CBT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('Cognitive Restructuring');
      expect(result.systemPrompt).toContain('Behavioral Activation');
      expect(result.systemPrompt).toContain('Thought Records');
    });

    it('should include DBT interventions', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'DBT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('Mindfulness Skills');
      expect(result.systemPrompt).toContain('TIPP');
      expect(result.systemPrompt).toContain('DEAR MAN');
    });

    it('should include ACT interventions', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'ACT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('Acceptance Exercises');
      expect(result.systemPrompt).toContain('Cognitive Defusion');
      expect(result.systemPrompt).toContain('Values Clarification');
    });

    it('should include Psychodynamic interventions', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'Psychodynamic',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('Free Association');
      expect(result.systemPrompt).toContain('Transference Analysis');
      expect(result.systemPrompt).toContain('Dream Interpretation');
    });

    it('should include EMDR interventions', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'EMDR',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('Bilateral Stimulation');
      expect(result.systemPrompt).toContain('Desensitization');
    });

    it('should include MI interventions', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'MI',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('Open-Ended Questions');
      expect(result.systemPrompt).toContain('Reflective Listening');
      expect(result.systemPrompt).toContain('Rolling with Resistance');
    });

    it('should use Integrative as default for unknown modality', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'Unknown',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('Psychoeducation');
      expect(result.systemPrompt).toContain('Active Listening');
    });

    it('should include JSON structure instructions', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'CBT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('sessionSummary');
      expect(result.systemPrompt).toContain('progressNotes');
      expect(result.systemPrompt).toContain('suggestedChanges');
      expect(result.systemPrompt).toContain('goalUpdates');
      expect(result.systemPrompt).toContain('newGoals');
      expect(result.systemPrompt).toContain('riskAssessment');
    });

    it('should include important guidelines', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'CBT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('Be Conservative');
      expect(result.systemPrompt).toContain('Preserve History');
      expect(result.systemPrompt).toContain('No Fabrication');
    });

    it('should include diagnosis instructions', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'Test.',
        clinicalModality: 'CBT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.systemPrompt).toContain('ICD-10');
      expect(result.systemPrompt).toContain('diagnosisUpdate');
    });

    it('should mention conservative approach for existing patients', () => {
      const context: SuggestionPromptContext = {
        currentPlan: mockCurrentPlan,
        transcript: 'Follow-up.',
        clinicalModality: 'CBT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.userPrompt).toContain('conservative');
      expect(result.userPrompt).toContain('CHANGED or PROGRESSED');
    });

    it('should mention initial assessment for new patients', () => {
      const context: SuggestionPromptContext = {
        currentPlan: null,
        transcript: 'First session.',
        clinicalModality: 'CBT',
      };

      const result = generateSuggestionPrompt(context);

      expect(result.userPrompt).toContain('new patient');
      expect(result.userPrompt).toContain('initial goals');
    });
  });

  describe('generateInitialPlanPrompt', () => {
    it('should generate prompt for initial plan', () => {
      const result = generateInitialPlanPrompt(
        'Initial intake session transcript.',
        'CBT'
      );

      expect(result.systemPrompt).toContain('NEW PATIENT MODE');
      expect(result.systemPrompt).toContain('CBT');
      expect(result.userPrompt).toContain('Initial intake session transcript.');
    });

    it('should use null for currentPlan', () => {
      const result = generateInitialPlanPrompt('Test.', 'DBT');

      expect(result.userPrompt).toContain('NEW PATIENT');
      expect(result.userPrompt).not.toContain('CURRENT TREATMENT PLAN');
    });

    it('should accept different modalities', () => {
      const modalities = ['CBT', 'DBT', 'ACT', 'EMDR', 'MI', 'Integrative'];

      modalities.forEach((modality) => {
        const result = generateInitialPlanPrompt('Test.', modality);
        expect(result.systemPrompt).toContain(modality);
      });
    });
  });
});
