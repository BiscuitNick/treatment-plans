import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { PrismaClient, UserRole, SessionStatus, PatientStatus } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// AWS Cognito configuration
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const userPoolId = process.env.COGNITO_USER_POOL_ID;

if (!accessKeyId || !secretAccessKey) {
  console.error("❌ AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set");
  process.exit(1);
}

if (!userPoolId) {
  console.error("❌ COGNITO_USER_POOL_ID must be set");
  process.exit(1);
}

const cognito = new CognitoIdentityProviderClient({
  region,
  credentials: { accessKeyId, secretAccessKey },
});

// =============================================================================
// TEST ACCOUNTS CONFIGURATION
// =============================================================================
interface TestAccount {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

const DEFAULT_PASSWORD = "Password123!";

// Clinician accounts (4 total)
const CLINICIAN_ACCOUNTS: TestAccount[] = [
  { email: "adam@example.com", name: "Dr. Adam Smith", password: DEFAULT_PASSWORD, role: "CLINICIAN" },
  { email: "betty@example.com", name: "Dr. Betty Johnson", password: DEFAULT_PASSWORD, role: "CLINICIAN" },
  { email: "charlie@example.com", name: "Dr. Charlie Chen", password: DEFAULT_PASSWORD, role: "CLINICIAN" },
  { email: "diana@example.com", name: "Dr. Diana Martinez", password: DEFAULT_PASSWORD, role: "CLINICIAN" },
];

// Patient accounts (10 total) - all with user accounts for client view testing
const PATIENT_ACCOUNTS: TestAccount[] = [
  { email: "andy@example.com", name: "Andy Smith", password: DEFAULT_PASSWORD, role: "PATIENT" },
  { email: "sarah@example.com", name: "Sarah Johnson", password: DEFAULT_PASSWORD, role: "PATIENT" },
  { email: "mike@example.com", name: "Mike Chen", password: DEFAULT_PASSWORD, role: "PATIENT" },
  { email: "emma@example.com", name: "Emma Davis", password: DEFAULT_PASSWORD, role: "PATIENT" },
  { email: "frank@example.com", name: "Frank Wilson", password: DEFAULT_PASSWORD, role: "PATIENT" },
  { email: "grace@example.com", name: "Grace Lee", password: DEFAULT_PASSWORD, role: "PATIENT" },
  { email: "henry@example.com", name: "Henry Brown", password: DEFAULT_PASSWORD, role: "PATIENT" },
  { email: "iris@example.com", name: "Iris Taylor", password: DEFAULT_PASSWORD, role: "PATIENT" },
  { email: "jack@example.com", name: "Jack Martinez", password: DEFAULT_PASSWORD, role: "PATIENT" },
  { email: "kate@example.com", name: "Kate Thompson", password: DEFAULT_PASSWORD, role: "PATIENT" },
];

const ALL_ACCOUNTS = [...CLINICIAN_ACCOUNTS, ...PATIENT_ACCOUNTS];

// =============================================================================
// PATIENT DATA WITH FULL TREATMENT PLANS
// =============================================================================
interface PatientData {
  email: string;
  clinicianEmail: string;
  age: number;
  gender: string;
  status: PatientStatus;
  treatmentPlan: {
    riskScore: "LOW" | "MEDIUM" | "HIGH";
    riskRationale: string;
    riskFlags: string[];
    therapistNote: string;
    clientSummary: string;
    primaryDiagnosis: { code: string; description: string };
    secondaryDiagnoses?: { code: string; description: string }[];
    clientDiagnosis: { summary: string; hidden: boolean };
    clinicalGoals: { id: string; description: string; status: "IN_PROGRESS" | "COMPLETED" | "DEFERRED"; targetDate?: string }[];
    clientGoals: { id: string; description: string; emoji: string }[];
    interventions: string[];
    homework: string;
  };
  sessions: { transcript: string; summary?: string; daysAgo: number; status: SessionStatus; hour: number; minute: number }[];
}

const PATIENT_DATA: PatientData[] = [
  // ===== ADAM'S PATIENTS (3) =====
  {
    email: "andy@example.com",
    clinicianEmail: "adam@example.com",
    age: 34,
    gender: "Male",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "LOW",
      riskRationale: "Patient shows good progress and strong coping skills. No safety concerns.",
      riskFlags: [],
      therapistNote: "Andy has made significant progress over 4 months. Successfully completing exposure hierarchy for public speaking anxiety. Recommend continued maintenance sessions.",
      clientSummary: "You've made amazing progress with your public speaking! We'll keep building on your success with some new challenges.",
      primaryDiagnosis: { code: "F40.10", description: "Social Anxiety Disorder" },
      clientDiagnosis: { summary: "We're working together on helping you feel more comfortable in social situations, especially at work.", hidden: false },
      clinicalGoals: [
        { id: "g1", description: "Reduce physiological anxiety symptoms during presentations", status: "COMPLETED" },
        { id: "g2", description: "Improve public speaking confidence to functional level", status: "IN_PROGRESS", targetDate: "3 months" },
        { id: "g3", description: "Complete exposure hierarchy from small to large audiences", status: "IN_PROGRESS" },
      ],
      clientGoals: [
        { id: "g1", description: "Feel calmer when speaking in meetings", emoji: "😌" },
        { id: "g2", description: "Present to my team without panic", emoji: "🎤" },
        { id: "g3", description: "Sleep better before presentations", emoji: "😴" },
      ],
      interventions: ["CBT", "Exposure Therapy", "Relaxation Training", "Cognitive Restructuring"],
      homework: "Continue daily breathing exercises. Practice visualization for upcoming client meeting.",
    },
    sessions: [
      { transcript: "Initial intake session. Andy presents with significant social anxiety, particularly around public speaking. Reports avoiding work presentations for the past year. Sleep disturbances noted.", summary: "Initial intake session. Andy presents with s...", daysAgo: 120, status: "PROCESSED", hour: 10, minute: 0 },
      { transcript: "Follow-up session. Andy reports attempting one small group presentation at work. Experienced moderate anxiety but completed it. Discussed relaxation techniques.", summary: "Follow-up session. Andy reports attempting o...", daysAgo: 90, status: "PROCESSED", hour: 10, minute: 0 },
      { transcript: "Andy successfully delivered a 10-minute presentation to his department. Reported manageable anxiety levels. Sleep improved significantly.", summary: "Andy successfully delivered a 10-minute p...", daysAgo: 30, status: "PROCESSED", hour: 10, minute: 0 },
      { transcript: "Recent session. Andy feels prepared for upcoming client meeting. Reviewed coping strategies. Minor anticipatory anxiety but within functional range.", summary: "Recent session. Andy feels prepared for u...", daysAgo: 3, status: "PENDING", hour: 10, minute: 0 },
    ],
  },
  {
    email: "sarah@example.com",
    clinicianEmail: "adam@example.com",
    age: 28,
    gender: "Female",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "MEDIUM",
      riskRationale: "Patient experiencing ongoing sleep difficulties and work stress. Monitoring for depression symptoms.",
      riskFlags: ["Sleep disturbance", "Work-related stress"],
      therapistNote: "Sarah presents with GAD and mild depressive features. Initial session focused on psychoeducation and introducing coping strategies. Good insight and motivation.",
      clientSummary: "We talked about how worry works and learned your first relaxation technique. You're doing great taking this step!",
      primaryDiagnosis: { code: "F41.1", description: "Generalized Anxiety Disorder" },
      secondaryDiagnoses: [{ code: "F32.0", description: "Mild Depressive Episode" }],
      clientDiagnosis: { summary: "We're working on helping you manage worry and feel more in control of your thoughts.", hidden: false },
      clinicalGoals: [
        { id: "g1", description: "Reduce frequency and intensity of worry episodes", status: "IN_PROGRESS" },
        { id: "g2", description: "Improve sleep quality and duration to 7+ hours", status: "IN_PROGRESS" },
        { id: "g3", description: "Develop effective stress management skills", status: "IN_PROGRESS" },
      ],
      clientGoals: [
        { id: "g1", description: "Worry less about work", emoji: "💼" },
        { id: "g2", description: "Sleep through the night", emoji: "🌙" },
        { id: "g3", description: "Feel more in control", emoji: "💪" },
      ],
      interventions: ["CBT", "Worry Time Technique", "Sleep Hygiene Education", "Relaxation Training"],
      homework: "Practice 'worry time' - schedule 15 minutes daily for worry, postpone worries outside this time.",
    },
    sessions: [
      { transcript: "Initial intake. Sarah reports chronic worry affecting her work and sleep. Difficulty concentrating. Started having panic-like symptoms in the past month.", summary: "Initial intake. Sarah reports chronic worry ...", daysAgo: 14, status: "PROCESSED", hour: 11, minute: 0 },
      { transcript: "Follow-up session. Sarah tried the worry time technique - found it helpful. Still having some sleep issues. Discussed sleep hygiene.", summary: "Follow-up session. Sarah tried the worry ti...", daysAgo: 1, status: "PENDING", hour: 11, minute: 0 },
    ],
  },
  {
    email: "mike@example.com",
    clinicianEmail: "adam@example.com",
    age: 41,
    gender: "Male",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "MEDIUM",
      riskRationale: "Recent job loss creating financial stress. Good family support mitigates risk.",
      riskFlags: ["Recent major life change", "Financial stress"],
      therapistNote: "Mike presents with adjustment disorder following job loss. First time in therapy. Motivated and has good family support system.",
      clientSummary: "It takes courage to reach out during a tough time. We're going to work through this transition together.",
      primaryDiagnosis: { code: "F43.21", description: "Adjustment Disorder with Anxious Mood" },
      clientDiagnosis: { summary: "We're working on helping you navigate this career transition and manage the stress that comes with change.", hidden: false },
      clinicalGoals: [
        { id: "g1", description: "Process emotions related to job loss", status: "IN_PROGRESS" },
        { id: "g2", description: "Develop structured daily routine", status: "IN_PROGRESS" },
        { id: "g3", description: "Build resilience and coping strategies for job search", status: "IN_PROGRESS" },
      ],
      clientGoals: [
        { id: "g1", description: "Feel hopeful about the future", emoji: "🌟" },
        { id: "g2", description: "Stay active and motivated", emoji: "🏃" },
        { id: "g3", description: "Handle rejection without spiraling", emoji: "💪" },
      ],
      interventions: ["Supportive Therapy", "Behavioral Activation", "Cognitive Restructuring"],
      homework: "Create a daily schedule including job search activities, exercise, and one enjoyable activity.",
    },
    sessions: [
      { transcript: "Initial intake. Mike was laid off from finance position 3 weeks ago. Feeling anxious about future. Good insight into his emotional state.", summary: "Initial intake. Mike was laid off from financ...", daysAgo: 7, status: "PROCESSED", hour: 14, minute: 0 },
    ],
  },

  // ===== BETTY'S PATIENTS (3) =====
  {
    email: "emma@example.com",
    clinicianEmail: "betty@example.com",
    age: 35,
    gender: "Female",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "HIGH",
      riskRationale: "Patient reports passive suicidal ideation without plan or intent. Close monitoring required.",
      riskFlags: ["Passive suicidal ideation", "Social isolation", "Significant functional impairment"],
      therapistNote: "Emma presents with moderate-severe depression. Reports passive SI without plan. Safety plan established. Weekly sessions recommended with crisis resources provided.",
      clientSummary: "I'm glad you're here and being honest about how hard things have been. We have a safety plan, and we're going to work through this together.",
      primaryDiagnosis: { code: "F32.1", description: "Major Depressive Disorder, Single Episode, Moderate" },
      clientDiagnosis: { summary: "We're working on helping you feel more like yourself again and find moments of hope.", hidden: true }, // Hidden - new diagnosis
      clinicalGoals: [
        { id: "g1", description: "Reduce depressive symptoms to mild range on PHQ-9", status: "IN_PROGRESS" },
        { id: "g2", description: "Eliminate suicidal ideation", status: "IN_PROGRESS" },
        { id: "g3", description: "Increase social engagement to 2+ activities per week", status: "IN_PROGRESS" },
      ],
      clientGoals: [
        { id: "g1", description: "Have more good days than bad", emoji: "☀️" },
        { id: "g2", description: "Reconnect with friends", emoji: "👥" },
        { id: "g3", description: "Find things to look forward to", emoji: "🌈" },
      ],
      interventions: ["CBT for Depression", "Behavioral Activation", "Safety Planning", "Crisis Resources"],
      homework: "Complete one small activity from your 'things I used to enjoy' list each day. Use safety plan if needed.",
    },
    sessions: [
      { transcript: "Initial intake. Emma reports feeling hopeless for past 2 months. Passive SI present - 'wish I wouldn't wake up' - no plan or intent. Safety plan created.", summary: "Initial intake. Emma reports feeling hopeless...", daysAgo: 5, status: "PROCESSED", hour: 9, minute: 0 },
    ],
  },
  {
    email: "frank@example.com",
    clinicianEmail: "betty@example.com",
    age: 29,
    gender: "Male",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "MEDIUM",
      riskRationale: "Panic attacks occurring 2-3 times weekly. Some avoidance behaviors developing.",
      riskFlags: ["Frequent panic attacks", "Emerging agoraphobia"],
      therapistNote: "Frank presents with panic disorder. Experiencing 2-3 attacks weekly, typically in crowded places. Some avoidance developing. Good candidate for interoceptive exposure.",
      clientSummary: "Panic attacks are scary but very treatable. We're going to help your brain learn that these sensations aren't dangerous.",
      primaryDiagnosis: { code: "F41.0", description: "Panic Disorder" },
      clientDiagnosis: { summary: "We're working on helping your body feel safe again and reducing those scary panic moments.", hidden: false },
      clinicalGoals: [
        { id: "g1", description: "Reduce panic attack frequency to less than 1 per week", status: "IN_PROGRESS" },
        { id: "g2", description: "Eliminate avoidance of crowded places", status: "IN_PROGRESS" },
        { id: "g3", description: "Master interoceptive exposure techniques", status: "IN_PROGRESS" },
      ],
      clientGoals: [
        { id: "g1", description: "Go to the grocery store without fear", emoji: "🛒" },
        { id: "g2", description: "Feel calm in my body", emoji: "😌" },
        { id: "g3", description: "Stop fearing the next panic attack", emoji: "🧘" },
      ],
      interventions: ["CBT for Panic", "Interoceptive Exposure", "Breathing Retraining", "Psychoeducation"],
      homework: "Practice breathing retraining 3x daily. Complete panic diary after each episode.",
    },
    sessions: [
      { transcript: "Initial assessment. Frank experienced first panic attack 6 months ago on subway. Now avoiding public transit and crowded stores. Reports fear of having heart attack during episodes.", summary: "Initial assessment. Frank experienced first p...", daysAgo: 21, status: "PROCESSED", hour: 10, minute: 30 },
      { transcript: "Second session. Psychoeducation about panic cycle. Frank receptive to treatment model. Introduced breathing retraining.", summary: "Second session. Psychoeducation about panic c...", daysAgo: 14, status: "PROCESSED", hour: 10, minute: 30 },
      { transcript: "Third session. Frank practicing breathing daily. One panic attack this week, less intense. Ready to start interoceptive exposure next session.", summary: "Third session. Frank practicing breathing dai...", daysAgo: 7, status: "PROCESSED", hour: 10, minute: 30 },
    ],
  },
  {
    email: "grace@example.com",
    clinicianEmail: "betty@example.com",
    age: 24,
    gender: "Female",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "MEDIUM",
      riskRationale: "OCD symptoms causing significant distress and time impairment (3+ hours daily).",
      riskFlags: ["Time-consuming rituals", "Academic impairment"],
      therapistNote: "Grace presents with OCD, primarily contamination fears and cleaning rituals. Spending 3+ hours daily on rituals. Graduate student, academic performance suffering.",
      clientSummary: "OCD is like a bully that lies to you. We're going to learn to stand up to it together.",
      primaryDiagnosis: { code: "F42.2", description: "Obsessive-Compulsive Disorder, Mixed" },
      clientDiagnosis: { summary: "We're working on helping you spend less time on worries and rituals so you can focus on what matters to you.", hidden: false },
      clinicalGoals: [
        { id: "g1", description: "Reduce ritual time to under 1 hour daily", status: "IN_PROGRESS" },
        { id: "g2", description: "Complete ERP hierarchy for contamination fears", status: "IN_PROGRESS" },
        { id: "g3", description: "Return to normal academic functioning", status: "IN_PROGRESS" },
      ],
      clientGoals: [
        { id: "g1", description: "Touch things without washing immediately", emoji: "🖐️" },
        { id: "g2", description: "Finish my thesis on time", emoji: "📚" },
        { id: "g3", description: "Feel free, not controlled by worry", emoji: "🦋" },
      ],
      interventions: ["ERP", "Cognitive Therapy for OCD", "Response Prevention"],
      homework: "Complete 2 exposures from hierarchy daily. Delay handwashing by 5 minutes after triggers.",
    },
    sessions: [
      { transcript: "Initial intake. Grace reports contamination OCD onset at age 19. Currently washing hands 30+ times daily. Avoiding touching doorknobs, public surfaces.", summary: "Initial intake. Grace reports contamination O...", daysAgo: 28, status: "PROCESSED", hour: 13, minute: 0 },
      { transcript: "Session 2. Created ERP hierarchy. Grace motivated but anxious about exposures. Started with lowest item - touching her own desk without washing for 10 minutes.", summary: "Session 2. Created ERP hierarchy. Grace motiv...", daysAgo: 21, status: "PROCESSED", hour: 13, minute: 0 },
    ],
  },

  // ===== CHARLIE'S PATIENTS (3) =====
  {
    email: "henry@example.com",
    clinicianEmail: "charlie@example.com",
    age: 52,
    gender: "Male",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "MEDIUM",
      riskRationale: "Recurrent depression with current moderate episode. History of good treatment response.",
      riskFlags: ["Recurrent episodes", "Family history of depression"],
      therapistNote: "Henry presents with recurrent MDD, currently in moderate episode. Third episode in 10 years. Previously responded well to CBT. Reports increased work stress as trigger.",
      clientSummary: "You've gotten through this before, and you have the tools. We're going to dust them off and add some new ones.",
      primaryDiagnosis: { code: "F33.1", description: "Major Depressive Disorder, Recurrent, Moderate" },
      clientDiagnosis: { summary: "We're working on getting you back to feeling like yourself and building skills to stay well.", hidden: false },
      clinicalGoals: [
        { id: "g1", description: "Reduce depressive symptoms to remission", status: "IN_PROGRESS" },
        { id: "g2", description: "Identify and modify negative thought patterns", status: "IN_PROGRESS" },
        { id: "g3", description: "Develop relapse prevention plan", status: "DEFERRED", targetDate: "After acute phase" },
      ],
      clientGoals: [
        { id: "g1", description: "Enjoy weekends again", emoji: "🌅" },
        { id: "g2", description: "Have energy for my kids", emoji: "👨‍👧‍👦" },
        { id: "g3", description: "Feel confident at work", emoji: "💼" },
      ],
      interventions: ["CBT for Depression", "Behavioral Activation", "Cognitive Restructuring"],
      homework: "Schedule 3 pleasurable activities this week. Complete thought record when mood drops.",
    },
    sessions: [
      { transcript: "Intake session. Henry reports depressive episode beginning 2 months ago after major project failure at work. Low mood, anhedonia, fatigue. Previously in therapy 5 years ago with good outcome.", summary: "Intake session. Henry reports depressive epis...", daysAgo: 14, status: "PROCESSED", hour: 15, minute: 0 },
      { transcript: "Session 2. Reviewed thought records. Henry identifying patterns of self-criticism. Behavioral activation plan created.", summary: "Session 2. Reviewed thought records. Henry id...", daysAgo: 7, status: "PROCESSED", hour: 15, minute: 0 },
    ],
  },
  {
    email: "iris@example.com",
    clinicianEmail: "charlie@example.com",
    age: 31,
    gender: "Female",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "LOW",
      riskRationale: "Mild GAD with good insight and strong social support.",
      riskFlags: [],
      therapistNote: "Iris presents with mild GAD, primarily health-related worries. Seeking therapy proactively after noticing increased worry. Excellent insight and motivation.",
      clientSummary: "It's great that you noticed these patterns early. We're going to nip this worry habit in the bud!",
      primaryDiagnosis: { code: "F41.1", description: "Generalized Anxiety Disorder" },
      clientDiagnosis: { summary: "We're working on helping you worry less and trust yourself more.", hidden: false },
      clinicalGoals: [
        { id: "g1", description: "Reduce health-related worry to adaptive levels", status: "IN_PROGRESS" },
        { id: "g2", description: "Decrease reassurance-seeking behaviors", status: "IN_PROGRESS" },
        { id: "g3", description: "Build tolerance for uncertainty", status: "IN_PROGRESS" },
      ],
      clientGoals: [
        { id: "g1", description: "Stop Googling symptoms", emoji: "🔍" },
        { id: "g2", description: "Trust my body more", emoji: "💚" },
        { id: "g3", description: "Enjoy life without 'what ifs'", emoji: "🎉" },
      ],
      interventions: ["CBT for GAD", "Uncertainty Tolerance Training", "Mindfulness"],
      homework: "Practice sitting with uncertainty - when urge to Google arises, wait 30 minutes and journal instead.",
    },
    sessions: [
      { transcript: "Initial session. Iris reports health anxiety increasing over past 6 months. Googling symptoms daily, seeking reassurance from partner. No actual health issues - recent full checkup normal.", summary: "Initial session. Iris reports health anxiety ...", daysAgo: 10, status: "PROCESSED", hour: 16, minute: 15 },
    ],
  },
  {
    email: "jack@example.com",
    clinicianEmail: "charlie@example.com",
    age: 26,
    gender: "Male",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "LOW",
      riskRationale: "Social anxiety limited to specific situations. Good overall functioning.",
      riskFlags: [],
      therapistNote: "Jack presents with social anxiety focused on dating and romantic situations. Generally functions well at work and with friends. Seeking help after avoiding dating for 2 years.",
      clientSummary: "Dating anxiety is really common and very treatable. We're going to help you put yourself out there with confidence.",
      primaryDiagnosis: { code: "F40.10", description: "Social Anxiety Disorder" },
      clientDiagnosis: { summary: "We're working on helping you feel more confident in dating and romantic situations.", hidden: false },
      clinicalGoals: [
        { id: "g1", description: "Reduce anxiety in dating situations to manageable levels", status: "IN_PROGRESS" },
        { id: "g2", description: "Challenge negative beliefs about rejection", status: "IN_PROGRESS" },
        { id: "g3", description: "Successfully complete dating exposure hierarchy", status: "IN_PROGRESS" },
      ],
      clientGoals: [
        { id: "g1", description: "Go on a first date", emoji: "☕" },
        { id: "g2", description: "Handle rejection without devastation", emoji: "💪" },
        { id: "g3", description: "Be myself around someone I like", emoji: "😊" },
      ],
      interventions: ["CBT for Social Anxiety", "Exposure Therapy", "Social Skills Training"],
      homework: "Start a conversation with one new person this week (low stakes - barista, coworker, etc.).",
    },
    sessions: [
      { transcript: "Intake session. Jack reports dating anxiety since college. Last date was 2 years ago - ended poorly and he's avoided since. Works in IT, comfortable with coworkers but freezes in romantic contexts.", summary: "Intake session. Jack reports dating anxiety s...", daysAgo: 5, status: "PROCESSED", hour: 17, minute: 30 },
    ],
  },

  // ===== DIANA'S PATIENT (1) =====
  {
    email: "kate@example.com",
    clinicianEmail: "diana@example.com",
    age: 45,
    gender: "Female",
    status: "ACTIVE",
    treatmentPlan: {
      riskScore: "LOW",
      riskRationale: "Mild depression with clear precipitant (empty nest). Good prognosis.",
      riskFlags: [],
      therapistNote: "Kate presents with mild depression following last child leaving for college. Reports feeling purposeless and sad. Strong marriage, good support system. Excellent candidate for brief therapy.",
      clientSummary: "This is a big life transition, and it makes sense that you're feeling lost. Let's find your new chapter together.",
      primaryDiagnosis: { code: "F32.0", description: "Major Depressive Disorder, Single Episode, Mild" },
      clientDiagnosis: { summary: "We're working on helping you navigate this life transition and rediscover your sense of purpose.", hidden: false },
      clinicalGoals: [
        { id: "g1", description: "Process grief related to empty nest transition", status: "IN_PROGRESS" },
        { id: "g2", description: "Develop new meaningful activities and identity", status: "IN_PROGRESS" },
        { id: "g3", description: "Strengthen relationship with spouse", status: "IN_PROGRESS" },
      ],
      clientGoals: [
        { id: "g1", description: "Find a new hobby or passion", emoji: "🎨" },
        { id: "g2", description: "Enjoy time with my husband again", emoji: "❤️" },
        { id: "g3", description: "Feel excited about my future", emoji: "✨" },
      ],
      interventions: ["Supportive Therapy", "Behavioral Activation", "Values Clarification"],
      homework: "Make a list of things you always wanted to try but 'didn't have time for' when kids were home.",
    },
    sessions: [
      { transcript: "Initial session. Kate's youngest left for college 2 months ago. Tearful but insightful. Reports feeling like she's 'lost her job' as a mother. Motivated for therapy.", summary: "Initial session. Kate's youngest left for col...", daysAgo: 7, status: "PROCESSED", hour: 11, minute: 45 },
    ],
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function daysAgoWithTime(days: number, hour: number = 9, minute: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function daysAgo(days: number): Date {
  return daysAgoWithTime(days, 9, 0);
}

// =============================================================================
// COGNITO FUNCTIONS
// =============================================================================

async function checkCognitoUserExists(email: string): Promise<boolean> {
  try {
    await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: email,
      })
    );
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "UserNotFoundException") {
      return false;
    }
    throw error;
  }
}

async function createCognitoUser(account: TestAccount): Promise<boolean> {
  const { email, name, password } = account;

  try {
    const exists = await checkCognitoUserExists(email);
    if (exists) {
      console.log(`  ⏭️  Cognito user already exists: ${email}`);
      return true;
    }

    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "name", Value: name },
          { Name: "email_verified", Value: "true" },
        ],
        MessageAction: "SUPPRESS",
      })
    );

    await cognito.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: password,
        Permanent: true,
      })
    );

    console.log(`  ✅ Created Cognito user: ${email}`);
    return true;
  } catch (error) {
    if (error instanceof UsernameExistsException) {
      console.log(`  ⏭️  Cognito user already exists: ${email}`);
      return true;
    }
    console.error(`  ❌ Failed to create Cognito user ${email}:`, error);
    return false;
  }
}

// =============================================================================
// DATABASE FUNCTIONS
// =============================================================================

async function createDatabaseUser(account: TestAccount): Promise<string | null> {
  const { email, name, role } = account;

  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, role },
      create: { email, name, role },
    });

    console.log(`  ✅ Database user ready: ${email} (${user.id})`);
    return user.id;
  } catch (error) {
    console.error(`  ❌ Failed to create database user ${email}:`, error);
    return null;
  }
}

async function createPatientWithPlan(
  patientData: PatientData,
  patientUserId: string,
  clinicianId: string
): Promise<void> {
  const patientAccount = PATIENT_ACCOUNTS.find(p => p.email === patientData.email);
  if (!patientAccount) return;

  try {
    // Create patient record
    const patient = await prisma.patient.upsert({
      where: { userId: patientUserId },
      update: {
        name: patientAccount.name,
        age: patientData.age,
        gender: patientData.gender,
        status: patientData.status,
        clinicianId,
      },
      create: {
        name: patientAccount.name,
        age: patientData.age,
        gender: patientData.gender,
        status: patientData.status,
        clinicianId,
        userId: patientUserId,
      },
    });

    console.log(`    ✅ Patient record: ${patient.name}`);

    // Create sessions
    for (const sessionData of patientData.sessions) {
      const sessionDateTime = daysAgoWithTime(sessionData.daysAgo, sessionData.hour, sessionData.minute);
      await prisma.session.create({
        data: {
          patientId: patient.id,
          clinicianId,
          transcript: sessionData.transcript,
          summary: sessionData.summary,
          status: sessionData.status,
          sessionDate: sessionDateTime,
          createdAt: sessionDateTime,
        },
      });
    }
    console.log(`    ✅ Created ${patientData.sessions.length} sessions`);

    // Create treatment plan with full data
    // Set createdAt to oldest session date, and calculate nextReviewDue
    const plan = patientData.treatmentPlan;
    const oldestSessionDaysAgo = Math.max(...patientData.sessions.map(s => s.daysAgo));
    const planCreatedAt = daysAgo(oldestSessionDaysAgo);

    // Calculate next review due (90 days from creation, or already overdue)
    const nextReviewDueDate = new Date(planCreatedAt);
    nextReviewDueDate.setDate(nextReviewDueDate.getDate() + 90);

    await prisma.treatmentPlan.upsert({
      where: { patientId: patient.id },
      update: {
        currentContent: plan,
        createdAt: planCreatedAt,
        nextReviewDue: nextReviewDueDate,
      },
      create: {
        patientId: patient.id,
        currentContent: plan,
        createdAt: planCreatedAt,
        nextReviewDue: nextReviewDueDate,
        versions: {
          create: {
            content: plan,
            version: 1,
            changeType: "INITIAL",
            changeSummary: "Initial treatment plan created",
            createdAt: planCreatedAt,
          },
        },
      },
    });
    console.log(`    ✅ Treatment plan with diagnosis: ${plan.primaryDiagnosis.code} (created ${oldestSessionDaysAgo} days ago)`);
  } catch (error) {
    console.error(`    ❌ Failed to create patient data:`, error);
  }
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("🚀 Starting Test Account Seeding...\n");
  console.log("=".repeat(60));
  console.log("Configuration:");
  console.log(`  AWS Region: ${region}`);
  console.log(`  User Pool ID: ${userPoolId}`);
  console.log(`  Clinician accounts: ${CLINICIAN_ACCOUNTS.length}`);
  console.log(`  Patient accounts: ${PATIENT_ACCOUNTS.length}`);
  console.log("=".repeat(60));

  // Store clinician IDs for patient assignment
  const clinicianMap: Record<string, string> = {};

  // ===== CREATE CLINICIANS =====
  console.log("\n👨‍⚕️ CREATING CLINICIAN ACCOUNTS");
  console.log("=".repeat(60));

  for (const account of CLINICIAN_ACCOUNTS) {
    console.log(`\n📧 Processing: ${account.email}`);
    console.log("-".repeat(40));

    const cognitoSuccess = await createCognitoUser(account);
    if (!cognitoSuccess) {
      console.log(`  ⚠️  Skipping database creation due to Cognito failure`);
      continue;
    }

    const userId = await createDatabaseUser(account);
    if (userId) {
      clinicianMap[account.email] = userId;
    }
  }

  // ===== CREATE PATIENTS =====
  console.log("\n\n👤 CREATING PATIENT ACCOUNTS");
  console.log("=".repeat(60));

  for (const account of PATIENT_ACCOUNTS) {
    console.log(`\n📧 Processing: ${account.email}`);
    console.log("-".repeat(40));

    const cognitoSuccess = await createCognitoUser(account);
    if (!cognitoSuccess) {
      console.log(`  ⚠️  Skipping database creation due to Cognito failure`);
      continue;
    }

    const userId = await createDatabaseUser(account);
    if (!userId) continue;

    // Find patient data and clinician
    const patientData = PATIENT_DATA.find(p => p.email === account.email);
    if (!patientData) {
      console.log(`  ⚠️  No patient data found for ${account.email}`);
      continue;
    }

    const clinicianId = clinicianMap[patientData.clinicianEmail];
    if (!clinicianId) {
      console.log(`  ⚠️  Clinician not found: ${patientData.clinicianEmail}`);
      continue;
    }

    console.log(`  📋 Creating patient record and treatment plan...`);
    await createPatientWithPlan(patientData, userId, clinicianId);
  }

  // ===== SUMMARY =====
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Seeding Complete!");
  console.log("=".repeat(60));

  console.log("\n👨‍⚕️ CLINICIAN ACCOUNTS:");
  console.log("-".repeat(60));
  for (const account of CLINICIAN_ACCOUNTS) {
    console.log(`  ${account.email.padEnd(25)} ${account.name}`);
  }

  console.log("\n👤 PATIENT ACCOUNTS:");
  console.log("-".repeat(60));
  for (const account of PATIENT_ACCOUNTS) {
    const data = PATIENT_DATA.find(p => p.email === account.email);
    const diagnosis = data?.treatmentPlan.primaryDiagnosis.code || "N/A";
    console.log(`  ${account.email.padEnd(25)} ${account.name.padEnd(20)} ${diagnosis}`);
  }

  console.log("\n🔑 Password for all accounts: " + DEFAULT_PASSWORD);
  console.log("=".repeat(60));
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Fatal error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
