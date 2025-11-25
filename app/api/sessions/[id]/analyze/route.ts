import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createSessionSuggestion } from '@/services/suggestion-service';

// Allow longer execution for AI processing
export const maxDuration = 300;

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/sessions/[id]/analyze
 *
 * Analyzes a session and creates a PlanSuggestion for therapist review.
 * Does NOT auto-update the treatment plan - therapist must approve changes.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const sessionId = params.id;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Create suggestion (does not auto-commit to plan)
    const result = await createSessionSuggestion(sessionId, session.user.id);

    if (!result.success) {
      const status = result.error === 'Safety Alert Detected' ? 400 : 500;
      return NextResponse.json(
        {
          error: result.error,
          safetyResult: result.safetyResult,
        },
        { status }
      );
    }

    return NextResponse.json({
      suggestionId: result.suggestionId,
      suggestion: result.suggestion,
      requiresReview: true, // Always true - therapist must review
      safetyResult: result.safetyResult,
    });
  } catch (error) {
    console.error('Session analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze session' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sessions/[id]/analyze
 *
 * Get existing suggestion for a session (if any).
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const sessionId = params.id;

    const { getPendingSuggestion } = await import('@/services/suggestion-service');
    const suggestion = await getPendingSuggestion(sessionId);

    if (!suggestion) {
      return NextResponse.json({ suggestion: null });
    }

    return NextResponse.json({
      suggestion: {
        id: suggestion.id,
        status: suggestion.status,
        sessionSummary: suggestion.sessionSummary,
        progressNotes: suggestion.progressNotes,
        suggestedChanges: suggestion.suggestedChanges,
        createdAt: suggestion.createdAt,
        reviewedAt: suggestion.reviewedAt,
      },
      currentPlan: suggestion.treatmentPlan?.versions?.[0]?.content || null,
    });
  } catch (error) {
    console.error('Get suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestion' },
      { status: 500 }
    );
  }
}
