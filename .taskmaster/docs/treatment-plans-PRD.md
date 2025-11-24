# **Product Requirements Document: AI Mental Health Treatment Plan Generator**

## **1\. Executive Summary**

Project Name: Tava AI Treatment Planner  
Objective: Build a full-stack, AI-powered application that transforms therapy session audio/video into structured, dual-perspective treatment plans (Therapist Clinical View vs. Client Empathetic View).  
Core Value: Reduces therapist documentation burnout while increasing client engagement through accessible, automated care plans.

## **2\. Technical Architecture & Stack**

### **2.1 Core Stack**

* **Framework:** **Next.js 16 (App Router)**. Uses Turbopack by default.  
* **Language:** TypeScript.  
* **Styling:** **Tailwind CSS v4** (CSS-first configuration) \+ **shadcn/ui**.  
* **State Management:** **Zustand** (for Plan Editor state).  
* **ORM:** **Prisma** (PostgreSQL).  
* **Serverless Config:** Since we are on a Paid Vercel Plan, all API routes handling AI generation must specify export const maxDuration \= 300; (5 minutes) to safely handle the 20-minute audio processing without timeouts.

### **2.2 Infrastructure (AWS Ecosystem)**

* **Strategy:** Manual Setup ("ClickOps") via AWS Console. No Terraform/IaC required for this demo.  
* **Database:** **Amazon RDS for PostgreSQL** (db.t3.micro).  
* **Authentication:** **Amazon Cognito** (User Pool: Therapist, Client).  
* **File Storage:** **Amazon S3** (Audio/Video uploads).

### **2.3 AI Pipeline**

* **Orchestration:** **Vercel AI SDK**.  
* **Transcription:** **OpenAI Whisper (v2/v3)**.  
* **Reasoning/Generation:** **GPT-4o**.  
* **Safety:** Regex \+ gpt-4o-mini classification.

## **3\. Data Strategy (Seeding & Simulation)**

### **3.1 Static Personas (Seeded Data)**

1. **"Anxious Andy":** GAD (Workplace stress).  
2. **"Depressed Danielle":** MDD (Motivation/Withdrawal).  
3. **"Conflict Chris":** Relationship issues.

### **3.2 Dynamic Simulation ("The Magic Button")**

* **Feature:** \[Generate Random Session\] button.  
* **Logic:** GPT-4o generates a 1500-word transcript.

### **3.3 Demo Data Source (Synthetic Audio)**

* **Script:** scripts/generate-audio.ts.  
* **Process:** Generate \~3,000 words \-\> OpenAI tts-1 \-\> Stitch via ffmpeg \-\> 20-min MP3 (\~15MB).

## **4\. System Architecture Diagram**

graph TD  
    User\[User (Therapist)\] \--\>|Uploads Audio/Video| UI\[Next.js Frontend\]  
    UI \--\>|Auth Request| Cognito\[AWS Cognito\]  
    UI \--\>|Upload File| S3\[Amazon S3 Bucket\]  
    UI \--\>|API: /generate-plan| API\[Next.js API Route\]  
      
    subgraph AI Pipeline  
    API \--\>|1. Get Signed URL| S3  
    API \--\>|2. Send Audio URL| Whisper\[OpenAI Whisper API\]  
    Whisper \--\>|3. Return Transcript| API  
    API \--\>|4. Safety Scan| Safety\[Safety Guardrail (Regex/GPT-4o-mini)\]  
    Safety \--\>|5. If Safe: Generate JSON| GPT4\[GPT-4o Model\]  
    end  
      
    subgraph Data Layer  
    API \--\>|Fetch Previous Plan| Prisma\[Prisma ORM\]  
    API \--\>|Save Session & Plan| RDS\[AWS RDS (Postgres)\]  
    end

## **5\. Database Schema (Prisma)**

// schema.prisma

model User {  
  id        String   @id @default(uuid())  
  cognitoId String   @unique   
  email     String   @unique  
  role      UserRole @default(CLIENT)  
  name      String  
  preferences Json? // e.g. { "modality": "CBT" }  
    
  therapistSessions Session\[\] @relation("TherapistSessions")  
  clientSessions    Session\[\] @relation("ClientSessions")  
  plans             TreatmentPlan\[\]  
}

enum UserRole {  
  THERAPIST  
  CLIENT  
}

model Session {  
  id          String   @id @default(uuid())  
  createdAt   DateTime @default(now())  
  date        DateTime  
  transcript  String   @db.Text  
  audioUrl    String?   
  videoUrl    String?   
    
  therapistId String  
  therapist   User     @relation("TherapistSessions", fields: \[therapistId\], references: \[id\])  
  clientId    String  
  client      User     @relation("ClientSessions", fields: \[clientId\], references: \[id\])  
    
  plan        TreatmentPlan?  
}

model TreatmentPlan {  
  id        String   @id @default(uuid())  
  sessionId String   @unique  
  session   Session  @relation(fields: \[sessionId\], references: \[id\])  
    
  therapistNote   String @db.Text  
  clientSummary   String @db.Text

  clinicalGoals   Json   // See Section 10 for Schema  
  clientGoals     Json     
  interventions   Json     
  homework        String  
    
  riskScore       String // "LOW", "MEDIUM", "HIGH"  
    
  versions  PlanVersion\[\]  
  updatedAt DateTime @updatedAt  
}

model PlanVersion {  
  id            String   @id @default(uuid())  
  planId        String  
  plan          TreatmentPlan @relation(fields: \[planId\], references: \[id\])  
  createdAt     DateTime @default(now())  
  contentSnapshot Json   
  changeReason    String?  
}

## **6\. Functional Requirements & Features**

### **6.1 Feature: Smart Ingestion**

* **Handling:** Video/Audio uploads (max 25MB). Large files trigger UI error.

### **6.2 Feature: The "Safety Layer" & Ethics**

* **Trigger:** Pre-generation scan.  
* **Logic:** Keyword regex \+ AI classification.  
* **UI Result:**  
  * **High Risk:** Red Banner *"⚠️ Safety Alert Detected"*.  
  * **Standard Disclaimer:** All AI-generated views MUST include a visible footer: *"Generated by AI Assistant. This is not a substitute for clinical judgment. Please review carefully."*

### **6.3 Feature: Context-Aware Generation (Living Document)**

* **Inputs:** Transcript \+ Previous Plan \+ Therapist Preference.  
* **Logic:** "Maintain" existing long-term goals; "Update" progress; "Add" new interventions.

### **6.4 Feature: Dual-View UI**

* **Therapist:** SOAP Note style, ICD-10 codes.  
* **Client:** Warm summary, plain language goals.

### **6.5 Feature: Version Control**

* **Action:** Save changes \-\> New PlanVersion \-\> Diffs shown in History tab (Green/Red).

## **7\. Folder Structure**

/  
├── prisma/  
│   └── schema.prisma        
├── scripts/  
│   └── generate-audio.ts    
├── src/  
│   ├── app/                 
│   │   ├── api/             
│   │   │   ├── upload/      
│   │   │   ├── transcribe/\# Max Duration: 300s  
│   │   │   └── generate/  \# Max Duration: 300s  
│   │   ├── dashboard/       
│   │   ├── client-portal/   
│   │   └── page.tsx         
│   ├── components/          
│   ├── lib/                 
│   │   ├── aws-config.ts    
│   │   ├── openai.ts        
│   │   └── utils.ts  
│   ├── services/            
└── package.json

## **8\. Implementation Roadmap**

### **Phase 1: Foundation**

1. Initialize Next.js 16 \+ Tailwind v4 \+ shadcn.  
2. Set up AWS RDS & Cognito.  
3. Run Prisma Migrations.

### **Phase 2: Core AI Pipeline**

1. **Audio Script:** Generate synthetic 20-min sessions.  
2. **Backend:** Implement Transcribe & Generate APIs (with timeouts configured).  
3. **Safety:** Implement Safety Service.

### **Phase 3: The UI & Experience**

1. Therapist Dashboard & Preference Selector.  
2. Dual-View Plan Component.  
3. "Magic Button" simulation.

### **Phase 4: Bonus Features**

1. Copilot (Rewrite).  
2. Video (ffmpeg audio strip).  
3. Diff Viewer.

## **9\. API Routes Design**

| Method | Endpoint | Description |
| :---- | :---- | :---- |
| POST | /api/upload-url | Generate pre-signed S3 URL. |
| POST | /api/transcribe | Trigger Whisper. **Timeout: 300s**. |
| POST | /api/analyze | Generate Plan JSON. **Timeout: 300s**. |
| POST | /api/copilot | Rewrite text fragment. |
| GET | /api/clients/:id/plans | Fetch history. |

## **10\. Appendix: AI Output Schemas (Zod)**

The LLM must strictly adhere to this structure for the /api/analyze endpoint:

const TreatmentPlanSchema \= z.object({  
  riskScore: z.enum(\["LOW", "MEDIUM", "HIGH"\]),  
  therapistNote: z.string().describe("Professional SOAP note summary"),  
  clientSummary: z.string().describe("Warm, empathetic summary for the client"),  
    
  clinicalGoals: z.array(z.object({  
    id: z.string(),  
    description: z.string(),  
    status: z.enum(\["IN\_PROGRESS", "COMPLETED", "DEFERRED"\]),  
    targetDate: z.string().optional()  
  })),  
    
  clientGoals: z.array(z.object({  
    id: z.string(), // Must match clinicalGoals ID  
    description: z.string().describe("Simplified, empowering version of the clinical goal"),  
    emoji: z.string().describe("A relevant single emoji")  
  })),  
    
  interventions: z.array(z.string()).describe("List of clinical techniques used (e.g. CBT Thought Record)"),  
  homework: z.string().describe("Actionable tasks for next session")  
});  
