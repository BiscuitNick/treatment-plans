import { POST } from './route';
import { processSession } from '@/services/analysis';

// Mock auth at test level to avoid ESM issues
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock the analysis service
jest.mock('@/services/analysis', () => ({
  processSession: jest.fn(),
}));

describe('POST /api/analyze', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockRequest = (body: any) => new Request('http://localhost/api/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if safety check fails', async () => {
    (processSession as jest.Mock).mockResolvedValue({
      success: false,
      error: 'Safety Alert Detected',
      safetyResult: { safeToGenerate: false, riskLevel: 'HIGH' },
    });

    const res = await POST(mockRequest({ transcript: 'unsafe text' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Safety Alert Detected');
    expect(processSession).toHaveBeenCalledWith('unsafe text', undefined, undefined, undefined);
  });

  it('should generate plan and save to DB if safe and userId provided', async () => {
    (processSession as jest.Mock).mockResolvedValue({
      success: true,
      plan: { riskScore: 'LOW', clinicalGoals: [] },
      safetyResult: { safeToGenerate: true },
      savedPlanId: 'plan-123',
    });

    const res = await POST(mockRequest({ transcript: 'safe text', userId: 'user-123' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(processSession).toHaveBeenCalledWith('safe text', 'user-123', undefined, undefined);
    expect(json.savedPlanId).toBe('plan-123');
    expect(json.plan).toEqual({ riskScore: 'LOW', clinicalGoals: [] });
  });

  it('should return 400 for invalid input', async () => {
    const res = await POST(mockRequest({})); // missing transcript
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe('Invalid Input');
  });

  it('should pass patientId to processSession', async () => {
    (processSession as jest.Mock).mockResolvedValue({
      success: true,
      plan: { riskScore: 'LOW' },
      safetyResult: { safeToGenerate: true },
    });

    const res = await POST(mockRequest({
      transcript: 'test',
      userId: 'user-1',
      patientId: 'patient-1'
    }));

    expect(res.status).toBe(200);
    expect(processSession).toHaveBeenCalledWith('test', 'user-1', undefined, 'patient-1');
  });
});
