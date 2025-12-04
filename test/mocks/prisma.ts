// Prisma mock for testing
// Usage: jest.mock('@/lib/db', () => require('@/test/mocks/prisma'));

import { PrismaClient } from '@prisma/client';

type MockPrismaClient = {
  [K in keyof PrismaClient]: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    deleteMany: jest.Mock;
    count: jest.Mock;
    aggregate: jest.Mock;
    upsert: jest.Mock;
  };
} & {
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
};

const createMockModel = () => ({
  findMany: jest.fn(),
  findFirst: jest.fn(),
  findUnique: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  upsert: jest.fn(),
});

export const prisma: MockPrismaClient = {
  user: createMockModel(),
  patient: createMockModel(),
  session: createMockModel(),
  treatmentPlan: createMockModel(),
  planVersion: createMockModel(),
  planSuggestion: createMockModel(),
  goalHistory: createMockModel(),
  $transaction: jest.fn((fn) => fn(prisma)),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
} as unknown as MockPrismaClient;

// Helper to reset all mocks
export const resetPrismaMocks = () => {
  Object.values(prisma).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((method) => {
        if (typeof method === 'function' && 'mockReset' in method) {
          (method as jest.Mock).mockReset();
        }
      });
    }
  });
};
