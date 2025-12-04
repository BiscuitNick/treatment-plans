// Mock modules before importing
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { updateUserSettings, getUserSettings, getReviewFrequencyDays } from './settings';

describe('Settings Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updateUserSettings', () => {
    const validSettings = {
      clinicalModality: 'CBT' as const,
      llmModel: 'gpt-4o' as const,
      ttsModel: 'gpt-4o-mini-tts' as const,
      sttModel: 'whisper-1' as const,
      reviewFrequency: '90_DAY' as const,
      userId: 'user-123',
    };

    it('should update settings successfully', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferences: { existingKey: 'value' },
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await updateUserSettings(validSettings);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          preferences: expect.objectContaining({
            existingKey: 'value',
            clinicalModality: 'CBT',
            llmModel: 'gpt-4o',
          }),
        },
      });
      expect(revalidatePath).toHaveBeenCalledWith('/settings');
    });

    it('should handle user with no existing preferences', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferences: null,
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await updateUserSettings(validSettings);

      expect(result.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          preferences: expect.objectContaining({
            clinicalModality: 'CBT',
          }),
        },
      });
    });

    it('should return error on database failure', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.update as jest.Mock).mockRejectedValue(new Error('DB Error'));

      const result = await updateUserSettings(validSettings);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update settings');
    });
  });

  describe('getUserSettings', () => {
    it('should return user settings', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferences: {
          clinicalModality: 'DBT',
          llmModel: 'gpt-5.1',
          ttsModel: 'tts-1',
          sttModel: 'gpt-4o-transcribe',
          reviewFrequency: '30_DAY',
        },
      });

      const result = await getUserSettings('user-123');

      expect(result.clinicalModality).toBe('DBT');
      expect(result.llmModel).toBe('gpt-5.1');
      expect(result.ttsModel).toBe('tts-1');
      expect(result.reviewFrequency).toBe('30_DAY');
    });

    it('should return defaults if no preferences exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferences: null,
      });

      const result = await getUserSettings('user-123');

      expect(result.clinicalModality).toBe('Integrative');
      expect(result.llmModel).toBe('gpt-5.1');
      expect(result.ttsModel).toBe('gpt-4o-mini-tts');
      expect(result.sttModel).toBe('whisper-1');
      expect(result.reviewFrequency).toBe('90_DAY');
    });

    it('should return defaults if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getUserSettings('user-123');

      expect(result.clinicalModality).toBe('Integrative');
    });
  });

  describe('getReviewFrequencyDays', () => {
    it('should return 90 days for 90_DAY frequency', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferences: { reviewFrequency: '90_DAY' },
      });

      const result = await getReviewFrequencyDays('user-123');

      expect(result).toBe(90);
    });

    it('should return 30 days for 30_DAY frequency', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferences: { reviewFrequency: '30_DAY' },
      });

      const result = await getReviewFrequencyDays('user-123');

      expect(result).toBe(30);
    });

    it('should return default 90 days if no preference set', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        preferences: null,
      });

      const result = await getReviewFrequencyDays('user-123');

      expect(result).toBe(90);
    });
  });
});
