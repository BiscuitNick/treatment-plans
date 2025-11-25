import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Create the Clinician
  const clinician = await prisma.user.upsert({
    where: { email: "sarah@tavahealth.com" },
    update: {},
    create: {
      email: "sarah@tavahealth.com",
      name: "Dr. Sarah Jenkins",
      role: UserRole.CLINICIAN,
    },
  });

  console.log(`Created Clinician: ${clinician.name} (${clinician.id})`);

  // 2. Create a Patient
  const patient = await prisma.patient.upsert({
    where: { id: "seed-patient-andy" },
    update: {},
    create: {
      id: "seed-patient-andy",
      name: "Andy Smith",
      clinicianId: clinician.id,
    },
  });

  console.log(`Created Patient: ${patient.name} (${patient.id})`);

  // 3. Create a Session for the patient
  const session = await prisma.session.create({
    data: {
      patientId: patient.id,
      transcript: "Patient (Andy) expresses significant anxiety regarding upcoming public speaking event. Symptoms include rapid heartbeat and sweating.",
      audioUrl: "https://example.com/audio/andy-session-1.mp3",
    },
  });

  console.log(`Created Session: ${session.id}`);

  // 4. Create a TreatmentPlan with a version
  const treatmentPlan = await prisma.treatmentPlan.upsert({
    where: { patientId: patient.id },
    update: {},
    create: {
      patientId: patient.id,
      versions: {
        create: {
          content: {
            riskScore: "MEDIUM",
            therapistNote: "Patient shows signs of social anxiety disorder. Recommended CBT.",
            clientSummary: "We discussed your fear of public speaking.",
            clinicalGoals: [
              { id: "1", description: "Reduce physiological symptoms", status: "IN_PROGRESS" },
              { id: "2", description: "Improve public speaking confidence", status: "IN_PROGRESS" }
            ],
            clientGoals: [
              { id: "1", description: "Feel calmer when speaking", emoji: "😌" }
            ],
            interventions: ["CBT", "Exposure Therapy"],
            homework: "Practice speech in front of mirror."
          },
          version: 1,
        },
      },
    },
  });

  console.log(`Created TreatmentPlan: ${treatmentPlan.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });