'use server'

import { prisma } from '@/lib/db';
import { Session, TreatmentPlan, PlanVersion, Patient, PlanSuggestion } from '@prisma/client';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

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
  summary: string | null;
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
      orderBy: [
        { sessionDate: 'desc' },
        { createdAt: 'desc' },
      ],
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
                summary: true,
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

/**
 * Generate a summary for a session from its transcript using AI
 */
export async function generateSessionSummary(
  sessionId: string,
  userId: string
): Promise<{ success: boolean; summary?: string; error?: string }> {
  if (!sessionId || !userId) {
    return { success: false, error: 'Session ID and User ID are required' };
  }

  try {
    // Fetch the session and verify ownership
    const session = await prisma.session.findFirst({
      where: {
        id: sessionId,
        clinicianId: userId,
      },
      select: {
        id: true,
        transcript: true,
        summary: true,
      },
    });

    if (!session) {
      return { success: false, error: 'Session not found or unauthorized' };
    }

    if (!session.transcript) {
      return { success: false, error: 'Session has no transcript to summarize' };
    }

    // Get user preferences for LLM model
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const llmModel = (user?.preferences as any)?.llmModel || 'gpt-4o-mini';

    // Generate summary using AI
    const { text: summary } = await generateText({
      model: openai(llmModel),
      system: `You are a clinical assistant helping to summarize therapy session transcripts.
Generate a brief, professional summary (2-3 sentences) that captures the key themes and outcomes of the session.
Focus on: main topics discussed, patient's emotional state, any breakthroughs or concerns, and next steps if mentioned.
Keep it concise and clinically relevant.`,
      prompt: `Summarize this therapy session transcript:\n\n${session.transcript}`,
    });

    // Update session with the generated summary
    await prisma.session.update({
      where: { id: sessionId },
      data: { summary },
    });

    return { success: true, summary };
  } catch (error) {
    console.error('Failed to generate session summary:', error);
    return { success: false, error: 'Failed to generate summary' };
  }
}
