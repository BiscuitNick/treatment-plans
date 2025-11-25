# Refactoring & Expansion Plan: Patient-Centric Architecture

## 1. Architectural Shift
**Current State:** Session-centric. One `User` (Clinician) has many `Sessions`. Each `Session` has its own `TreatmentPlan`.
**Target State:** Patient-centric. One `User` (Clinician) manages many `Patients`. Each `Patient` has **one active** `TreatmentPlan` (which evolves) and many `Sessions`.

## 2. Schema Changes (Prisma)
- **New Model: `Patient`**
  - `id`: UUID
  - `name`: String
  - `status`: Enum (ACTIVE, ARCHIVED)
  - `clinicianId`: Relation to `User`
  - `sessions`: Relation to `Session[]`
  - `treatmentPlan`: Relation to `TreatmentPlan?` (One-to-one, nullable initially)

- **Update Model: `Session`**
  - Remove direct relation to `User`.
  - Add relation to `Patient` (`patientId`).
  - Keep `transcript`, `audioUrl`.

- **Update Model: `TreatmentPlan`**
  - Remove relation to `Session`.
  - Add relation to `Patient` (`patientId`, unique).
  - Fields remain: `clinicalGoals`, `riskScore`, etc.
  - **Versioning:** Keep `PlanVersion` related to `TreatmentPlan`.

## 3. New Pages & Routes
- **/patients (List)**
  - Table of patients belonging to the logged-in clinician.
  - Columns: Name, Status, Last Session Date, Risk Score (from Plan).
  - Action: "Add Patient" modal.

- **/patients/[id] (Detail/Profile)**
  - **Header:** Patient Name, Status.
  - **Tab 1: Overview/Profile:** Basic demographics (placeholder), stats.
  - **Tab 2: Treatment Plan:** The **Living Document**.
    - Displays the *current* active plan.
    - "History" button shows the `PlanVersion` timeline.
  - **Tab 3: Sessions:** List of past sessions (Transcripts + Audio).
  - **Action:** "Start Session" / "Simulate Session" (Pre-fills this patient context).

- **/settings**
  - Simple form for `User` preferences (e.g., "Clinical Modality": CBT, DBT).
  - Store in `User.preferences` (JSON).

## 4. Logic Updates (AI Pipeline)
- **Context Assembly (`services/prompt-service.ts`)**
  - **Input:** `transcript`, `patientId`.
  - **Fetch:**
    1.  The Patient's *current* `TreatmentPlan`.
    2.  The *last 3* Session transcripts (summarized if possible, or raw).
  - **Prompt Strategy:**
    - "Here is the patient's CURRENT plan: [JSON]"
    - "Here is the NEW session transcript: [Text]"
    - "Task: UPDATE the plan. Mark completed goals, modify interventions based on new info, update risk score. Do not rewrite from scratch unless necessary."

- **Analysis Service (`services/analysis.ts`)**
  - `processSession` signature changes to accept `patientId`.
  - **Step 1:** Save `Session` (linked to Patient).
  - **Step 2:** Fetch existing `TreatmentPlan`.
  - **Step 3:** Call LLM with Context.
  - **Step 4:** Update `TreatmentPlan` (DB) and create `PlanVersion`.

## 5. Simulation Enhancements
- **"Simulate Session" Modal:**
  - Dropdown: "Select Patient" (Real DB patients) OR "Create New Persona".
  - If "Select Patient": Fetch their context -> Generate a transcript *relevant* to their goals (e.g., "Talk about the homework from last time").
  - If "New Persona": Generate scratch data.

## 6. Revised Task List
1.  **Database Refactor:** Implement `Patient` model, migrate relations, seed data.
2.  **Patient Management UI:** Build `/patients` list and `/patients/[id]` layout.
3.  **Context-Aware AI:** Rewrite `prompt-service` to inject Plan history.
4.  **Simulation Update:** Upgrade "Magic Button" to support patient selection.
5.  **Settings/Profile:** Basic implementation for completeness.
