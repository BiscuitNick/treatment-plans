# Treatment Plan Lifecycle & Suggested Updates PRD

## 1. Problem Statement

Currently, treatment plans are **completely regenerated** after each therapy session. The AI produces an entirely new plan that immediately replaces the previous version. This approach has several critical issues:

1. **Not clinically accurate**: Real treatment plans are "living documents" that evolve incrementally over months, not rewritten after each session
2. **Loss of continuity**: Therapists can't track what specifically changed and why
3. **No approval workflow**: AI-generated changes are auto-committed without therapist review
4. **Poor progress visibility**: Patients and therapists can't see goal progression over time
5. **No distinction between session notes and plan updates**: Every session triggers a full plan rewrite

## 2. Goals

- Transform treatment plans into true **living documents** that evolve incrementally
- Implement **suggested updates** that therapists must review and approve
- Provide **clear visibility** into what changed and why
- Track **goal progress** over time with status transitions
- Support the **90-day review cycle** standard in clinical practice
- Separate **session progress notes** from **plan updates**

## 3. User Stories

### Therapist Stories
- As a therapist, I want to see AI-suggested changes after a session so I can review before they're applied
- As a therapist, I want to approve, modify, or reject suggested changes
- As a therapist, I want to see a clear diff of what's being proposed vs current plan
- As a therapist, I want to mark goals as completed/deferred with a reason
- As a therapist, I want to be notified when a plan is due for 90-day review

### Patient Stories
- As a patient, I want to see my progress on goals over time
- As a patient, I want to understand what changed in my plan and why
- As a patient, I want to see a timeline of my treatment journey

## 4. Data Model Changes

### 4.1 New Enum: `SuggestionStatus`
```prisma
enum SuggestionStatus {
  PENDING      // Awaiting therapist review
  APPROVED     // Accepted and applied to plan
  MODIFIED     // Accepted with therapist modifications
  REJECTED     // Declined by therapist
}
```

### 4.2 New Enum: `GoalStatus` (expanded)
```prisma
enum GoalStatus {
  ACTIVE        // Currently being worked on
  IN_PROGRESS   // Started, making progress
  COMPLETED     // Successfully achieved
  MAINTAINED    // Completed and in maintenance phase
  DEFERRED      // Postponed for later
  DISCONTINUED  // No longer relevant/appropriate
}
```

### 4.3 New Model: `PlanSuggestion`
Stores AI-generated suggestions pending therapist approval.

```prisma
model PlanSuggestion {
  id              String           @id @default(uuid())
  treatmentPlanId String
  treatmentPlan   TreatmentPlan    @relation(fields: [treatmentPlanId], references: [id])
  sessionId       String           @unique
  session         Session          @relation(fields: [sessionId], references: [id])

  status          SuggestionStatus @default(PENDING)

  // Structured suggested changes (not full plan replacement)
  suggestedChanges Json  // See schema below

  // What the AI found in the session
  sessionSummary    String @db.Text  // Brief summary of what happened
  progressNotes     String @db.Text  // Clinical progress notes for this session

  // Therapist response
  reviewedAt        DateTime?
  reviewedBy        String?
  therapistNotes    String?  // Why they approved/rejected/modified

  createdAt         DateTime @default(now())
}
```

### 4.4 Suggested Changes Schema (JSON)
```typescript
interface SuggestedChanges {
  goalUpdates: {
    goalId: string;
    currentStatus: GoalStatus;
    suggestedStatus: GoalStatus;
    progressNote: string;  // What happened this session
    rationale: string;     // Why AI suggests this change
  }[];

  newGoals: {
    description: string;
    clinicalRationale: string;
    suggestedTargetDate: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
  }[];

  interventionsUsed: string[];  // What was done THIS session

  suggestedInterventions: {
    intervention: string;
    rationale: string;
  }[];

  homeworkUpdate: {
    current: string;
    suggested: string;
    rationale: string;
  } | null;

  riskAssessment: {
    currentLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    suggestedLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    rationale: string;
    flags: string[];
  };
}
```

### 4.5 New Model: `GoalHistory`
Track individual goal status changes over time.

```prisma
model GoalHistory {
  id              String     @id @default(uuid())
  treatmentPlanId String
  treatmentPlan   TreatmentPlan @relation(fields: [treatmentPlanId], references: [id])
  goalId          String     // References goal ID within plan JSON

  previousStatus  String
  newStatus       String
  changedAt       DateTime   @default(now())
  changedBy       String?    // User ID
  reason          String?    // Why the change was made
  sessionId       String?    // Which session triggered this
}
```

### 4.6 Update: `TreatmentPlan` Model
```prisma
model TreatmentPlan {
  id              String           @id @default(uuid())
  patientId       String           @unique
  patient         Patient          @relation(fields: [patientId], references: [id])

  // Current approved plan content
  currentContent  Json

  // Lifecycle tracking
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt
  lastReviewedAt  DateTime?        // Last 90-day review
  nextReviewDue   DateTime?        // When next review is due

  // Relations
  versions        PlanVersion[]
  suggestions     PlanSuggestion[]
  goalHistory     GoalHistory[]
}
```

### 4.7 Update: `PlanVersion` Model
```prisma
model PlanVersion {
  id              String        @id @default(uuid())
  treatmentPlanId String
  treatmentPlan   TreatmentPlan @relation(fields: [treatmentPlanId], references: [id])

  content         Json
  version         Int

  // Change tracking
  changeType      String        // 'INITIAL' | 'SESSION_UPDATE' | 'MANUAL_EDIT' | '90_DAY_REVIEW'
  changeSummary   String?       // Human-readable summary of what changed
  suggestionId    String?       // Link to the suggestion that created this version

  createdAt       DateTime      @default(now())
  createdBy       String?
}
```

### 4.8 Update: `Session` Model
```prisma
model Session {
  id              String          @id @default(uuid())
  patientId       String
  patient         Patient         @relation(fields: [patientId], references: [id])

  transcript      String?         @db.Text
  audioUrl        String?

  // New: Session-specific notes (separate from plan)
  progressNote    String?         @db.Text  // What happened this session

  // Link to suggestion
  suggestion      PlanSuggestion?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}
```

## 5. Workflow Changes

### 5.1 Post-Session Flow (New)
```
1. Therapist uploads session audio
2. System transcribes audio
3. AI analyzes transcript against CURRENT plan
4. AI generates PlanSuggestion (NOT a new plan version)
   - Session summary
   - Progress notes
   - Suggested goal status changes
   - Suggested new goals (if any)
   - Risk assessment update
5. Therapist reviews suggestion in "Review Changes" UI
6. Therapist can:
   - Approve all suggestions
   - Approve with modifications
   - Reject suggestions
   - Add their own notes
7. On approval: New PlanVersion created with changes applied
8. GoalHistory records updated for any status changes
```

### 5.2 Initial Plan Creation (Intake)
```
1. First 1-3 sessions: AI generates initial plan structure
2. Plan marked as "DRAFT" until therapist formally approves
3. Therapist reviews and establishes baseline goals
4. Sets initial target dates
5. Plan becomes "ACTIVE" with version 1
```

### 5.3 90-Day Review Flow
```
1. System flags plans approaching 90-day review date
2. Dashboard shows "Review Due" badge
3. Therapist opens comprehensive review UI
4. Reviews all goals, progress, and trajectory
5. Can bulk update statuses, add/remove goals
6. Creates new version with changeType = '90_DAY_REVIEW'
7. Sets next review date
```

## 6. API Changes

### 6.1 New Endpoints

#### POST /api/sessions/[id]/analyze
Generates suggestion without auto-saving plan.
```typescript
Request: { sessionId: string }
Response: {
  suggestion: PlanSuggestion,
  sessionSummary: string,
  suggestedChanges: SuggestedChanges
}
```

#### POST /api/suggestions/[id]/approve
Approves suggestion and creates new plan version.
```typescript
Request: {
  modifications?: Partial<SuggestedChanges>,
  therapistNotes?: string
}
Response: {
  planVersion: PlanVersion,
  updatedPlan: TreatmentPlan
}
```

#### POST /api/suggestions/[id]/reject
Rejects suggestion with reason.
```typescript
Request: { reason: string }
Response: { success: boolean }
```

#### GET /api/plans/[id]/diff
Returns diff between current plan and pending suggestion.
```typescript
Response: {
  currentPlan: TreatmentPlan,
  suggestedChanges: SuggestedChanges,
  diffView: DiffView  // Structured diff for UI
}
```

#### GET /api/plans/[id]/goal-history
Returns history for all goals in a plan.
```typescript
Response: {
  goals: {
    goalId: string,
    description: string,
    currentStatus: GoalStatus,
    history: GoalHistoryEntry[]
  }[]
}
```

#### GET /api/dashboard/reviews-due
Returns plans needing 90-day review.
```typescript
Response: {
  plans: {
    planId: string,
    patientName: string,
    lastReviewedAt: Date,
    daysSinceReview: number
  }[]
}
```

### 6.2 Modified Endpoints

#### POST /api/analyze (Updated)
No longer auto-saves. Returns suggestion for review.
```typescript
Response: {
  suggestionId: string,
  suggestion: PlanSuggestion,
  requiresReview: true
}
```

## 7. UI Changes

### 7.1 New: Suggestion Review Panel
After session processing, show a review panel:
- Side-by-side diff view (current vs suggested)
- Goal changes highlighted with status badges
- New goals in a distinct section
- Risk level change indicator
- "Approve All" / "Approve with Changes" / "Reject" buttons
- Text area for therapist notes

### 7.2 New: Goal Progress Timeline
Visual timeline showing:
- When goal was created
- Status transitions over time
- Which sessions contributed to progress
- Target date vs actual completion

### 7.3 New: 90-Day Review Dashboard Widget
- Count of plans due for review
- List with patient names and days overdue
- Quick action to start review

### 7.4 Updated: Plan History View
- Show change summaries, not just version numbers
- Diff viewer between any two versions
- Filter by change type (session update, manual edit, review)

### 7.5 Updated: Patient Portal
- Progress visualization for goals
- "Your Journey" timeline
- Simplified view of what changed

## 8. AI Prompt Changes

### 8.1 New Prompt Strategy
Instead of "generate updated plan", prompt should be:
"Analyze this session and suggest SPECIFIC CHANGES to the existing plan"

Key instruction changes:
- Return structured `SuggestedChanges` object, not full plan
- For each goal, explain what progress was made
- Only suggest status changes with clear rationale
- Identify truly new goals vs existing goal refinements
- Session summary should be 2-3 sentences max

### 8.2 Example Prompt Structure
```
You are analyzing a therapy session to suggest updates to an existing treatment plan.

CURRENT PLAN:
[Current plan JSON]

SESSION TRANSCRIPT:
[Transcript]

INSTRUCTIONS:
1. For each existing goal, assess if this session showed progress, setbacks, or no change
2. Only suggest status changes if clearly warranted by session content
3. If a new issue emerged, suggest a new goal with rationale
4. Do NOT rewrite existing goal descriptions unless factually incorrect
5. Provide a brief session summary (2-3 sentences)
6. Write clinical progress notes for this session

Return a SuggestedChanges JSON object.
```

## 9. Implementation Phases

### Phase 1: Data Model & Schema
1. Add new enums to Prisma schema
2. Create PlanSuggestion model
3. Create GoalHistory model
4. Update TreatmentPlan model
5. Update Session model
6. Run migrations

### Phase 2: Backend - Suggestion Generation
1. Create new AI prompt for incremental analysis
2. Build suggestion generation service
3. Create POST /api/sessions/[id]/analyze endpoint
4. Update processSession to return suggestion (not auto-save)

### Phase 3: Backend - Approval Workflow
1. Create approve/reject endpoints
2. Build plan merging logic (apply suggestions to current plan)
3. Implement GoalHistory tracking
4. Add 90-day review date calculation

### Phase 4: Frontend - Review UI
1. Build SuggestionReviewPanel component
2. Create diff view component
3. Update upload flow to show review after processing
4. Add approve/modify/reject actions

### Phase 5: Frontend - Progress Tracking
1. Build GoalTimeline component
2. Add goal history to patient detail page
3. Create 90-day review dashboard widget
4. Update plan history view with diffs

### Phase 6: Patient Portal Updates
1. Add progress visualization
2. Create "Your Journey" timeline
3. Show simplified change history

## 10. Success Metrics

- Therapist approval rate of AI suggestions (target: >70%)
- Time from session to approved plan update
- Goal completion tracking accuracy
- 90-day review compliance rate
- Patient engagement with progress features

## 11. Out of Scope (Future)

- Multi-provider care coordination
- Insurance billing integration
- Automated progress reports
- Patient self-reported outcomes integration
