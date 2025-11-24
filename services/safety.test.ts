import { validateContent, scanForKeywords, RiskLevel } from './safety';
import { jest } from '@jest/globals';

// Set mock env before importing modules that use it
process.env.OPENAI_API_KEY = "mock-api-key";
process.env.NODE_ENV = "test";

describe('Safety Service', () => {
  describe('scanForKeywords', () => {
    it('should detect high-risk keywords', () => {
      const input = "I want to kill myself and end it all.";
      const flags = scanForKeywords(input);
      expect(flags.length).toBeGreaterThan(0);
      expect(flags[0]).toContain('kill myself');
    });

    it('should return empty array for safe text', () => {
      const input = "I am feeling a bit anxious today about my job.";
      const flags = scanForKeywords(input);
      expect(flags).toEqual([]);
    });
  });
});