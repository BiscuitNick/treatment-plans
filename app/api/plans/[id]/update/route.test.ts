import { POST } from './route';
import { prisma } from '@/lib/db';

// Mock auth at test level to avoid ESM issues
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe('POST /api/plans/[id]/update', () => {
  const mockPlanId = 'plan-123';
  const mockContext = { params: Promise.resolve({ id: mockPlanId }) };

  const validUpdateBody = {
    plan: {
      riskScore: 'MEDIUM',
      therapistNote: 'New note',
      clientSummary: 'New summary',
      clinicalGoals: [],
      clientGoals: [],
      interventions: ['CBT'],
      homework: 'New homework',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create new version successfully', async () => {
    const mockTx = {
      treatmentPlan: {
        findUnique: jest.fn().mockResolvedValue({
          id: mockPlanId,
          currentContent: null
        }),
        update: jest.fn().mockResolvedValue({ id: mockPlanId }),
      },
      planVersion: {
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue({ id: 'ver-2', version: 2 }),
      },
      goalHistory: {
        create: jest.fn(),
      },
      session: {
        update: jest.fn(),
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
      })
    }));
    expect(mockTx.treatmentPlan.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: mockPlanId },
    }));
    expect(json.success).toBe(true);
  });

  it('should return 401 for unauthenticated user', async () => {
    // Override auth mock for this test
    const { auth } = require('@/lib/auth');
    (auth as jest.Mock).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/plans/123/update', {
      method: 'POST',
      body: JSON.stringify(validUpdateBody),
    });

    const res = await POST(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('should return 400 for invalid schema', async () => {
    const req = new Request('http://localhost/api/plans/123/update', {
      method: 'POST',
      body: JSON.stringify({ plan: { riskScore: 'INVALID' } }),
    });

    const res = await POST(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid Input');
  });

  it('should return 500 if plan not found', async () => {
    const mockTx = {
      treatmentPlan: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
      planVersion: {
        count: jest.fn(),
        create: jest.fn(),
      },
      goalHistory: {
        create: jest.fn(),
      },
      session: {
        update: jest.fn(),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation((cb) => cb(mockTx));

    const req = new Request('http://localhost/api/plans/123/update', {
      method: 'POST',
      body: JSON.stringify(validUpdateBody),
    });

    const res = await POST(req, mockContext);
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Treatment Plan not found');
  });
});