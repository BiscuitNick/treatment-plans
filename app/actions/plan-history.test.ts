// Mock modules before importing
jest.mock('@/lib/db', () => ({
  prisma: {
    planVersion: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { getPlanHistory } from './plan-history';

describe('Plan History Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlanHistory', () => {
    it('should return empty array if no planId provided', async () => {
      const result = await getPlanHistory('');

      expect(result).toEqual([]);
      expect(prisma.planVersion.findMany).not.toHaveBeenCalled();
    });

    it('should fetch plan versions in descending order', async () => {
      const mockVersions = [
        {
          id: 'version-3',
          version: 3,
          createdAt: new Date(),
          changeReason: 'Session update',
          changeType: 'SESSION_UPDATE',
          changeSummary: 'Updated goals',
          suggestionId: 'suggestion-1',
          createdBy: 'user-123',
        },
        {
          id: 'version-2',
          version: 2,
          createdAt: new Date(),
          changeReason: 'Manual edit',
          changeType: 'MANUAL_EDIT',
          changeSummary: null,
          suggestionId: null,
          createdBy: 'user-123',
        },
        {
          id: 'version-1',
          version: 1,
          createdAt: new Date(),
          changeReason: 'Initial plan',
          changeType: 'INITIAL',
          changeSummary: null,
          suggestionId: null,
          createdBy: 'user-123',
        },
      ];

      (prisma.planVersion.findMany as jest.Mock).mockResolvedValue(mockVersions);

      const result = await getPlanHistory('plan-123');

      expect(prisma.planVersion.findMany).toHaveBeenCalledWith({
        where: { treatmentPlanId: 'plan-123' },
        orderBy: { version: 'desc' },
        select: {
          id: true,
          version: true,
          createdAt: true,
          changeReason: true,
          changeType: true,
          changeSummary: true,
          suggestionId: true,
          createdBy: true,
        },
      });
      expect(result).toEqual(mockVersions);
      expect(result[0].version).toBe(3);
    });

    it('should return empty array on database error', async () => {
      (prisma.planVersion.findMany as jest.Mock).mockRejectedValue(
        new Error('DB Error')
      );

      const result = await getPlanHistory('plan-123');

      expect(result).toEqual([]);
    });

    it('should return empty array for plan with no versions', async () => {
      (prisma.planVersion.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getPlanHistory('plan-123');

      expect(result).toEqual([]);
    });
  });
});
