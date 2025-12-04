// Set mock env before importing modules that use it
process.env.OPENAI_API_KEY = 'mock-api-key';
process.env.NODE_ENV = 'test';

// Mock OpenAI before importing the module
const mockCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
});

// Mock the env module
jest.mock('@/lib/env', () => ({
  env: {
    OPENAI_API_KEY: 'mock-api-key',
  },
}));

// Now import after mocks are set up
import { scanForKeywords, analyzeRiskWithLLM, validateContent } from './safety';

describe('Safety Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scanForKeywords', () => {
    it('should detect "suicide" keyword', () => {
      const input = 'I have been thinking about suicide lately.';
      const flags = scanForKeywords(input);
      expect(flags.length).toBe(1);
      expect(flags[0]).toContain('suicide');
    });

    it('should detect "kill myself" keyword', () => {
      const input = 'I want to kill myself and end it all.';
      const flags = scanForKeywords(input);
      expect(flags.length).toBeGreaterThanOrEqual(1);
      expect(flags.some(f => f.includes('kill myself'))).toBe(true);
    });

    it('should detect "end my life" keyword', () => {
      const input = 'Sometimes I think about how to end my life.';
      const flags = scanForKeywords(input);
      expect(flags.length).toBe(1);
      expect(flags[0]).toContain('end my life');
    });

    it('should detect "hurt others" keyword', () => {
      const input = 'I want to hurt others around me.';
      const flags = scanForKeywords(input);
      expect(flags.length).toBe(1);
      expect(flags[0]).toContain('hurt others');
    });

    it('should detect "bomb" keyword', () => {
      const input = 'I am going to build a bomb.';
      const flags = scanForKeywords(input);
      expect(flags.length).toBe(1);
      expect(flags[0]).toContain('bomb');
    });

    it('should detect "terrorist" keyword', () => {
      const input = 'I want to become a terrorist.';
      const flags = scanForKeywords(input);
      expect(flags.length).toBe(1);
      expect(flags[0]).toContain('terrorist');
    });

    it('should detect multiple keywords', () => {
      const input = 'I want to kill myself and bomb the building.';
      const flags = scanForKeywords(input);
      expect(flags.length).toBe(2);
    });

    it('should be case insensitive', () => {
      const input = 'I have been thinking about SUICIDE.';
      const flags = scanForKeywords(input);
      expect(flags.length).toBe(1);
    });

    it('should return empty array for safe text', () => {
      const input = 'I am feeling a bit anxious today about my job.';
      const flags = scanForKeywords(input);
      expect(flags).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      const flags = scanForKeywords('');
      expect(flags).toEqual([]);
    });

    it('should handle text with only whitespace', () => {
      const flags = scanForKeywords('   \n\t  ');
      expect(flags).toEqual([]);
    });

    it('should handle text with special characters', () => {
      const input = 'I feel @#$%^&* today but no safety concerns.';
      const flags = scanForKeywords(input);
      expect(flags).toEqual([]);
    });
  });

  describe('analyzeRiskWithLLM', () => {
    it('should return LOW risk for safe content', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'LOW',
                reasoning: 'Patient discussing general work stress with no safety concerns.',
              }),
            },
          },
        ],
      });

      const result = await analyzeRiskWithLLM('I am feeling stressed at work.');
      expect(result.riskLevel).toBe('LOW');
      expect(result.reasoning).toContain('work stress');
    });

    it('should return MEDIUM risk for concerning content', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'MEDIUM',
                reasoning: 'Patient expressing vague suicidal ideation without specific plan.',
              }),
            },
          },
        ],
      });

      const result = await analyzeRiskWithLLM('Sometimes I wish I could just disappear.');
      expect(result.riskLevel).toBe('MEDIUM');
      expect(result.reasoning).toContain('suicidal ideation');
    });

    it('should return HIGH risk for dangerous content', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'HIGH',
                reasoning: 'Patient expressing active suicidal ideation with plan.',
              }),
            },
          },
        ],
      });

      const result = await analyzeRiskWithLLM('I have a plan to end it all tonight.');
      expect(result.riskLevel).toBe('HIGH');
    });

    it('should default to HIGH risk when LLM returns invalid risk level', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'INVALID',
                reasoning: 'Some reasoning.',
              }),
            },
          },
        ],
      });

      const result = await analyzeRiskWithLLM('Test content');
      expect(result.riskLevel).toBe('HIGH');
    });

    it('should default to HIGH risk when LLM returns no content', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const result = await analyzeRiskWithLLM('Test content');
      expect(result.riskLevel).toBe('HIGH');
      expect(result.reasoning).toContain('Automated safety check failed');
    });

    it('should default to HIGH risk on API error', async () => {
      mockCreate.mockRejectedValue(new Error('API Error'));

      const result = await analyzeRiskWithLLM('Test content');
      expect(result.riskLevel).toBe('HIGH');
      expect(result.reasoning).toContain('Automated safety check failed');
    });

    it('should default to HIGH risk on JSON parse error', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Not valid JSON',
            },
          },
        ],
      });

      const result = await analyzeRiskWithLLM('Test content');
      expect(result.riskLevel).toBe('HIGH');
    });

    it('should provide default reasoning when none provided', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'LOW',
              }),
            },
          },
        ],
      });

      const result = await analyzeRiskWithLLM('Test content');
      expect(result.reasoning).toBe('No reasoning provided');
    });
  });

  describe('validateContent', () => {
    it('should return immediately unsafe for keyword matches', async () => {
      const result = await validateContent('I want to kill myself');
      expect(result.safeToGenerate).toBe(false);
      expect(result.riskLevel).toBe('HIGH');
      expect(result.riskFlags.length).toBeGreaterThan(0);
      expect(result.reasoning).toContain('keyword match');
    });

    it('should call LLM when no keywords found', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'LOW',
                reasoning: 'Safe content.',
              }),
            },
          },
        ],
      });

      const result = await validateContent('I feel anxious about my presentation.');
      expect(mockCreate).toHaveBeenCalled();
      expect(result.safeToGenerate).toBe(true);
      expect(result.riskLevel).toBe('LOW');
    });

    it('should be safe to generate for LOW risk', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'LOW',
                reasoning: 'No concerns.',
              }),
            },
          },
        ],
      });

      const result = await validateContent('Regular therapy session content.');
      expect(result.safeToGenerate).toBe(true);
    });

    it('should be safe to generate for MEDIUM risk', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'MEDIUM',
                reasoning: 'Some concerning themes.',
              }),
            },
          },
        ],
      });

      const result = await validateContent('I feel hopeless sometimes.');
      expect(result.safeToGenerate).toBe(true);
      expect(result.riskFlags.length).toBeGreaterThan(0);
    });

    it('should NOT be safe to generate for HIGH risk from LLM', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'HIGH',
                reasoning: 'Active threat detected.',
              }),
            },
          },
        ],
      });

      const result = await validateContent('Concerning content here.');
      expect(result.safeToGenerate).toBe(false);
      expect(result.riskLevel).toBe('HIGH');
    });

    it('should have empty risk flags for LOW risk', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                riskLevel: 'LOW',
                reasoning: 'All clear.',
              }),
            },
          },
        ],
      });

      const result = await validateContent('Normal content.');
      expect(result.riskFlags).toEqual([]);
    });
  });
});
