# Comprehensive Testing PRD - SessionSync

## Overview
Add comprehensive unit tests and end-to-end (E2E) tests to the SessionSync application to achieve robust test coverage across all application layers.

## Current State
- Jest 30.2.0 is configured with ts-jest
- 5 existing test files with ~5-10% coverage
- No React component testing setup
- No E2E testing framework

## Goals
1. Achieve 80%+ code coverage for critical business logic
2. Add component tests for all major React components
3. Add E2E tests covering critical user workflows
4. Establish consistent testing patterns and conventions

---

## Task 1: Set Up Testing Infrastructure

### Description
Configure testing infrastructure for unit tests, component tests, and E2E tests.

### Requirements
1. Install React Testing Library and related dependencies for component testing
2. Install and configure Playwright for E2E testing
3. Create test utilities and helpers (mock factories, test data generators)
4. Set up test database configuration for integration tests
5. Add npm scripts for running different test suites
6. Create CI/CD test workflow configuration

### Acceptance Criteria
- `npm run test:unit` runs unit tests
- `npm run test:component` runs component tests
- `npm run test:e2e` runs E2E tests
- `npm run test:coverage` generates coverage report
- Test utilities are available for creating mock data

---

## Task 2: Unit Tests for API Routes - Session Management

### Description
Add comprehensive unit tests for all session-related API routes.

### Routes to Test
1. `POST /api/sessions` - Create session
2. `GET /api/sessions` - List sessions with filtering
3. `POST /api/sessions/[id]` - Update session
4. `POST /api/sessions/[id]/transcribe` - Transcription endpoint
5. `GET /api/sessions/[id]/audio-url` - S3 presigned URL generation
6. `POST /api/sessions/[id]/analyze` - AI analysis trigger
7. `POST /api/sessions/[id]/summary` - Generate summary

### Test Cases Per Route
- Happy path with valid data
- Authentication/authorization failures
- Validation errors (invalid input)
- Database errors (Prisma failures)
- External service errors (S3, OpenAI)
- Edge cases (empty results, pagination)

### Acceptance Criteria
- All 7 session routes have test files
- Each route tests success and error scenarios
- Mocking patterns are consistent with existing tests
- 90%+ coverage for session route handlers

---

## Task 3: Unit Tests for API Routes - Treatment Plans

### Description
Add comprehensive unit tests for treatment plan API routes.

### Routes to Test
1. `POST /api/plans` - Create initial plan
2. `GET /api/plans/[id]` - Retrieve plan
3. `POST /api/plans/[id]/update` - Create new plan version
4. `GET /api/plans/[id]/diff` - Version comparison/diffing
5. `GET /api/plans/[id]/versions/[versionId]` - Historic version access
6. `GET /api/plans/[id]/goal-history` - Goal change timeline

### Test Cases Per Route
- Plan creation with valid schema
- Version incrementing logic
- Diff calculation between versions
- Goal history aggregation
- Authorization (only owner can access)
- Invalid plan IDs / not found scenarios

### Acceptance Criteria
- All 6 plan routes have test files
- Plan versioning logic is thoroughly tested
- Diff algorithm edge cases are covered
- 90%+ coverage for plan route handlers

---

## Task 4: Unit Tests for API Routes - Suggestions & Other

### Description
Add unit tests for suggestion workflow and remaining API routes.

### Routes to Test
1. `POST /api/suggestions/[id]/approve` - Accept AI suggestion
2. `POST /api/suggestions/[id]/reject` - Reject AI suggestion
3. `POST /api/analyze` - Core AI analysis pipeline
4. `POST /api/upload-url` - S3 upload URL generation
5. `GET /api/dashboard/reviews-due` - Dashboard widget data

### Test Cases
- Suggestion status transitions (PENDING → APPROVED/REJECTED)
- Plan update after suggestion approval
- Analysis pipeline with mocked AI responses
- S3 presigned URL generation
- Reviews due calculation (90-day logic)

### Acceptance Criteria
- All 5 routes have test files
- Suggestion state machine is fully tested
- AI analysis mocking is comprehensive
- 90%+ coverage for these routes

---

## Task 5: Unit Tests for Server Actions

### Description
Add comprehensive tests for all server actions.

### Actions to Test
1. `app/actions/sessions.ts` - Session fetching, suggestions
2. `app/actions/patients.ts` - Patient CRUD operations
3. `app/actions/audio.ts` - Audio URL generation
4. `app/actions/settings.ts` - User preferences
5. `app/actions/plan-history.ts` - Plan version tracking
6. `app/actions/generateDemoSession.ts` - Demo data generation

### Test Cases
- Zod schema validation (valid/invalid inputs)
- Authorization checks (user owns resource)
- Database transaction handling
- Error scenarios and error messages
- Edge cases (empty results, null values)

### Acceptance Criteria
- All 6 action files have corresponding test files
- Zod validation errors are tested
- Authorization is verified
- 90%+ coverage for server actions

---

## Task 6: Unit Tests for Services and Business Logic

### Description
Add unit tests for service layer and business logic.

### Services to Test
1. `services/safety.ts` - High-risk content detection
   - `scanForKeywords()` keyword matching
   - `analyzeRiskWithLLM()` AI analysis
   - `validateContent()` combined validation
2. `services/analysis.ts` - Session analysis logic
3. `services/prompt-service.ts` - Prompt assembly
4. `services/suggestion-service.ts` - Suggestion generation
5. `services/suggestion-prompt.ts` - Prompt templates

### Test Cases
- Safety: All keyword categories (suicide, harm, abuse, etc.)
- Safety: LLM response parsing and error handling
- Analysis: Input/output transformations
- Prompts: Template variable substitution
- Suggestions: Generation workflow

### Acceptance Criteria
- All 5 service files have test coverage
- Safety service has comprehensive edge case coverage
- 95%+ coverage for services (critical business logic)

---

## Task 7: Unit Tests for Schemas and Utilities

### Description
Add unit tests for Zod schemas and utility functions.

### Files to Test
1. `lib/schemas/plan.ts` - Treatment plan schemas
   - TreatmentPlanSchema
   - DiagnosisSchema (ICD-10 format)
   - ClinicalGoalSchema
   - ClientGoalSchema
2. `lib/schemas/suggestion.ts` - Suggestion schemas
3. `lib/utils.ts` - Utility functions
4. `lib/auth.ts` - Auth configuration

### Test Cases
- Valid inputs parse correctly
- Invalid inputs produce correct errors
- Boundary conditions (min/max lengths)
- Optional vs required fields
- ICD-10 code format validation
- Auth callbacks behavior

### Acceptance Criteria
- All schema files have validation tests
- Auth callbacks are tested with mocked providers
- 100% coverage for schema files

---

## Task 8: Component Tests - Session Management UI

### Description
Add React component tests for session-related components.

### Components to Test
1. `components/sessions/sessions-page-client.tsx` - Main sessions page
2. `components/sessions/add-session-modal.tsx` - Session creation form
3. `components/sessions/transcript-modal.tsx` - Transcript display
4. `components/sessions/audio-player-modal.tsx` - Audio playback
5. `components/sessions/sessions-table.tsx` - Session data table
6. `components/sessions/file-drop-zone.tsx` - Audio upload

### Test Cases
- Component renders without errors
- User interactions (clicks, form inputs)
- Form validation feedback
- Loading states
- Error states
- Accessibility (a11y)

### Acceptance Criteria
- All 6 session components have tests
- User interactions are simulated and verified
- Accessibility tests pass
- 80%+ coverage for session components

---

## Task 9: Component Tests - Plan Editor and Views

### Description
Add React component tests for plan editing components.

### Components to Test
1. `components/plan/PlanEditor.tsx` - Main plan editor (400+ lines)
2. `components/plan/DualViewPlan.tsx` - View switching
3. `components/plan/ClientView.tsx` - Patient-friendly view
4. `components/plan/TherapistView.tsx` - Clinical SOAP view
5. `components/plan/SuggestionReviewPanel.tsx` - Suggestion approval

### Test Cases
- Plan data renders correctly
- Edit mode toggles
- Form validation on plan edits
- View switching between therapist/client
- Suggestion approval/rejection interactions
- Save/cancel operations

### Acceptance Criteria
- All 5 plan components have tests
- Complex form interactions are tested
- 80%+ coverage for plan components

---

## Task 10: Component Tests - Patient and Dashboard UI

### Description
Add React component tests for patient and dashboard components.

### Components to Test
1. `components/patients/patient-header.tsx` - Patient info display
2. `components/patients/session-history.tsx` - Timeline
3. `components/patients/add-patient-button.tsx` - Patient creation
4. `components/dashboard/dashboard-client-page.tsx` - Dashboard
5. `components/dashboard/session-list.tsx` - Session cards
6. `components/dashboard/reviews-due-widget.tsx` - Review calendar

### Test Cases
- Data displays correctly
- Navigation/routing
- Empty states
- Loading states
- User interactions

### Acceptance Criteria
- All 6 components have tests
- Navigation behavior is verified
- 80%+ coverage for these components

---

## Task 11: E2E Tests - Authentication Flows

### Description
Add Playwright E2E tests for authentication workflows.

### Test Scenarios
1. User login via Cognito
2. Session persistence across page loads
3. Logout functionality
4. Unauthorized access redirects
5. Role-based access (admin vs clinician)

### Acceptance Criteria
- Login flow works end-to-end
- Protected routes redirect properly
- Session handling is correct

---

## Task 12: E2E Tests - Session Workflow

### Description
Add E2E tests for complete session management workflow.

### Test Scenarios
1. Create new session with audio upload
2. Assign session to patient
3. Trigger transcription
4. View transcript
5. Trigger AI analysis
6. Review and approve suggestions
7. Delete session

### Acceptance Criteria
- Full session lifecycle is tested
- Audio upload works in E2E
- AI analysis workflow completes

---

## Task 13: E2E Tests - Treatment Plan Workflow

### Description
Add E2E tests for treatment plan management.

### Test Scenarios
1. Create new treatment plan for patient
2. Edit plan in therapist view
3. Switch to client view
4. Create new plan version
5. View version history and diff
6. Goal status updates

### Acceptance Criteria
- Plan creation and editing works E2E
- Version history is accessible
- Diff view shows changes correctly

---

## Task 14: E2E Tests - Patient Management

### Description
Add E2E tests for patient roster management.

### Test Scenarios
1. Add new patient
2. View patient profile
3. View patient session history
4. Update patient status (active/inactive)
5. Delete patient (with privacy options)

### Acceptance Criteria
- Patient CRUD operations work E2E
- Session history displays correctly
- Privacy deletion works as expected

---

## Task 15: E2E Tests - Dashboard and Navigation

### Description
Add E2E tests for dashboard and app navigation.

### Test Scenarios
1. Dashboard loads with correct data
2. Reviews due widget shows accurate info
3. Navigation between pages
4. Search and filtering functionality
5. Responsive layout on different screen sizes

### Acceptance Criteria
- Dashboard data is accurate
- Navigation is smooth
- Responsive design works

---

## Task 16: Test Coverage Report and Documentation

### Description
Generate coverage reports and document testing patterns.

### Deliverables
1. Generate comprehensive coverage report
2. Document testing patterns and conventions
3. Create testing README for developers
4. Add coverage badges to main README
5. Set up coverage thresholds in CI

### Acceptance Criteria
- Coverage report is generated and accessible
- Testing documentation is complete
- CI enforces minimum coverage thresholds

---

## Technical Notes

### Mock Patterns
```typescript
// Prisma mocking
jest.mock('@/lib/db', () => ({
  prisma: {
    session: { findMany: jest.fn(), create: jest.fn() },
    patient: { findMany: jest.fn() }
  }
}));

// AI SDK mocking
jest.mock('ai', () => ({ generateObject: jest.fn(), generateText: jest.fn() }));
jest.mock('@ai-sdk/openai', () => ({ openai: jest.fn() }));

// Auth mocking
jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
```

### Test File Location Convention
```
source: /app/api/plans/route.ts
test:   /app/api/plans/route.test.ts

source: /components/plan/PlanEditor.tsx
test:   /components/plan/PlanEditor.test.tsx
```

### Dependencies to Add
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
- @playwright/test
- jest-environment-jsdom
