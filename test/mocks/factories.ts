// Test data factories
// Usage: import { createMockPatient, createMockSession } from '@/test/mocks/factories';

import { Patient, Session, TreatmentPlan, PlanVersion, PlanSuggestion, User } from '@prisma/client';

let idCounter = 0;
const generateId = () => `test-id-${++idCounter}`;

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: generateId(),
  email: `user${idCounter}@test.com`,
  name: `Test User ${idCounter}`,
  role: 'CLINICIAN',
  preferences: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockPatient = (overrides: Partial<Patient> = {}): Patient => ({
  id: generateId(),
  name: 'John Doe',
  age: 34,
  gender: 'Male',
  diagnosis: null,
  notes: null,
  status: 'ACTIVE',
  clinicianId: 'clinician-id',
  userId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  id: generateId(),
  patientId: null,
  clinicianId: 'clinician-id',
  audioUrl: 's3://bucket/audio.mp3',
  s3Key: null,
  transcript: null,
  summary: null,
  progressNote: null,
  status: 'UNASSIGNED',
  sessionDate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockTreatmentPlan = (overrides: Partial<TreatmentPlan> = {}): TreatmentPlan => ({
  id: generateId(),
  patientId: 'patient-id',
  currentContent: {
    diagnoses: [],
    clinicalGoals: [],
    clientGoals: [],
  },
  lastReviewedAt: null,
  nextReviewDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockPlanVersion = (overrides: Partial<PlanVersion> = {}): PlanVersion => ({
  id: generateId(),
  treatmentPlanId: 'plan-id',
  version: 1,
  content: {
    diagnoses: [],
    clinicalGoals: [],
    clientGoals: [],
  },
  changeType: 'MANUAL_EDIT',
  changeSummary: null,
  suggestionId: null,
  createdBy: null,
  changeReason: null,
  createdAt: new Date(),
  ...overrides,
});

export const createMockPlanSuggestion = (overrides: Partial<PlanSuggestion> = {}): PlanSuggestion => ({
  id: generateId(),
  treatmentPlanId: 'plan-id',
  sessionId: 'session-id',
  sessionSummary: 'Session summary content',
  progressNotes: null,
  suggestedChanges: {
    diagnoses: [],
    clinicalGoals: [],
    clientGoals: [],
  },
  status: 'PENDING',
  reviewedAt: null,
  reviewedBy: null,
  therapistNotes: null,
  createdAt: new Date(),
  ...overrides,
});

// Create multiple items
export const createMockPatients = (count: number, overrides: Partial<Patient> = {}): Patient[] =>
  Array.from({ length: count }, (_, i) =>
    createMockPatient({ name: `Patient ${i + 1}`, ...overrides })
  );

export const createMockSessions = (count: number, overrides: Partial<Session> = {}): Session[] =>
  Array.from({ length: count }, () => createMockSession(overrides));

// Reset ID counter for fresh test runs
export const resetFactoryIds = () => {
  idCounter = 0;
};
