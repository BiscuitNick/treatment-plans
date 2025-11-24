import { POST } from './route';
import { prisma } from '@/lib/db';

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn((callback) => callback({
      treatmentPlan: {
        findUnique: jest.fn(),
      },
      planVersion: {
        count: jest.fn(),
        create: jest.fn(),
      },
    })),
  },
}));

describe('POST /api/plans/[id]/update', () => {
  const mockPlanId = 'plan-123';
  const mockContext = { params: Promise.resolve({ id: mockPlanId }) };
  
  const mockExistingPlan = {
    id: mockPlanId,
  };

  const validUpdateBody = {
    riskScore: 'MEDIUM',
    therapistNote: 'New note',
    clientSummary: 'New summary',
    clinicalGoals: [],
    clientGoals: [],
    interventions: ['CBT'],
    homework: 'New homework',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create new version successfully', async () => {
    const mockTx = {
      treatmentPlan: {
        findUnique: jest.fn().mockResolvedValue(mockExistingPlan),
      },
      planVersion: {
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({ id: 'ver-2', version: 2 }),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(mockTx));

    const req = new Request('http://localhost/api/plans/123/update', {
      method: 'POST',
      body: JSON.stringify(validUpdateBody),
    });

    const res = await POST(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockTx.treatmentPlan.findUnique).toHaveBeenCalledWith({ where: { id: mockPlanId } });
    expect(mockTx.planVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        treatmentPlanId: mockPlanId,
        version: 2,
        content: validUpdateBody
      })
    }));
    expect(json.success).toBe(true);
  });

  it('should return 400 for invalid schema', async () => {
    const req = new Request('http://localhost/api/plans/123/update', {
      method: 'POST',
      body: JSON.stringify({ riskScore: 'INVALID' }), 
    });

    const res = await POST(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid Input");
  });
});