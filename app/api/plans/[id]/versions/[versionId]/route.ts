import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * GET /api/plans/[id]/versions/[versionId]
 *
 * Fetch a specific version of a treatment plan.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const { id: planId, versionId } = params;

    // Fetch the specific version
    const version = await prisma.planVersion.findFirst({
      where: {
        id: versionId,
        treatmentPlanId: planId,
      },
      include: {
        treatmentPlan: {
          include: {
            versions: {
              orderBy: { version: 'desc' },
              take: 1,
              select: { id: true, version: true },
            },
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    const latestVersion = version.treatmentPlan.versions[0];
    const isCurrentVersion = latestVersion?.id === versionId;

    return NextResponse.json({
      version: {
        id: version.id,
        version: version.version,
        content: version.content,
        changeType: version.changeType,
        changeReason: version.changeReason,
        changeSummary: version.changeSummary,
        createdAt: version.createdAt,
      },
      isCurrentVersion,
      latestVersionNumber: latestVersion?.version || version.version,
    });
  } catch (error) {
    console.error('Error fetching plan version:', error);
    return NextResponse.json(
      { error: 'Failed to fetch version' },
      { status: 500 }
    );
  }
}
