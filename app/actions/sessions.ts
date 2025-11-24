'use server'

import { prisma } from '@/lib/db';
import { Session, TreatmentPlan, PlanVersion } from '@prisma/client';

export interface DashboardSession extends Session {
  plans: (TreatmentPlan & {
    versions: PlanVersion[];
  })[];
  user: {
    name: string | null;
    email: string;
  };
}

export async function getDashboardSessions(userId: string): Promise<DashboardSession[]> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    const sessions = await prisma.session.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        },
        plans: {
          include: {
            versions: {
              orderBy: {
                version: 'desc',
              },
              take: 1, // Get latest version info
            },
          },
        },
      },
    });

    return sessions;
  } catch (error) {
    console.error("Failed to fetch dashboard sessions:", error);
    throw new Error("Failed to fetch sessions");
  }
}
