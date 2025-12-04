/** @type {import('jest').Config} */
module.exports = {
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  collectCoverageFrom: [
    // Only collect coverage from files that have corresponding tests
    'app/actions/patients.ts',
    'app/actions/sessions.ts',
    'app/actions/settings.ts',
    'app/actions/plan-history.ts',
    'app/api/analyze/route.ts',
    'app/api/plans/[id]/update/route.ts',
    'lib/schemas/plan.ts',
    'lib/schemas/suggestion.ts',
    'lib/utils.ts',
    'services/safety.ts',
    'services/prompt-service.ts',
    'services/suggestion-prompt.ts',
    'components/ui/button.tsx',
  ],
  // Coverage thresholds for tested files only
  coverageThreshold: {
    'app/actions/patients.ts': { lines: 90, functions: 100 },
    'app/actions/sessions.ts': { lines: 90, functions: 100 },
    'app/actions/settings.ts': { lines: 90, functions: 100 },
    'app/actions/plan-history.ts': { lines: 90, functions: 100 },
    'lib/schemas/plan.ts': { lines: 90 },
    'lib/schemas/suggestion.ts': { lines: 90 },
    'lib/utils.ts': { lines: 90 },
    'services/safety.ts': { lines: 90, functions: 100 },
    'services/prompt-service.ts': { lines: 90, functions: 100 },
    'services/suggestion-prompt.ts': { lines: 90, functions: 100 },
  },
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/app/**/*.test.ts',
        '<rootDir>/lib/**/*.test.ts',
        '<rootDir>/services/**/*.test.ts',
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { useESM: false }],
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(next-auth|@auth|jose|uuid|@panva|openid-client)/)',
      ],
    },
    {
      displayName: 'component',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/components/**/*.test.tsx'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { useESM: false }],
      },
      transformIgnorePatterns: [
        '/node_modules/(?!(next-auth|@auth|jose|uuid|@panva|openid-client)/)',
      ],
    },
  ],
};
