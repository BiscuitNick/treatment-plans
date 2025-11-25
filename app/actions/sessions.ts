'use server'

import { prisma } from '@/lib/db';
import { Session, TreatmentPlan, PlanVersion, Patient } from '@prisma/client';

export interface DashboardSession extends Session {
  patient: Pick<Patient, 'id' | 'name'> & {
    clinician: {
      name: string | null;
      email: string;
    };
    treatmentPlan: (TreatmentPlan & {
      versions: PlanVersion[];
    }) | null;
  };
}

export async function getDashboardSessions(userId: string): Promise<DashboardSession[]> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    // Sessions belong to Patients, Patients belong to Users (clinicians)
    const sessions = await prisma.session.findMany({
      where: {
        patient: {
          clinicianId: userId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            clinician: {
              select: {
                name: true,
                email: true,
              },
            },
            treatmentPlan: {
              include: {
                versions: {
                  orderBy: {
                    version: 'desc',
                  },
                  take: 1,
                },
              },
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
