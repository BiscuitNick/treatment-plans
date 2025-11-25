import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const RejectRequestSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

/**
 * POST /api/suggestions/[id]/reject
 *
 * Rejects a suggestion without applying changes to the plan.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const suggestionId = params.id;

    if (!suggestionId) {
      return NextResponse.json({ error: 'Suggestion ID is required' }, { status: 400 });
    }

    // Parse request body
    const body = await request.json();
    const { reason } = RejectRequestSchema.parse(body);

    // Fetch suggestion
    const suggestion = await prisma.planSuggestion.findUnique({
      where: { id: suggestionId },
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

    // Update suggestion to rejected
    await prisma.planSuggestion.update({
      where: { id: suggestionId },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedBy: session.user.id,
        therapistNotes: reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Suggestion rejected',
    });
  } catch (error) {
    console.error('Reject suggestion error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to reject suggestion' },
      { status: 500 }
    );
  }
}
