import { PrismaClient, UserRole, SessionStatus, PatientStatus } from "@prisma/client";

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

  // 2. Create Patients with full details
  const patientAndy = await prisma.patient.upsert({
    where: { id: "seed-patient-andy" },
    update: {},
    create: {
      id: "seed-patient-andy",
      name: "Andy Smith",
      age: 34,
      gender: "Male",
      diagnosis: "Social Anxiety Disorder (SAD), particularly related to public speaking and workplace interactions",
      notes: "Software engineer at tech company. Reports anxiety started after a failed presentation 2 years ago. Motivated for treatment.",
      status: PatientStatus.ACTIVE,
      clinicianId: clinician.id,
    },
  });
  console.log(`Created Patient: ${patientAndy.name} (${patientAndy.id})`);

  const patientSarah = await prisma.patient.upsert({
    where: { id: "seed-patient-sarah" },
    update: {},
    create: {
      id: "seed-patient-sarah",
      name: "Sarah Johnson",
      age: 28,
      gender: "Female",
      diagnosis: "Generalized Anxiety Disorder (GAD) with mild depressive features",
      notes: "Marketing manager. Reports chronic worry about work performance and relationships. Sleep difficulties.",
      status: PatientStatus.ACTIVE,
      clinicianId: clinician.id,
    },
  });
  console.log(`Created Patient: ${patientSarah.name} (${patientSarah.id})`);

  const patientMike = await prisma.patient.upsert({
    where: { id: "seed-patient-mike" },
    update: {},
    create: {
      id: "seed-patient-mike",
      name: "Mike Chen",
      age: 41,
      gender: "Male",
      diagnosis: "Adjustment Disorder with Anxiety following job loss",
      notes: "Recently laid off from finance position. First time in therapy. Good family support.",
      status: PatientStatus.ACTIVE,
      clinicianId: clinician.id,
    },
  });
  console.log(`Created Patient: ${patientMike.name} (${patientMike.id})`);

  // 3. Create Sessions for Andy (PROCESSED - has treatment plan updates)
  console.log("\nCreating PROCESSED sessions for Andy...");
  const andySessionData = [
    {
      daysAgo: 120,
      transcript: "Initial intake session. Patient (Andy) presents with significant social anxiety, particularly around public speaking. Reports avoiding work presentations for the past year. Sleep disturbances noted.",
      audioUrl: "https://example.com/audio/andy-session-1.mp3",
      status: SessionStatus.PROCESSED,
    },
    {
      daysAgo: 90,
      transcript: "Follow-up session. Andy reports attempting one small group presentation at work. Experienced moderate anxiety but completed it. Discussed relaxation techniques and cognitive restructuring.",
      audioUrl: "https://example.com/audio/andy-session-2.mp3",
      status: SessionStatus.PROCESSED,
    },
    {
      daysAgo: 60,
      transcript: "Progress check. Patient showing improvement in workplace interactions. Able to speak up in team meetings without significant distress. Still avoidant of larger audience situations.",
      audioUrl: "https://example.com/audio/andy-session-3.mp3",
      status: SessionStatus.PROCESSED,
    },
    {
      daysAgo: 30,
      transcript: "Andy successfully delivered a 10-minute presentation to his department. Reported manageable anxiety levels. Practicing deep breathing exercises daily. Sleep improved significantly.",
      audioUrl: "https://example.com/audio/andy-session-4.mp3",
      status: SessionStatus.PROCESSED,
    },
  ];

  for (const data of andySessionData) {
    const session = await prisma.session.create({
      data: {
        clinicianId: clinician.id,
        patientId: patientAndy.id,
        status: data.status,
        transcript: data.transcript,
        audioUrl: data.audioUrl,
        sessionDate: daysAgo(data.daysAgo),
        createdAt: daysAgo(data.daysAgo),
      },
    });
    console.log(`  Created Session (PROCESSED): ${session.id} (${data.daysAgo} days ago)`);
  }

  // 4. Create PENDING sessions for Andy (assigned but not processed yet)
  console.log("\nCreating PENDING sessions for Andy...");
  const andyPendingSession = await prisma.session.create({
    data: {
      clinicianId: clinician.id,
      patientId: patientAndy.id,
      status: SessionStatus.PENDING,
      transcript: "Recent session. Andy feels prepared for upcoming client meeting. Reviewed coping strategies. Minor anticipatory anxiety but within functional range. Treatment goals on track.",
      audioUrl: "https://example.com/audio/andy-session-5.mp3",
      sessionDate: daysAgo(3),
      createdAt: daysAgo(3),
    },
  });
  console.log(`  Created Session (PENDING): ${andyPendingSession.id} (3 days ago)`);

  // 5. Create Sessions for Sarah (mix of PROCESSED and PENDING)
  console.log("\nCreating sessions for Sarah...");
  const sarahProcessedSession = await prisma.session.create({
    data: {
      clinicianId: clinician.id,
      patientId: patientSarah.id,
      status: SessionStatus.PROCESSED,
      transcript: "Initial intake. Sarah reports chronic worry affecting her work and sleep. Difficulty concentrating. Started having panic-like symptoms in the past month. Eager to learn coping strategies.",
      audioUrl: "https://example.com/audio/sarah-session-1.mp3",
      sessionDate: daysAgo(14),
      createdAt: daysAgo(14),
    },
  });
  console.log(`  Created Session (PROCESSED): ${sarahProcessedSession.id} (14 days ago)`);

  const sarahPendingSession = await prisma.session.create({
    data: {
      clinicianId: clinician.id,
      patientId: patientSarah.id,
      status: SessionStatus.PENDING,
      transcript: "Follow-up session. Sarah tried the worry time technique - found it helpful. Still having some sleep issues. Discussed sleep hygiene. Work stress continues but feeling more equipped to handle it.",
      audioUrl: "https://example.com/audio/sarah-session-2.mp3",
      sessionDate: daysAgo(1),
      createdAt: daysAgo(1),
    },
  });
  console.log(`  Created Session (PENDING): ${sarahPendingSession.id} (1 day ago)`);

  // 6. Create UNASSIGNED sessions (no patient assigned yet)
  console.log("\nCreating UNASSIGNED sessions...");
  const unassignedSession1 = await prisma.session.create({
    data: {
      clinicianId: clinician.id,
      patientId: null,
      status: SessionStatus.UNASSIGNED,
      transcript: "New patient consultation. Individual presents with work-related burnout. Reports feeling exhausted and disconnected. No previous therapy experience.",
      audioUrl: "https://example.com/audio/new-patient-1.mp3",
      sessionDate: daysAgo(2),
      createdAt: daysAgo(2),
    },
  });
  console.log(`  Created Session (UNASSIGNED): ${unassignedSession1.id} (2 days ago)`);

  const unassignedSession2 = await prisma.session.create({
    data: {
      clinicianId: clinician.id,
      patientId: null,
      status: SessionStatus.UNASSIGNED,
      transcript: "Phone screening. Potential new patient interested in couples therapy. Currently experiencing communication difficulties with partner.",
      audioUrl: "https://example.com/audio/new-patient-2.mp3",
      sessionDate: daysAgo(0),
      createdAt: daysAgo(0),
    },
  });
  console.log(`  Created Session (UNASSIGNED): ${unassignedSession2.id} (today)`);

  // 7. Create TreatmentPlan for Andy with version history
  console.log("\nCreating Treatment Plan for Andy...");
  const andyPlan = await prisma.treatmentPlan.upsert({
    where: { patientId: patientAndy.id },
    update: {},
    create: {
      patientId: patientAndy.id,
      currentContent: {
        riskScore: "LOW",
        therapistNote: "Patient has made significant progress over 4 months of treatment. Successfully completing exposure hierarchy. Recommend continued maintenance sessions.",
        clientSummary: "You've made great progress with your public speaking anxiety! We'll continue building on your success.",
        clinicalGoals: [
          { id: "1", description: "Reduce physiological anxiety symptoms during presentations", status: "COMPLETED" },
          { id: "2", description: "Improve public speaking confidence", status: "IN_PROGRESS" },
          { id: "3", description: "Complete exposure hierarchy from small to large audiences", status: "IN_PROGRESS" }
        ],
        clientGoals: [
          { id: "1", description: "Feel calmer when speaking in meetings", emoji: "😌" },
          { id: "2", description: "Present to my team without panic", emoji: "🎤" },
          { id: "3", description: "Sleep better before presentations", emoji: "😴" }
        ],
        interventions: ["CBT", "Exposure Therapy", "Relaxation Training", "Cognitive Restructuring"],
        homework: "Continue daily breathing exercises. Prepare for client meeting using visualization technique."
      },
      lastReviewedAt: daysAgo(30),
      nextReviewDue: daysAgo(-60), // 60 days in the future
      createdAt: daysAgo(120),
      versions: {
        create: [
          {
            content: {
              riskScore: "MEDIUM",
              therapistNote: "Initial assessment. Patient shows signs of social anxiety disorder. Recommended CBT with gradual exposure therapy.",
              clientSummary: "We discussed your fear of public speaking and created a plan to help you feel more confident.",
              clinicalGoals: [
                { id: "1", description: "Reduce physiological anxiety symptoms during presentations", status: "IN_PROGRESS" },
                { id: "2", description: "Improve public speaking confidence", status: "IN_PROGRESS" },
                { id: "3", description: "Complete exposure hierarchy", status: "IN_PROGRESS" }
              ],
              clientGoals: [
                { id: "1", description: "Feel calmer when speaking in meetings", emoji: "😌" },
                { id: "2", description: "Present to my team without panic", emoji: "🎤" },
                { id: "3", description: "Sleep better before presentations", emoji: "😴" }
              ],
              interventions: ["CBT", "Exposure Therapy", "Relaxation Training"],
              homework: "Practice deep breathing exercises daily."
            },
            version: 1,
            changeType: "INITIAL",
            changeSummary: "Initial treatment plan created",
            createdAt: daysAgo(120),
          },
          {
            content: {
              riskScore: "MEDIUM",
              therapistNote: "Patient showing early progress. Completed first small group exposure. Adding cognitive restructuring.",
              clientSummary: "Great job on your first presentation! We're adding some new techniques to build on your success.",
              clinicalGoals: [
                { id: "1", description: "Reduce physiological anxiety symptoms during presentations", status: "IN_PROGRESS" },
                { id: "2", description: "Improve public speaking confidence", status: "IN_PROGRESS" },
                { id: "3", description: "Complete exposure hierarchy", status: "IN_PROGRESS" }
              ],
              clientGoals: [
                { id: "1", description: "Feel calmer when speaking in meetings", emoji: "😌" },
                { id: "2", description: "Present to my team without panic", emoji: "🎤" },
                { id: "3", description: "Sleep better before presentations", emoji: "😴" }
              ],
              interventions: ["CBT", "Exposure Therapy", "Relaxation Training", "Cognitive Restructuring"],
              homework: "Continue breathing exercises. Challenge negative thoughts about presentations."
            },
            version: 2,
            changeType: "SESSION_UPDATE",
            changeSummary: "Added cognitive restructuring based on session progress",
            createdAt: daysAgo(90),
          },
          {
            content: {
              riskScore: "LOW",
              therapistNote: "Significant progress. Patient successfully presented to department. Risk lowered to LOW.",
              clientSummary: "You've made great progress with your public speaking anxiety!",
              clinicalGoals: [
                { id: "1", description: "Reduce physiological anxiety symptoms during presentations", status: "COMPLETED" },
                { id: "2", description: "Improve public speaking confidence", status: "IN_PROGRESS" },
                { id: "3", description: "Complete exposure hierarchy", status: "IN_PROGRESS" }
              ],
              clientGoals: [
                { id: "1", description: "Feel calmer when speaking in meetings", emoji: "😌" },
                { id: "2", description: "Present to my team without panic", emoji: "🎤" },
                { id: "3", description: "Sleep better before presentations", emoji: "😴" }
              ],
              interventions: ["CBT", "Exposure Therapy", "Relaxation Training", "Cognitive Restructuring"],
              homework: "Continue daily breathing exercises. Prepare for client meeting."
            },
            version: 3,
            changeType: "SESSION_UPDATE",
            changeSummary: "Goal 1 completed, risk score lowered to LOW",
            createdAt: daysAgo(30),
          },
        ],
      },
    },
  });
  console.log(`Created TreatmentPlan: ${andyPlan.id} with 3 versions`);

  // 8. Create TreatmentPlan for Sarah (newer patient)
  console.log("\nCreating Treatment Plan for Sarah...");
  const sarahPlan = await prisma.treatmentPlan.upsert({
    where: { patientId: patientSarah.id },
    update: {},
    create: {
      patientId: patientSarah.id,
      currentContent: {
        riskScore: "MEDIUM",
        therapistNote: "Patient presents with GAD. Initial session focused on psychoeducation and introducing coping strategies. Good insight and motivation.",
        clientSummary: "We talked about how anxiety works and learned your first relaxation technique. You're doing great!",
        clinicalGoals: [
          { id: "1", description: "Reduce frequency and intensity of worry episodes", status: "IN_PROGRESS" },
          { id: "2", description: "Improve sleep quality and duration", status: "IN_PROGRESS" },
          { id: "3", description: "Develop effective stress management skills", status: "IN_PROGRESS" }
        ],
        clientGoals: [
          { id: "1", description: "Worry less about work", emoji: "💼" },
          { id: "2", description: "Sleep through the night", emoji: "🌙" },
          { id: "3", description: "Feel more in control", emoji: "💪" }
        ],
        interventions: ["CBT", "Worry Time Technique", "Sleep Hygiene Education", "Relaxation Training"],
        homework: "Practice 'worry time' - schedule 15 minutes daily for worry, postpone worries outside this time."
      },
      lastReviewedAt: daysAgo(14),
      nextReviewDue: daysAgo(-76), // 76 days in the future
      createdAt: daysAgo(14),
      versions: {
        create: {
          content: {
            riskScore: "MEDIUM",
            therapistNote: "Initial assessment. Patient presents with GAD with mild depressive features.",
            clientSummary: "We talked about how anxiety works and learned your first relaxation technique.",
            clinicalGoals: [
              { id: "1", description: "Reduce frequency and intensity of worry episodes", status: "IN_PROGRESS" },
              { id: "2", description: "Improve sleep quality and duration", status: "IN_PROGRESS" },
              { id: "3", description: "Develop effective stress management skills", status: "IN_PROGRESS" }
            ],
            clientGoals: [
              { id: "1", description: "Worry less about work", emoji: "💼" },
              { id: "2", description: "Sleep through the night", emoji: "🌙" },
              { id: "3", description: "Feel more in control", emoji: "💪" }
            ],
            interventions: ["CBT", "Worry Time Technique", "Sleep Hygiene Education"],
            homework: "Practice 'worry time' technique daily."
          },
          version: 1,
          changeType: "INITIAL",
          changeSummary: "Initial treatment plan created",
          createdAt: daysAgo(14),
        },
      },
    },
  });
  console.log(`Created TreatmentPlan: ${sarahPlan.id} with 1 version`);

  console.log("\n✅ Database seeding complete!");
  console.log("\nSummary:");
  console.log("  - 1 Clinician (Dr. Adam Smith)");
  console.log("  - 3 Patients (Andy, Sarah, Mike)");
  console.log("  - Sessions by status:");
  console.log("    - PROCESSED: 5 (4 for Andy, 1 for Sarah)");
  console.log("    - PENDING: 2 (1 for Andy, 1 for Sarah)");
  console.log("    - UNASSIGNED: 2 (new consultations)");
  console.log("  - Treatment Plans: 2 (Andy with 3 versions, Sarah with 1 version)");
  console.log("  - Mike has no sessions or plan yet (new patient)");
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
