import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { applyChanges, extractGoalChanges } from '@/lib/plans/merger';
import { TreatmentPlanSchema, type TreatmentPlan } from '@/lib/schemas/plan';
import { SuggestedChangesSchema, type SuggestedChanges } from '@/lib/schemas/suggestion';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const ApproveRequestSchema = z.object({
  modifications: SuggestedChangesSchema.partial().optional(),
  therapistNotes: z.string().optional(),
});

/**
 * POST /api/suggestions/[id]/approve
 *
 * Approves a suggestion and creates a new plan version.
 * Optionally accepts modifications to the suggested changes.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const params = await context.params;
    const suggestionId = params.id;

    if (!suggestionId) {
      return NextResponse.json({ error: 'Suggestion ID is required' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { modifications, therapistNotes } = ApproveRequestSchema.parse(body);

    // Fetch suggestion with related data
    const suggestion = await prisma.planSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        treatmentPlan: {
          include: {
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
        session: true,
      },
    });

    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }

    if (suggestion.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Suggestion already ${suggestion.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Get current plan content
    let currentPlan: TreatmentPlan | null = null;
    if (suggestion.treatmentPlan.versions[0]?.content) {
      try {
        currentPlan = TreatmentPlanSchema.parse(suggestion.treatmentPlan.versions[0].content);
      } catch {
        currentPlan = null;
      }
    }

    // Parse suggested changes
    const suggestedChanges = suggestion.suggestedChanges as SuggestedChanges;

    // Apply changes (with optional modifications)
    const mergeResult = applyChanges(
      currentPlan,
      suggestedChanges,
      modifications as Partial<SuggestedChanges> | undefined
    );

    // Extract goal changes for history
    const goalChanges = extractGoalChanges(currentPlan, suggestedChanges);

    // Determine status based on modifications
    const newStatus = modifications ? 'MODIFIED' : 'APPROVED';

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update suggestion status
      await tx.planSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: newStatus,
          reviewedAt: new Date(),
          reviewedBy: userId,
          therapistNotes: therapistNotes || null,
        },
      });

      // 2. Get next version number
      const versionCount = await tx.planVersion.count({
        where: { treatmentPlanId: suggestion.treatmentPlanId },
      });

      // 3. Create new plan version
      const newVersion = await tx.planVersion.create({
        data: {
          treatmentPlanId: suggestion.treatmentPlanId,
          content: mergeResult.updatedPlan as object,
          version: versionCount + 1,
          changeType: 'SESSION_UPDATE',
          changeSummary: mergeResult.changeSummary,
          suggestionId: suggestionId,
          createdBy: userId,
        },
      });

      // 4. Update treatment plan with current content and review dates
      const now = new Date();
      const nextReviewDue = new Date(now);
      nextReviewDue.setDate(nextReviewDue.getDate() + 90);

      await tx.treatmentPlan.update({
        where: { id: suggestion.treatmentPlanId },
        data: {
          currentContent: mergeResult.updatedPlan as object,
          lastReviewedAt: now,
          nextReviewDue: nextReviewDue,
        },
      });

      // 5. Create goal history entries
      for (const change of goalChanges) {
        const goal = currentPlan?.clinicalGoals.find(g => g.id === change.goalId);
        await tx.goalHistory.create({
          data: {
            treatmentPlanId: suggestion.treatmentPlanId,
            goalId: change.goalId,
            goalDescription: goal?.description || null,
            previousStatus: change.previousStatus,
            newStatus: change.newStatus,
            changedBy: userId,
            reason: change.reason,
            sessionId: suggestion.sessionId,
          },
        });
      }

      // 6. Create history entries for new goals
      for (const newGoalId of mergeResult.newGoalIds) {
        const newGoal = mergeResult.updatedPlan.clinicalGoals.find(g => g.id === newGoalId);
        await tx.goalHistory.create({
          data: {
            treatmentPlanId: suggestion.treatmentPlanId,
            goalId: newGoalId,
            goalDescription: newGoal?.description || null,
            previousStatus: 'NEW',
            newStatus: 'IN_PROGRESS',
            changedBy: userId,
            reason: 'New goal added from session analysis',
            sessionId: suggestion.sessionId,
          },
        });
      }

      return newVersion;
    });

    return NextResponse.json({
      success: true,
      planVersion: {
        id: result.id,
        version: result.version,
        changeSummary: mergeResult.changeSummary,
      },
      updatedPlan: mergeResult.updatedPlan,
      changesApplied: {
        goalStatusChanges: goalChanges.length,
        newGoalsAdded: mergeResult.newGoalIds.length,
      },
    });
  } catch (error) {
    console.error('Approve suggestion error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to approve suggestion' },
      { status: 500 }
    );
  }
}
