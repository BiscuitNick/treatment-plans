import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { GoalWithHistory, GoalHistoryEntry } from '@/lib/types/suggestion';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/plans/[id]/goal-history
 *
 * Retrieves the status change history for all goals in a treatment plan.
 * Returns data grouped by goalId for timeline visualization.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const planId = params.id;

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Verify plan exists and user has access (clinician or patient)
    const plan = await prisma.treatmentPlan.findFirst({
      where: {
        id: planId,
        patient: {
          OR: [
            { clinicianId: session.user.id },
            { userId: session.user.id },
          ],
        },
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Fetch all goal history entries for this plan
    const historyEntries = await prisma.goalHistory.findMany({
      where: { treatmentPlanId: planId },
      orderBy: { changedAt: 'asc' },
    });

    // Get current plan content to get goal descriptions
    const currentContent = plan.currentContent as {
      clinicalGoals?: Array<{ id: string; description: string; status: string }>;
    } | null;

    const currentGoals = currentContent?.clinicalGoals || [];

    // Group history by goalId
    const historyByGoal = new Map<string, GoalHistoryEntry[]>();

    for (const entry of historyEntries) {
      const goalHistory: GoalHistoryEntry = {
        id: entry.id,
        goalId: entry.goalId,
        goalDescription: entry.goalDescription,
        previousStatus: entry.previousStatus,
        newStatus: entry.newStatus,
        changedAt: entry.changedAt.toISOString(),
        changedBy: entry.changedBy,
        reason: entry.reason,
        sessionId: entry.sessionId,
      };

      const existing = historyByGoal.get(entry.goalId) || [];
      existing.push(goalHistory);
      historyByGoal.set(entry.goalId, existing);
    }

    // Build response with current status from plan
    const goalsWithHistory: GoalWithHistory[] = [];
    const matchedCurrentGoalIds = new Set<string>();

    // First, add all goals that have history
    for (const [goalId, history] of historyByGoal.entries()) {
      const latestHistory = history[history.length - 1];

      // Try to match by ID first, then by description
      let currentGoal = currentGoals.find(g => g.id === goalId);
      const historyDescription = latestHistory?.goalDescription;
      if (!currentGoal && historyDescription) {
        // Fallback: match by description (for when goals are regenerated with new IDs)
        currentGoal = currentGoals.find(g =>
          g.description.toLowerCase() === historyDescription.toLowerCase()
        );
      }

      if (currentGoal) {
        matchedCurrentGoalIds.add(currentGoal.id);
      }

      goalsWithHistory.push({
        goalId,
        description: currentGoal?.description || latestHistory?.goalDescription || `Goal ${goalId}`,
        // Always prefer current plan status when we have a match
        currentStatus: currentGoal?.status || latestHistory?.newStatus || 'UNKNOWN',
        history,
      });
    }

    // Add any current goals without history (new goals)
    for (const goal of currentGoals) {
      // Skip if already matched to a historical goal
      if (matchedCurrentGoalIds.has(goal.id)) {
        continue;
      }
      // Also skip if we already have this goal via description matching
      if (!historyByGoal.has(goal.id)) {
        goalsWithHistory.push({
          goalId: goal.id,
          description: goal.description,
          currentStatus: goal.status,
          history: [],
        });
      }
    }

    // Sort by goalId for consistent ordering
    goalsWithHistory.sort((a, b) => a.goalId.localeCompare(b.goalId));

    return NextResponse.json({
      planId,
      goals: goalsWithHistory,
      totalHistoryEntries: historyEntries.length,
    });
  } catch (error) {
    console.error('Goal history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch goal history' },
      { status: 500 }
    );
  }
}
