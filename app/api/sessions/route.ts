import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { SessionStatus } from '@prisma/client';

// GET query schema
const getSessionsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(25),
  sortBy: z.enum(['date', 'patient', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  patientId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  hasTranscript: z.coerce.boolean().optional(),
  hasAudio: z.coerce.boolean().optional(),
});

// POST body schema for creating sessions
const createSessionSchema = z.object({
  sessions: z.array(z.object({
    transcript: z.string().optional(),
    s3Key: z.string().optional(),
    audioUrl: z.string().optional(),
    patientId: z.string().optional(),
    sessionDate: z.string().optional(),
    sessionTime: z.string().optional(),
  })).min(1).max(5),
});

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params = getSessionsSchema.parse({
      page: searchParams.get('page') ?? 1,
      limit: searchParams.get('limit') ?? 25,
      sortBy: searchParams.get('sortBy') ?? 'createdAt',
      sortOrder: searchParams.get('sortOrder') ?? 'desc',
      patientId: searchParams.get('patientId') ?? undefined,
      dateFrom: searchParams.get('dateFrom') ?? undefined,
      dateTo: searchParams.get('dateTo') ?? undefined,
      hasTranscript: searchParams.get('hasTranscript') ?? undefined,
      hasAudio: searchParams.get('hasAudio') ?? undefined,
    });

    const { page, limit, sortBy, sortOrder, patientId, dateFrom, dateTo, hasTranscript, hasAudio } = params;

    // Build where clause
    const where: Record<string, unknown> = {
      clinicianId: session.user.id,
    };

    if (patientId) {
      where.patientId = patientId;
    }

    if (dateFrom || dateTo) {
      where.sessionDate = {};
      if (dateFrom) {
        (where.sessionDate as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.sessionDate as Record<string, Date>).lte = new Date(dateTo);
      }
    }

    if (hasTranscript !== undefined) {
      where.transcript = hasTranscript ? { not: null } : null;
    }

    if (hasAudio !== undefined) {
      where.s3Key = hasAudio ? { not: null } : null;
    }

    // Build orderBy
    let orderBy: Record<string, string> = {};
    switch (sortBy) {
      case 'date':
        orderBy = { sessionDate: sortOrder };
        break;
      case 'patient':
        orderBy = { patient: { name: sortOrder } } as unknown as Record<string, string>;
        break;
      case 'createdAt':
      default:
        orderBy = { createdAt: sortOrder };
        break;
    }

    // Get total count for pagination
    const total = await prisma.session.count({ where });

    // Get sessions
    const sessions = await prisma.session.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      sessions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request parameters', details: error.issues }, { status: 400 });
    }
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sessions: sessionsToCreate } = createSessionSchema.parse(body);

    // If patientId is provided, verify it belongs to this clinician
    for (const sessionData of sessionsToCreate) {
      if (sessionData.patientId) {
        const patient = await prisma.patient.findFirst({
          where: {
            id: sessionData.patientId,
            clinicianId: authSession.user.id,
          },
        });
        if (!patient) {
          return NextResponse.json({ error: `Patient ${sessionData.patientId} not found or unauthorized` }, { status: 403 });
        }
      }
    }

    // Create all sessions
    const createdSessions = await prisma.$transaction(
      sessionsToCreate.map((sessionData) =>
        prisma.session.create({
          data: {
            clinicianId: authSession.user!.id,
            transcript: sessionData.transcript,
            s3Key: sessionData.s3Key,
            audioUrl: sessionData.audioUrl,
            patientId: sessionData.patientId,
            sessionDate: sessionData.sessionDate ? new Date(sessionData.sessionDate) : null,
            sessionTime: sessionData.sessionTime,
            // Set status based on patient assignment
            status: sessionData.patientId ? SessionStatus.PENDING : SessionStatus.UNASSIGNED,
          },
          include: {
            patient: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      )
    );

    return NextResponse.json({ sessions: createdSessions }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body', details: error.issues }, { status: 400 });
    }
    console.error('Error creating sessions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
