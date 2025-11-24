import { getDashboardSessions } from './sessions';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    session: {
      findMany: jest.fn(),
    },
  },
}));

describe('getDashboardSessions', () => {
  it('should fetch sessions for a given user', async () => {
    const mockUserId = 'user-123';
    const mockSessions = [
      { id: 'sess-1', userId: mockUserId, createdAt: new Date(), plans: [] },
    ];

    (prisma.session.findMany as jest.Mock).mockResolvedValue(mockSessions);

    const result = await getDashboardSessions(mockUserId);

    expect(prisma.session.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: mockUserId },
      orderBy: { createdAt: 'desc' },
    }));
    expect(result).toEqual(mockSessions);
  });

  it('should throw error if userId is missing', async () => {
    await expect(getDashboardSessions('')).rejects.toThrow("User ID is required");
  });
});
