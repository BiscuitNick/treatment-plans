import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { PlanDiff, RiskLevel } from '@/lib/types/suggestion';
import type { SuggestedChanges } from '@/lib/schemas/suggestion';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/plans/[id]/diff?suggestionId=...
 *
 * Compares the current plan with a pending suggestion.
 * Returns a structured diff showing what would change if approved.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const planId = params.id;
    const { searchParams } = new URL(request.url);
    const suggestionId = searchParams.get('suggestionId');

    if (!planId) {
      return NextResponse.json({ error: 'Plan ID is required' }, { status: 400 });
    }

    // Verify plan exists and user has access
    const plan = await prisma.treatmentPlan.findFirst({
      where: {
        id: planId,
        patient: {
          clinicianId: session.user.id,
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

    // Get the suggestion to compare against
    let suggestion;
    if (suggestionId) {
      // Specific suggestion requested
      suggestion = await prisma.planSuggestion.findFirst({
        where: {
          id: suggestionId,
          treatmentPlanId: planId,
        },
      });
    } else {
      // Get the most recent pending suggestion
      suggestion = await prisma.planSuggestion.findFirst({
        where: {
          treatmentPlanId: planId,
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!suggestion) {
      return NextResponse.json({
        hasSuggestion: false,
        diff: null,
      });
    }

    // Get current plan content
    const currentContent = plan.currentContent as {
      clinicalGoals?: Array<{ id: string; description: string; status: string }>;
      interventions?: string[];
      homework?: string;
      riskScore?: RiskLevel;
    } | null;

    const suggestedChanges = suggestion.suggestedChanges as SuggestedChanges;

    // Build the diff
    const diff: PlanDiff = {
      goalChanges: [],
      newGoals: [],
      newInterventions: [],
      homeworkChange: null,
      riskChange: null,
    };

    // Compare goal status changes
    for (const update of suggestedChanges.goalUpdates) {
      const currentGoal = currentContent?.clinicalGoals?.find(g => g.id === update.goalId);

      diff.goalChanges.push({
        goalId: update.goalId,
        description: currentGoal?.description || `Goal ${update.goalId}`,
        currentStatus: update.currentStatus,
        suggestedStatus: update.suggestedStatus,
        rationale: update.rationale,
      });
    }

    // Add new goals
    diff.newGoals = suggestedChanges.newGoals;

    // Compare interventions - find new ones
    const currentInterventions = new Set(currentContent?.interventions || []);
    const newInterventions = suggestedChanges.interventionsUsed.filter(
      i => !currentInterventions.has(i)
    );
    diff.newInterventions = newInterventions;

    // Homework change
    if (suggestedChanges.homeworkUpdate) {
      diff.homeworkChange = suggestedChanges.homeworkUpdate;
    }

    // Risk level change
    const currentRisk = currentContent?.riskScore || 'LOW';
    if (suggestedChanges.riskAssessment.currentLevel !== suggestedChanges.riskAssessment.suggestedLevel) {
      diff.riskChange = {
        from: suggestedChanges.riskAssessment.currentLevel,
        to: suggestedChanges.riskAssessment.suggestedLevel,
        rationale: suggestedChanges.riskAssessment.rationale,
      };
    }

    // Calculate summary stats
    const summary = {
      totalChanges:
        diff.goalChanges.filter(g => g.currentStatus !== g.suggestedStatus).length +
        diff.newGoals.length +
        diff.newInterventions.length +
        (diff.homeworkChange ? 1 : 0) +
        (diff.riskChange ? 1 : 0),
      goalUpdates: diff.goalChanges.filter(g => g.currentStatus !== g.suggestedStatus).length,
      newGoals: diff.newGoals.length,
      newInterventions: diff.newInterventions.length,
      hasHomeworkChange: !!diff.homeworkChange,
      hasRiskChange: !!diff.riskChange,
    };

    return NextResponse.json({
      hasSuggestion: true,
      suggestionId: suggestion.id,
      suggestionStatus: suggestion.status,
      createdAt: suggestion.createdAt.toISOString(),
      diff,
      summary,
    });
  } catch (error) {
    console.error('Plan diff error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate plan diff' },
      { status: 500 }
    );
  }
}
