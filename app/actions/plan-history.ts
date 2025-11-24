'use server'

import { prisma } from '@/lib/db';

export interface PlanHistoryItem {
  id: string;
  version: number;
  createdAt: Date;
  changeReason: string | null;
}

export async function getPlanHistory(planId: string): Promise<PlanHistoryItem[]> {
  if (!planId) return [];

  try {
    const versions = await prisma.planVersion.findMany({
      where: { treatmentPlanId: planId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        createdAt: true,
        changeReason: true,
      }
    });
    return versions;
  } catch (error) {
    console.error("Failed to fetch plan history:", error);
    return [];
  }
}
