// Mock modules before importing
jest.mock('@/lib/db', () => ({
  prisma: {
    session: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mock-model'),
}));

import { prisma } from '@/lib/db';
import { generateText } from 'ai';
import { getDashboardSessions, generateSessionSummary } from './sessions';

describe('Session Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardSessions', () => {
    it('should throw error if no userId provided', async () => {
      await expect(getDashboardSessions('')).rejects.toThrow(
        'User ID is required'
      );
    });

    it('should fetch sessions for clinicians patients', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          transcript: 'Session transcript',
          status: 'PENDING',
          createdAt: new Date(),
          sessionDate: new Date(),
          patient: {
            id: 'patient-1',
            name: 'John Doe',
            clinician: { name: 'Dr. Smith', email: 'dr@test.com' },
            treatmentPlan: { versions: [] },
            sessions: [],
          },
          suggestion: null,
        },
      ];

      (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);

      const result = await getDashboardSessions('user-123');

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            patient: {
              clinicianId: 'user-123',
            },
          },
        })
      );
      expect(result).toEqual(mockSessions);
    });

    it('should include suggestion data when present', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          patient: {
            id: 'patient-1',
            name: 'John Doe',
            clinician: { name: 'Dr. Smith', email: 'dr@test.com' },
            treatmentPlan: null,
            sessions: [],
          },
          suggestion: {
            id: 'suggestion-1',
            status: 'PENDING',
            sessionSummary: 'AI generated summary',
            createdAt: new Date(),
          },
        },
      ];

      (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);

      const result = await getDashboardSessions('user-123');

      expect(result[0].suggestion).toBeDefined();
      expect(result[0].suggestion?.status).toBe('PENDING');
    });

    it('should throw error on database failure', async () => {
      (prisma.session.findMany as jest.Mock).mockRejectedValue(
        new Error('DB Error')
      );

      await expect(getDashboardSessions('user-123')).rejects.toThrow(
        'Failed to fetch sessions'
      );
    });

    it('should order sessions by sessionDate and createdAt descending', async () => {
      (prisma.session.findMany as jest.Mock).mockResolvedValue([]);

      await getDashboardSessions('user-123');

      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ sessionDate: 'desc' }, { createdAt: 'desc' }],
        })
      );
    });
  });

  describe('generateSessionSummary', () => {
    it('should return error if sessionId is missing', async () => {
      const result = await generateSessionSummary('', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session ID and User ID are required');
    });

    it('should return error if userId is missing', async () => {
      const result = await generateSessionSummary('session-1', '');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session ID and User ID are required');
    });

    it('should return error if session not found', async () => {
      (prisma.session.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await generateSessionSummary('session-1', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session not found or unauthorized');
    });

    it('should return error if session has no transcript', async () => {
      (prisma.session.findFirst as jest.Mock).mockResolvedValue({
        id: 'session-1',
        transcript: null,
        summary: null,
      });

      const result = await generateSessionSummary('session-1', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session has no transcript to summarize');
    });

    it('should generate summary successfully', async () => {
      const mockSession = {
        id: 'session-1',
        transcript: 'Patient discussed anxiety symptoms...',
        summary: null,
      };
      const mockUser = { preferences: { llmModel: 'gpt-4o' } };

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (generateText as jest.Mock).mockResolvedValue({
        text: 'Patient discussed ongoing anxiety symptoms and coping strategies.',
      });
      (prisma.session.update as jest.Mock).mockResolvedValue({
        ...mockSession,
        summary: 'Patient discussed ongoing anxiety symptoms and coping strategies.',
      });

      const result = await generateSessionSummary('session-1', 'user-123');

      expect(result.success).toBe(true);
      expect(result.summary).toBe(
        'Patient discussed ongoing anxiety symptoms and coping strategies.'
      );
      expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          summary:
            'Patient discussed ongoing anxiety symptoms and coping strategies.',
        },
      });
    });

    it('should use default model if no preferences set', async () => {
      const mockSession = {
        id: 'session-1',
        transcript: 'Session content',
        summary: null,
      };

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferences: null,
      });
      (generateText as jest.Mock).mockResolvedValue({ text: 'Summary' });
      (prisma.session.update as jest.Mock).mockResolvedValue({});

      await generateSessionSummary('session-1', 'user-123');

      expect(generateText).toHaveBeenCalled();
    });

    it('should return error on AI failure', async () => {
      const mockSession = {
        id: 'session-1',
        transcript: 'Session content',
        summary: null,
      };

      (prisma.session.findFirst as jest.Mock).mockResolvedValue(mockSession);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (generateText as jest.Mock).mockRejectedValue(new Error('AI Error'));

      const result = await generateSessionSummary('session-1', 'user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate summary');
    });
  });
});
