// Jest setup file
require('@testing-library/jest-dom');

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
  headers: () => new Map(),
}));

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Suppress expected console errors during tests
// These patterns are from error-handling test cases where we intentionally trigger errors
const originalError = console.error;
const suppressedErrorPatterns = [
  'Warning: ReactDOM.render',
  'Plan Generation Error:',
  'Update Plan Error:',
  'Create Patient Error:',
  'Failed to fetch dashboard sessions:',
  'Failed to generate session summary:',
  'Update Settings Error:',
  'Failed to fetch plan history:',
  'LLM Risk Analysis Failed:',
  'Failed to delete patient:',
  'Failed to update session:',
  'Failed to create session:',
];

beforeAll(() => {
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    if (suppressedErrorPatterns.some(pattern => message.includes(pattern))) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
