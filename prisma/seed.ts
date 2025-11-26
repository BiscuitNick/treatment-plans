import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Helper to create a date X days ago
 */
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

async function main() {
  console.log("Seeding database...");

  // 1. Create the Clinician
  const clinician = await prisma.user.upsert({
    where: { email: "adam@example.com" },
    update: {},
    create: {
      email: "adam@example.com",
      name: "Dr. Adam Smith",
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

  // 3. Create multiple Sessions spanning 4 months of treatment history
  const sessionData = [
    {
      daysAgo: 120,
      transcript: "Initial intake session. Patient (Andy) presents with significant social anxiety, particularly around public speaking. Reports avoiding work presentations for the past year. Sleep disturbances noted.",
      audioUrl: "https://example.com/audio/andy-session-1.mp3",
    },
    {
      daysAgo: 90,
      transcript: "Follow-up session. Andy reports attempting one small group presentation at work. Experienced moderate anxiety but completed it. Discussed relaxation techniques and cognitive restructuring.",
      audioUrl: "https://example.com/audio/andy-session-2.mp3",
    },
    {
      daysAgo: 60,
      transcript: "Progress check. Patient showing improvement in workplace interactions. Able to speak up in team meetings without significant distress. Still avoidant of larger audience situations.",
      audioUrl: "https://example.com/audio/andy-session-3.mp3",
    },
    {
      daysAgo: 30,
      transcript: "Andy successfully delivered a 10-minute presentation to his department. Reported manageable anxiety levels. Practicing deep breathing exercises daily. Sleep improved significantly.",
      audioUrl: "https://example.com/audio/andy-session-4.mp3",
    },
    {
      daysAgo: 14,
      transcript: "Continued progress. Patient volunteered to lead a client meeting next month. Discussed preparation strategies and exposure hierarchy. Confidence increasing.",
      audioUrl: "https://example.com/audio/andy-session-5.mp3",
    },
    {
      daysAgo: 7,
      transcript: "Pre-event session. Andy feels prepared for upcoming client meeting. Reviewed coping strategies. Minor anticipatory anxiety but within functional range. Treatment goals on track.",
      audioUrl: "https://example.com/audio/andy-session-6.mp3",
    },
    {
      daysAgo: 0,
      transcript: "Debrief session. Client meeting went well! Andy reported feeling in control throughout. Mild anxiety but managed with breathing techniques. Celebrating this milestone.",
      audioUrl: "https://example.com/audio/andy-session-7.mp3",
    },
  ];

  console.log("Creating sessions with varied dates...");
  for (const data of sessionData) {
    const session = await prisma.session.create({
      data: {
        patientId: patient.id,
        transcript: data.transcript,
        audioUrl: data.audioUrl,
        createdAt: daysAgo(data.daysAgo),
      },
    });
    console.log(`  Created Session: ${session.id} (${data.daysAgo} days ago)`);
  }

  console.log(`Created ${sessionData.length} Sessions for treatment history`);

  // 4. Create a TreatmentPlan with a version - backdated to when treatment started
  const treatmentPlan = await prisma.treatmentPlan.upsert({
    where: { patientId: patient.id },
    update: {},
    create: {
      patientId: patient.id,
      createdAt: daysAgo(120), // Treatment started 120 days ago
      versions: {
        create: {
          content: {
            riskScore: "MEDIUM",
            therapistNote: "Patient shows signs of social anxiety disorder. Recommended CBT with gradual exposure therapy. Focus on workplace-related social situations.",
            clientSummary: "We discussed your fear of public speaking and created a plan to help you feel more confident in work presentations.",
            clinicalGoals: [
              { id: "1", description: "Reduce physiological anxiety symptoms (heart rate, sweating) during presentations", status: "IN_PROGRESS" },
              { id: "2", description: "Improve public speaking confidence as measured by self-report", status: "IN_PROGRESS" },
              { id: "3", description: "Successfully complete exposure hierarchy from small to large audiences", status: "IN_PROGRESS" }
            ],
            clientGoals: [
              { id: "1", description: "Feel calmer when speaking in meetings", emoji: "😌" },
              { id: "2", description: "Present to my team without panic", emoji: "🎤" },
              { id: "3", description: "Sleep better before presentations", emoji: "😴" }
            ],
            interventions: ["CBT", "Exposure Therapy", "Relaxation Training", "Cognitive Restructuring"],
            homework: "Practice deep breathing exercises daily. Start exposure hierarchy with small group conversations."
          },
          version: 1,
          createdAt: daysAgo(120),
        },
      },
    },
  });

  console.log(`Created TreatmentPlan: ${treatmentPlan.id} (created 120 days ago)`);
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