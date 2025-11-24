import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create 'Anxious Andy' persona
  const andy = await prisma.user.upsert({
    where: { email: "andy@example.com" },
    update: {},
    create: {
      email: "andy@example.com",
      name: "Anxious Andy",
      role: UserRole.CLINICIAN, // Assuming Andy is a user of the system, or maybe a patient context? 
                                // Based on schema, User seems to be the Clinician/Admin. 
                                // The PRD mentions "personas", likely referring to patient profiles or test cases.
                                // For now, I will seed a Clinician user and a Session representing a case.
    },
  });

  console.log(`Created user: ${andy.name} (${andy.id})`);

  // Create a dummy session for Andy
  const session = await prisma.session.create({
    data: {
      userId: andy.id,
      transcript: "Patient expresses significant anxiety regarding upcoming public speaking event. Symptoms include rapid heartbeat and sweating.",
      audioUrl: "https://example.com/audio/andy-session-1.mp3",
      plans: {
        create: {
          versions: {
            create: {
              content: {
                diagnosis: "Social Anxiety Disorder",
                goals: ["Reduce physiological symptoms", "Improve public speaking confidence"],
                interventions: ["CBT", "Exposure Therapy"],
              },
              version: 1,
            },
          },
        },
      },
    },
  });

  console.log(`Created session with plan: ${session.id}`);
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
