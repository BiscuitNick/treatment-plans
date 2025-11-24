import { POST } from './route';
import { generateObject } from 'ai';
import { validateContent } from '@/services/safety';
import { assemblePromptContext } from '@/services/prompt-service';
import { prisma } from '@/lib/db';

// Mocks
jest.mock('ai', () => ({
  generateObject: jest.fn(),
}));
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(),
}));
jest.mock('@/services/safety', () => ({
  validateContent: jest.fn(),
}));
jest.mock('@/services/prompt-service', () => ({
  assemblePromptContext: jest.fn(),
}));
jest.mock('@/lib/db', () => ({
  prisma: {
    session: {
      create: jest.fn(),
    },
    treatmentPlan: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    planVersion: {
      create: jest.fn(),
      count: jest.fn(),
    },
  },
}));

describe('POST /api/analyze', () => {
  const mockRequest = (body: any) => new Request('http://localhost/api/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if safety check fails', async () => {
    (validateContent as jest.Mock).mockResolvedValue({ safeToGenerate: false, riskLevel: 'HIGH' });

    const res = await POST(mockRequest({ transcript: 'unsafe text' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Safety Alert Detected");
    expect(generateObject).not.toHaveBeenCalled();
  });

  it('should generate plan and save to DB if safe and userId provided', async () => {
    (validateContent as jest.Mock).mockResolvedValue({ safeToGenerate: true });
    (assemblePromptContext as jest.Mock).mockResolvedValue({ systemPrompt: 'sys', userPrompt: 'user' });
    (generateObject as jest.Mock).mockResolvedValue({ object: { riskScore: 'LOW', clinicalGoals: [] } });
    
    // Mock Prisma
    (prisma.session.create as jest.Mock).mockResolvedValue({ id: 'sess-123' });
    (prisma.treatmentPlan.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.treatmentPlan.create as jest.Mock).mockResolvedValue({ id: 'plan-123' });

    const res = await POST(mockRequest({ transcript: 'safe text', userId: 'user-123' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(generateObject).toHaveBeenCalled();
    expect(prisma.session.create).toHaveBeenCalled();
    expect(prisma.treatmentPlan.create).toHaveBeenCalled();
    expect(json.savedPlanId).toBe('plan-123');
  });
});
