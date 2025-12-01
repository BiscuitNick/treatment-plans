import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TreatmentPlanSchema, type TreatmentPlan } from '@/lib/schemas/plan';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { SessionStatus } from '@prisma/client';
import { extractManualGoalChanges } from '@/lib/plans/merger';

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
    const userId = session.user.id;

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
      const currentPlanRecord = await tx.treatmentPlan.findUnique({
        where: { id: planId },
      });

      if (!currentPlanRecord) {
        throw new Error("Treatment Plan not found");
      }

      // 2. Parse current plan content for goal change detection
      let currentPlan: TreatmentPlan | null = null;
      if (currentPlanRecord.currentContent) {
        try {
          currentPlan = TreatmentPlanSchema.parse(currentPlanRecord.currentContent);
        } catch {
          // If parsing fails, treat as no previous plan
          currentPlan = null;
        }
      }

      // 3. Extract goal changes for history
      const goalChanges = extractManualGoalChanges(currentPlan, updatedContent);

      // 4. Get next version number
      const versionsCount = await tx.planVersion.count({
        where: { treatmentPlanId: planId }
      });

      // 5. Create NEW PlanVersion with the updated content
      const newVersion = await tx.planVersion.create({
        data: {
          treatmentPlanId: planId,
          version: versionsCount + 1,
          content: updatedContent as object,
          changeReason: "Manual Update",
          createdBy: userId,
        },
      });

      // 6. Update treatment plan with current content
      await tx.treatmentPlan.update({
        where: { id: planId },
        data: {
          currentContent: updatedContent as object,
        },
      });

      // 7. Record goal history for any status changes
      for (const change of goalChanges) {
        const goal = updatedContent.clinicalGoals.find(g => g.id === change.goalId);
        await tx.goalHistory.create({
          data: {
            treatmentPlanId: planId,
            goalId: change.goalId,
            goalDescription: goal?.description || null,
            previousStatus: change.previousStatus,
            newStatus: change.newStatus,
            changedBy: userId,
            reason: change.reason,
            sessionId: sessionIdToProcess || null,
          },
        });
      }

      // 8. If sessionId provided, mark the session as PROCESSED
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