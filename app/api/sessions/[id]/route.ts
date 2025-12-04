import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SessionStatus } from '@prisma/client';

const updateSessionSchema = z.object({
  sessionDate: z.string().optional(),
  patientId: z.string().nullable().optional(),
  transcript: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  s3Key: z.string().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const sessionRecord = await prisma.session.findFirst({
      where: {
        id,
        clinicianId: session.user.id,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!sessionRecord) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session: sessionRecord });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const data = updateSessionSchema.parse(body);

    // Verify session belongs to this clinician
    const existingSession = await prisma.session.findFirst({
      where: {
        id,
        clinicianId: session.user.id,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // If patientId is being set, verify it belongs to this clinician
    if (data.patientId) {
      const patient = await prisma.patient.findFirst({
        where: {
          id: data.patientId,
          clinicianId: session.user.id,
        },
      });
      if (!patient) {
        return NextResponse.json({ error: 'Patient not found or unauthorized' }, { status: 403 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.sessionDate !== undefined) {
      updateData.sessionDate = data.sessionDate ? new Date(data.sessionDate) : null;
    }
    if (data.patientId !== undefined) {
      updateData.patientId = data.patientId;

      // Update session status based on patient assignment
      // Only change status if session is currently UNASSIGNED (don't override PROCESSED)
      if (data.patientId && existingSession.status === SessionStatus.UNASSIGNED) {
        // Assigning a patient to an unassigned session -> PENDING
        updateData.status = SessionStatus.PENDING;
      } else if (data.patientId === null && existingSession.status === SessionStatus.PENDING) {
        // Removing patient from a pending session -> UNASSIGNED
        updateData.status = SessionStatus.UNASSIGNED;
      }
    }
    if (data.transcript !== undefined) {
      updateData.transcript = data.transcript;
    }
    if (data.summary !== undefined) {
      updateData.summary = data.summary;
    }
    if (data.s3Key !== undefined) {
      updateData.s3Key = data.s3Key;
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ session: updatedSession });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify session belongs to this clinician
    const existingSession = await prisma.session.findFirst({
      where: {
        id,
        clinicianId: session.user.id,
      },
    });

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await prisma.session.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
