# SessionSync - AI-Powered Treatment Planning

**SessionSync** is a comprehensive mental health platform that transforms therapy session recordings into structured, dynamic treatment plans. By leveraging advanced AI, it reduces documentation burden for clinicians while increasing client engagement through accessible, dual-perspective plans.

## 🚀 Key Features

### 🎙️ Session Management
*   **Smart Ingestion:** Upload audio/video recordings (mp3, wav, m4a) or text transcripts.
*   **Automated Transcription:** High-accuracy transcription using OpenAI's Whisper model.
*   **Manual Entry:** Option to manually enter or edit transcripts for non-recorded sessions.
*   **Secure Storage:** Audio files are securely stored in AWS S3 with presigned URL access.

### 🧠 AI Analysis & Dynamic Plans
*   **Intelligent Analysis:** GPT-4o analyzes sessions to extract key insights, progress notes, and clinical observations.
*   **Dynamic Updates:** The system suggests updates to the treatment plan (goals, interventions) based on the content of each session.
*   **Suggestion Review:** Clinicians can review, modify, approve, or reject AI-generated suggestions before they are applied to the plan.

### 👥 Dual-View Treatment Plans
*   **Therapist View:** Clinical rigor with SOAP notes, ICD-10 codes, risk assessments, and professional terminology.
*   **Client View:** "Warm," accessible language with simplified goals, emojis, and empowering summaries to foster patient engagement.

### 📅 Patient & Practice Management
*   **Patient Portal:** Dedicated view for patients to track their progress and view their treatment roadmap.
*   **Plan History:** Full version control for treatment plans. Track changes over time with "Diff" views to see exactly what changed and why.
### Dashboard
*   At-a-glance overview of recent sessions, pending reviews, and active patients.

---

## 📖 User Guide & Feature Walkthrough

### 1. Dashboard (`/dashboard`)
The command center for clinicians.
*   **Overview:** View your recent activity, including newly uploaded sessions and patients requiring attention.
*   **Quick Actions:** Jump straight to uploading a session or adding a new patient.

### 2. Session Management (`/sessions`)
The core ingestion pipeline for your practice.
*   **Upload:** Drag & drop audio files (MP3, WAV, M4A) or text transcripts directly into the browser.
*   **Auto-Transcribe:** Toggle this to automatically convert audio to text using OpenAI Whisper immediately upon upload.
*   **Assignment:** Link "Unassigned" sessions to specific patients to integrate them into their treatment history.
*   **Playback:** Built-in secure audio player allows you to listen to sessions while reviewing the generated transcript.

### 3. Patient Management (`/patients`)
Manage your roster and deep-dive into clinical care.
*   **Roster:** View all active patients, sorted by their latest session date, along with AI-calculated risk scores.
*   **Patient Profile:** Access demographics, diagnosis, and full session history.
*   **Dual-View Treatment Plan (The Core Feature):**
    *   **Therapist View:** Technical, clinical, and insurance-ready (SOAP notes, ICD-10 codes, clinical terminology).
    *   **Client View:** Automatically translated by AI into warm, encouraging, non-clinical language.
    *   **Plan Editor:** Manually edit goals, interventions, and homework. All changes are version-controlled.
    *   **AI Suggestions:** Click **"Update Plan"** to have the AI analyze the latest session and suggest specific updates (e.g., marking a goal as "Completed" or adding a new intervention).

### 4. Patient Portal (`/portal`)
A dedicated, safe space for clients.
*   **Secure Access:** Patients log in to view *only* their own data.
*   **My Plan:** They see the "Client View" of their treatment plan—simplified goals, emojis, and empowering language.
*   **Progress:** Visual tracking of their goal completion status over time.

### 5. Tools & Settings (`/tools`)
*   **Synthetic Session Generator:** (For demo/testing) Generate a realistic, 20-minute audio session between a therapist and a fictional patient (e.g., "Anxious Andy") to test the AI pipeline without real patient data.
*   **Clinical Preferences:** Set your preferred therapeutic modality (e.g., CBT, DBT, ACT). The AI adjusts its plan generation style to match your clinical approach.

---

## 🛠️ Technology Stack

### Frontend
*   **Framework:** Next.js 16 (App Router)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS v4, Shadcn UI, Lucide React
*   **State Management:** React Hooks, Zustand (for complex editors)

### Backend & Data
*   **Database:** PostgreSQL
*   **ORM:** Prisma
*   **Authentication:** NextAuth.js (v5 Beta) + AWS Cognito
*   **Storage:** AWS S3 (via AWS SDK v3)

### Artificial Intelligence
*   **Orchestration:** Vercel AI SDK
*   **LLM:** OpenAI GPT-4o (Reasoning/Generation)
*   **Transcription:** OpenAI Whisper (v2/v3)

---

## 🏃‍♂️ Getting Started

### Prerequisites
*   Node.js 20+
*   PostgreSQL (Local or Remote)
*   AWS Account (S3 Bucket & Cognito User Pool)
*   OpenAI API Key

### 1. Clone the Repository
```bash
git clone <repository-url>
cd treatment-plans
```

### 2. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory (reference `.env.example` if available) with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sessionsync"

# Authentication (NextAuth + Cognito)
AUTH_SECRET="your-generated-secret"
COGNITO_CLIENT_ID="your-cognito-client-id"
COGNITO_CLIENT_SECRET="your-cognito-client-secret"
COGNITO_ISSUER="https://cognito-idp.us-east-1.amazonaws.com/your-user-pool-id"

# AWS S3 (Storage)
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET_NAME="your-bucket-name"

# AI
OPENAI_API_KEY="sk-..."
```

### 4. Database Setup
Run the Prisma migrations to set up your database schema.
```bash
npx prisma migrate dev
```

Seed the database with test users and data:
```bash
npm run seed:all
```

### 5. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📂 Project Structure

*   **`/app`**: Next.js App Router pages and API routes.
    *   **`/app/api`**: Backend endpoints (upload, transcribe, analyze).
    *   **`/app/dashboard`**: Clinician dashboard.
    *   **`/app/patients`**: Patient list and details.
    *   **`/app/sessions`**: Session management and upload.
*   **`/components`**: Reusable UI components (atomic design).
    *   **`/components/plan`**: Complex components for the Treatment Plan editor.
*   **`/lib`**: Utility functions, database configurations, and type definitions.
*   **`/prisma`**: Database schema and migration files.
*   **`/services`**: Business logic for AI analysis, safety checks, and external integrations.
*   **`/scripts`**: Utilities for seeding data and generating synthetic audio for testing.

---

## 🛡️ Safety & Ethics

This application includes a "Safety Layer" that scans transcripts for high-risk keywords (self-harm, violence) before generating AI suggestions. 

**Disclaimer:** *AI-generated content is for support purposes only and is not a substitute for professional clinical judgment. All AI suggestions must be reviewed and approved by a licensed therapist.*