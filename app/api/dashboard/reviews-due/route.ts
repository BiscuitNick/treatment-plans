import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getUserSettings } from '@/app/actions/settings';
import { REVIEW_FREQUENCY_OPTIONS } from '@/lib/constants/review-frequency';
import type { ReviewDueItem } from '@/lib/types/suggestion';

/**
 * GET /api/dashboard/reviews-due
 *
 * Returns a list of treatment plans that are due or overdue for review.
 * Review frequency is configurable per user in settings.
 * Sorted by most overdue first.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();

    // Get the user's configured review frequency
    const userSettings = await getUserSettings(userId);
    const reviewFrequencyDays = REVIEW_FREQUENCY_OPTIONS[userSettings.reviewFrequency].days;

    // Handle "Every Session" (0 days) - all plans are always due for review
    const isEverySession = reviewFrequencyDays === 0;

    // Find plans due for review (nextReviewDue is in the past or within 7 days)
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const plans = await prisma.treatmentPlan.findMany({
      where: {
        patient: {
          clinicianId: userId,
        },
        // For "Every Session" mode, return all plans
        // Otherwise, filter to plans due/overdue for review
        ...(isEverySession
          ? {}
          : {
              OR: [
                // Overdue: nextReviewDue is in the past
                {
                  nextReviewDue: {
                    lt: now,
                  },
                },
                // Due soon: nextReviewDue is within 7 days
                {
                  nextReviewDue: {
                    gte: now,
                    lte: sevenDaysFromNow,
                  },
                },
                // Never reviewed and created more than reviewFrequency days ago
                {
                  nextReviewDue: null,
                  createdAt: {
                    lt: new Date(now.getTime() - reviewFrequencyDays * 24 * 60 * 60 * 1000),
                  },
                },
              ],
            }),
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [
        { nextReviewDue: 'asc' }, // null values last, then by date
      ],
    });

    // Transform to ReviewDueItem format
    const reviewsDue: ReviewDueItem[] = plans.map((plan) => {
      const lastReviewedAt = plan.lastReviewedAt;
      const nextReviewDue = plan.nextReviewDue;

      // Calculate days since last review
      const daysSinceReview = lastReviewedAt
        ? Math.floor((now.getTime() - lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((now.getTime() - plan.createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate days overdue (negative means due in future)
      let daysOverdue = 0;
      if (isEverySession) {
        // "Every Session" mode - all plans are due today
        daysOverdue = 0;
      } else if (nextReviewDue) {
        daysOverdue = Math.floor((now.getTime() - nextReviewDue.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        // No nextReviewDue set - calculate from creation date + configured frequency
        const impliedDue = new Date(plan.createdAt);
        impliedDue.setDate(impliedDue.getDate() + reviewFrequencyDays);
        daysOverdue = Math.floor((now.getTime() - impliedDue.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        planId: plan.id,
        patientId: plan.patient.id,
        patientName: plan.patient.name,
        lastReviewedAt: lastReviewedAt?.toISOString() || null,
        nextReviewDue: nextReviewDue?.toISOString() || null,
        daysSinceReview,
        daysOverdue,
      };
    });

    // Sort: overdue first (positive daysOverdue), then by most overdue
    reviewsDue.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Summary stats
    const overdue = reviewsDue.filter((r) => r.daysOverdue > 0);
    const dueSoon = reviewsDue.filter((r) => r.daysOverdue <= 0 && r.daysOverdue >= -7);

    return NextResponse.json({
      reviews: reviewsDue,
      summary: {
        total: reviewsDue.length,
        overdue: overdue.length,
        dueSoon: dueSoon.length,
      },
    });
  } catch (error) {
    console.error('Reviews due error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews due' },
      { status: 500 }
    );
  }
}
