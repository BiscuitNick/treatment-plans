import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TreatmentPlanSchema } from '@/lib/schemas/plan';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { SessionStatus } from '@prisma/client';

// Request body schema
const UpdatePlanRequestSchema = z.object({
  plan: TreatmentPlanSchema,
  sessionId: z.string().optional(), // Optional session to mark as PROCESSED
});

// Define context type for dynamic route params
interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const planId = params.id;

    if (!planId) {
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
    }

    const body = await request.json();

    // Support both legacy format (just plan) and new format (plan + sessionId)
    let updatedContent;
    let sessionIdToProcess: string | undefined;

    // Try new schema first
    const parseResult = UpdatePlanRequestSchema.safeParse(body);
    if (parseResult.success) {
      updatedContent = parseResult.data.plan;
      sessionIdToProcess = parseResult.data.sessionId;
    } else {
      // Fall back to legacy format (just the plan object)
      updatedContent = TreatmentPlanSchema.parse(body);
    }

    // Use a transaction to ensure versioning consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the current plan to ensure it exists
      const currentPlan = await tx.treatmentPlan.findUnique({
        where: { id: planId },
      });

      if (!currentPlan) {
        throw new Error("Treatment Plan not found");
      }

      // 2. Get next version number
      const versionsCount = await tx.planVersion.count({
        where: { treatmentPlanId: planId }
      });

      // 3. Create NEW PlanVersion with the updated content
      const newVersion = await tx.planVersion.create({
        data: {
          treatmentPlanId: planId,
          version: versionsCount + 1,
          content: updatedContent as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          changeReason: "Manual Update",
        },
      });

      // 4. If sessionId provided, mark the session as PROCESSED
      if (sessionIdToProcess) {
        await tx.session.update({
          where: { id: sessionIdToProcess },
          data: { status: SessionStatus.PROCESSED },
        });
      }

      return newVersion;
    });

    return NextResponse.json({ success: true, planVersion: result });

  } catch (error) {
    console.error("Update Plan Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid Input", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (error as Error).message || "Failed to update plan" }, { status: 500 });
  }
}