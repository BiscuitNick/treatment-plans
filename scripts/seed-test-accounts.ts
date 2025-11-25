import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminGetUserCommand,
  UsernameExistsException,
} from "@aws-sdk/client-cognito-identity-provider";
import { PrismaClient, UserRole } from "@prisma/client";
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

// Therapist/Admin accounts
const THERAPIST_ACCOUNTS: TestAccount[] = [
  {
    email: "adam@example.com",
    name: "Dr. Adam Smith",
    password: DEFAULT_PASSWORD,
    role: "CLINICIAN",
  },
  {
    email: "betty@example.com",
    name: "Dr. Betty Johnson",
    password: DEFAULT_PASSWORD,
    role: "CLINICIAN",
  },
  {
    email: "charlie@example.com",
    name: "Dr. Charlie Chen",
    password: DEFAULT_PASSWORD,
    role: "CLINICIAN",
  },
  {
    email: "diana@example.com",
    name: "Diana Admin",
    password: DEFAULT_PASSWORD,
    role: "ADMIN",
  },
];

// Patient accounts (will be linked to Patient records)
const PATIENT_ACCOUNTS: TestAccount[] = [
  {
    email: "pat@example.com",
    name: "Pat Miller",
    password: DEFAULT_PASSWORD,
    role: "PATIENT",
  },
  {
    email: "quinn@example.com",
    name: "Quinn Davis",
    password: DEFAULT_PASSWORD,
    role: "PATIENT",
  },
  {
    email: "riley@example.com",
    name: "Riley Thompson",
    password: DEFAULT_PASSWORD,
    role: "PATIENT",
  },
];

const TEST_ACCOUNTS = [...THERAPIST_ACCOUNTS, ...PATIENT_ACCOUNTS];

// Sample patients to create for clinicians (without user accounts)
const SAMPLE_PATIENTS = [
  { name: "Andy Smith", notes: "Anxiety and public speaking fears" },
  { name: "Beth Johnson", notes: "Depression and work stress" },
  { name: "Carlos Rivera", notes: "Relationship counseling" },
];

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
    // Check if user already exists
    const exists = await checkCognitoUserExists(email);
    if (exists) {
      console.log(`  ⏭️  Cognito user already exists: ${email}`);
      return true;
    }

    // Create user in Cognito
    await cognito.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "name", Value: name },
          { Name: "email_verified", Value: "true" },
        ],
        MessageAction: "SUPPRESS", // Don't send welcome email
      })
    );

    // Set permanent password (bypasses temporary password flow)
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

async function createSamplePatients(clinicianId: string) {
  for (const patientData of SAMPLE_PATIENTS) {
    try {
      // Check if patient already exists for this clinician
      const existing = await prisma.patient.findFirst({
        where: {
          name: patientData.name,
          clinicianId,
        },
      });

      if (existing) {
        console.log(`    ⏭️  Patient already exists: ${patientData.name}`);
        continue;
      }

      const patient = await prisma.patient.create({
        data: {
          name: patientData.name,
          clinicianId,
        },
      });

      // Create a sample session for the patient
      await prisma.session.create({
        data: {
          patientId: patient.id,
          transcript: `Initial intake session with ${patientData.name}. ${patientData.notes}. Patient reports symptoms for the past 3 months.`,
        },
      });

      console.log(`    ✅ Created patient: ${patientData.name}`);
    } catch (error) {
      console.error(`    ❌ Failed to create patient ${patientData.name}:`, error);
    }
  }
}

async function createPatientRecord(userId: string, userName: string, clinicianId: string) {
  try {
    // Check if patient record already exists for this user
    const existing = await prisma.patient.findUnique({
      where: { userId },
    });

    if (existing) {
      console.log(`  ⏭️  Patient record already exists for user`);
      return existing.id;
    }

    const patient = await prisma.patient.create({
      data: {
        name: userName,
        clinicianId,
        userId,
      },
    });

    // Create a sample session
    await prisma.session.create({
      data: {
        patientId: patient.id,
        transcript: `Initial intake session with ${userName}. Patient discussed general wellness goals and areas of concern.`,
      },
    });

    // Create a sample treatment plan
    await prisma.treatmentPlan.create({
      data: {
        patientId: patient.id,
        versions: {
          create: {
            content: {
              riskScore: "LOW",
              therapistNote: `${userName} presents with mild anxiety symptoms. Recommended weekly sessions focusing on coping strategies.`,
              clientSummary: "We discussed your goals for therapy and created a plan to help you feel more balanced and confident.",
              clinicalGoals: [
                { id: "1", description: "Develop 3 coping strategies for stress", status: "IN_PROGRESS" },
                { id: "2", description: "Improve sleep hygiene", status: "IN_PROGRESS" },
              ],
              clientGoals: [
                { id: "1", description: "Feel more relaxed day-to-day", emoji: "😌" },
                { id: "2", description: "Sleep better at night", emoji: "😴" },
              ],
              interventions: ["CBT", "Mindfulness"],
              homework: "Practice deep breathing for 5 minutes daily.",
            },
            version: 1,
          },
        },
      },
    });

    console.log(`  ✅ Created patient record: ${patient.id}`);
    return patient.id;
  } catch (error) {
    console.error(`  ❌ Failed to create patient record:`, error);
    return null;
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
  console.log(`  Therapist accounts: ${THERAPIST_ACCOUNTS.length}`);
  console.log(`  Patient accounts: ${PATIENT_ACCOUNTS.length}`);
  console.log("=".repeat(60));

  // First, create all therapist accounts
  let defaultClinicianId: string | null = null;

  console.log("\n👨‍⚕️ CREATING THERAPIST ACCOUNTS");
  console.log("=".repeat(60));

  for (const account of THERAPIST_ACCOUNTS) {
    console.log(`\n📧 Processing: ${account.email}`);
    console.log("-".repeat(40));

    const cognitoSuccess = await createCognitoUser(account);
    if (!cognitoSuccess) {
      console.log(`  ⚠️  Skipping database creation due to Cognito failure`);
      continue;
    }

    const userId = await createDatabaseUser(account);
    if (!userId) continue;

    // Store first clinician as default for patient assignments
    if (account.role === "CLINICIAN" && !defaultClinicianId) {
      defaultClinicianId = userId;
    }

    // Create sample patients for clinicians
    if (account.role === "CLINICIAN") {
      console.log(`  📋 Creating sample patients...`);
      await createSamplePatients(userId);
    }
  }

  // Then create patient accounts and link them to the default clinician
  console.log("\n\n👤 CREATING PATIENT ACCOUNTS");
  console.log("=".repeat(60));

  if (!defaultClinicianId) {
    console.error("❌ No clinician found to assign patients to!");
  } else {
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

      // Create patient record linked to this user
      console.log(`  📋 Creating patient record...`);
      await createPatientRecord(userId, account.name, defaultClinicianId);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Seeding Complete!");
  console.log("=".repeat(60));

  console.log("\n👨‍⚕️ THERAPIST ACCOUNTS:");
  console.log("-".repeat(60));
  for (const account of THERAPIST_ACCOUNTS) {
    console.log(`  ${account.email.padEnd(25)} ${account.role.padEnd(10)} ${account.name}`);
  }

  console.log("\n👤 PATIENT ACCOUNTS:");
  console.log("-".repeat(60));
  for (const account of PATIENT_ACCOUNTS) {
    console.log(`  ${account.email.padEnd(25)} ${account.role.padEnd(10)} ${account.name}`);
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
