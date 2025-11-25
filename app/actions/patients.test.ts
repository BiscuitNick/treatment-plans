import { getPatients, createPatient } from './patients';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Patient Actions', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPatients', () => {
    it('should fetch and map patients correctly', async () => {
      (prisma.patient.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'p1',
          name: 'Test Patient',
          status: 'ACTIVE',
          sessions: [{ createdAt: new Date('2025-01-01') }],
          treatmentPlan: { versions: [{ content: { riskScore: 'LOW' } }] }
        }
      ]);

      const result = await getPatients(mockUserId);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        name: 'Test Patient',
        riskScore: 'LOW',
        lastSessionDate: new Date('2025-01-01')
      }));
    });
  });

  describe('createPatient', () => {
    it('should create a new patient', async () => {
      (prisma.patient.create as jest.Mock).mockResolvedValue({ id: 'p2', name: 'New Guy' });

      const result = await createPatient({ name: 'New Guy', userId: mockUserId });
      expect(prisma.patient.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ name: 'New Guy', clinicianId: mockUserId })
      }));
      expect(result.success).toBe(true);
    });
  });
});
