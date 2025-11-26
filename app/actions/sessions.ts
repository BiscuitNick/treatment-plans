'use server'

import { prisma } from '@/lib/db';
import { Session, TreatmentPlan, PlanVersion, Patient, PlanSuggestion } from '@prisma/client';

/**
 * Simplified suggestion data for dashboard display
 */
export interface DashboardSuggestion {
  id: string;
  status: PlanSuggestion['status'];
  sessionSummary: string;
  createdAt: Date;
}

/**
 * Session info for Session History display
 */
export interface PatientSessionInfo {
  id: string;
  status: Session['status'];
  sessionDate: Date | null;
  sessionTime: string | null;
  transcript: string | null;
  createdAt: Date;
}

export interface DashboardSession extends Session {
  patient: (Pick<Patient, 'id' | 'name'> & {
    clinician: {
      name: string | null;
      email: string;
    };
    treatmentPlan: (TreatmentPlan & {
      versions: PlanVersion[];
    }) | null;
    /** All sessions for this patient (for Session History tab) */
    sessions: PatientSessionInfo[];
  }) | null;
  /** Pending suggestion for this session, if any */
  suggestion?: DashboardSuggestion | null;
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
            sessions: {
              orderBy: {
                createdAt: 'desc',
              },
              select: {
                id: true,
                status: true,
                sessionDate: true,
                sessionTime: true,
                transcript: true,
                createdAt: true,
              },
            },
          },
        },
        // Include pending suggestion if any
        suggestion: {
          select: {
            id: true,
            status: true,
            sessionSummary: true,
            createdAt: true,
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
