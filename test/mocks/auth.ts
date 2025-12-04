// Auth mock for testing
// Usage: jest.mock('@/lib/auth', () => require('@/test/mocks/auth'));

export const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'CLINICIAN',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const mockAdminSession = {
  user: {
    id: 'admin-user-id',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'ADMIN',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
};

export const auth = jest.fn().mockResolvedValue(mockSession);

export const signIn = jest.fn();
export const signOut = jest.fn();

// Helper to set session for specific tests
export const setMockSession = (session: typeof mockSession | null) => {
  auth.mockResolvedValue(session);
};

// Helper to set unauthenticated state
export const setUnauthenticated = () => {
  auth.mockResolvedValue(null);
};
