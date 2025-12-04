# Testing Guide - SessionSync

This document describes the testing infrastructure and conventions for the SessionSync application.

## Overview

The project uses a multi-layered testing strategy:

- **Unit Tests**: Jest with ts-jest for testing business logic, schemas, and services
- **Component Tests**: React Testing Library with Jest for UI component testing
- **E2E Tests**: Playwright for end-to-end user flow testing

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run component tests only
npm run test:component

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test File Locations

Tests are co-located with source files using the `.test.ts` or `.test.tsx` suffix:

```
source: /app/api/plans/route.ts
test:   /app/api/plans/route.test.ts

source: /components/plan/PlanEditor.tsx
test:   /components/plan/PlanEditor.test.tsx

source: /services/safety.ts
test:   /services/safety.test.ts
```

E2E tests are located in the `/e2e` directory:
```
e2e/
├── auth.spec.ts
├── navigation.spec.ts
└── example.spec.ts
```

## Test Utilities

### Mocks

Pre-built mocks are available in `/test/mocks/`:

```typescript
// Mock Prisma
jest.mock('@/lib/db', () => require('@/test/mocks/prisma'));

// Mock Auth
jest.mock('@/lib/auth', () => require('@/test/mocks/auth'));

// Mock AI SDK
jest.mock('ai', () => require('@/test/mocks/ai').aiMock);
jest.mock('@ai-sdk/openai', () => require('@/test/mocks/ai').openaiMock);
```

### Factories

Test data factories are available in `/test/mocks/factories.ts`:

```typescript
import {
  createMockPatient,
  createMockSession,
  createMockTreatmentPlan,
} from '@/test/mocks/factories';

const patient = createMockPatient({ name: 'Test Patient' });
const sessions = createMockSessions(5);
```

### Custom Render

For component tests, use the custom render function that includes providers:

```typescript
import { render } from '@/test/utils/render';
import { screen } from '@testing-library/react';

const { user } = render(<MyComponent />);
await user.click(screen.getByRole('button'));
```

## Writing Tests

### Unit Tests (Services, Actions, Schemas)

```typescript
// services/example.test.ts
jest.mock('@/lib/db', () => ({
  prisma: {
    model: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/db';
import { myFunction } from './example';

describe('myFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', async () => {
    (prisma.model.findMany as jest.Mock).mockResolvedValue([]);

    const result = await myFunction('input');

    expect(result).toEqual([]);
  });
});
```

### Component Tests

```typescript
// components/ui/button.test.tsx
import { render } from '@/test/utils/render';
import { screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('handles click events', async () => {
    const onClick = jest.fn();
    const { user } = render(<Button onClick={onClick}>Click</Button>);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalled();
  });
});
```

### E2E Tests

```typescript
// e2e/feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test('should work correctly', async ({ page }) => {
    await page.goto('/feature');

    await expect(page.locator('h1')).toHaveText('Feature');
  });
});
```

## Mocking Patterns

### Mocking Prisma

```typescript
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(prisma)),
  },
}));
```

### Mocking AI/OpenAI

```typescript
jest.mock('ai', () => ({
  generateText: jest.fn(),
  generateObject: jest.fn(),
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mock-model'),
}));

// In test
import { generateText } from 'ai';
(generateText as jest.Mock).mockResolvedValue({ text: 'response' });
```

### Mocking Next.js

```typescript
// Mocked automatically in jest.setup.js
// next/navigation - useRouter, usePathname, etc.
// next/headers - cookies, headers
// next/cache - revalidatePath, revalidateTag
```

## Coverage Requirements

The project enforces minimum coverage thresholds:

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

## CI/CD

Tests run automatically on:
- Push to `main` or `tests` branches
- Pull requests targeting `main`

The CI pipeline runs:
1. Unit tests with coverage
2. Component tests
3. E2E tests

## Troubleshooting

### ESM Module Errors

Some packages (like `next-auth`) use ESM. If you see "Cannot use import statement outside a module", mock the module at the test level:

```typescript
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'test' } }),
}));
```

### Async Tests

Always use `async/await` for async operations:

```typescript
it('should fetch data', async () => {
  const result = await fetchData();
  expect(result).toBeDefined();
});
```

### Component Not Found

Ensure you're importing from the correct path and the component is exported:

```typescript
// Wrong
import { Button } from './button.tsx';

// Correct
import { Button } from './button';
```
