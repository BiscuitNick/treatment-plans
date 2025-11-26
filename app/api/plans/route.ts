import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TreatmentPlanSchema } from '@/lib/schemas/plan';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { SessionStatus } from '@prisma/client';

// Request body schema for creating a new plan
const CreatePlanRequestSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  plan: TreatmentPlanSchema,
  sessionId: z.string().optional(), // Optional session to mark as PROCESSED
});

/**
 * POST /api/plans
 *
 * Creates a new treatment plan for a patient.
 */
export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { patientId, plan, sessionId } = CreatePlanRequestSchema.parse(body);

    // Verify the patient exists and belongs to this clinician
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        clinicianId: session.user.id,
      },
      include: {
        treatmentPlan: true,
      },
    });

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Check if patient already has a treatment plan
    if (patient.treatmentPlan) {
      return NextResponse.json(
        { error: 'Patient already has a treatment plan. Use the update endpoint instead.' },
        { status: 400 }
      );
    }

    // Create the treatment plan with initial version
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the treatment plan
      const treatmentPlan = await tx.treatmentPlan.create({
        data: {
          patientId,
        },
      });

      // 2. Create the first version
      const planVersion = await tx.planVersion.create({
        data: {
          treatmentPlanId: treatmentPlan.id,
          version: 1,
          content: plan as any, // eslint-disable-line @typescript-eslint/no-explicit-any
          changeReason: 'Initial Plan Creation',
        },
      });

      // 3. If sessionId provided, mark the session as PROCESSED
      if (sessionId) {
        await tx.session.update({
          where: { id: sessionId },
          data: { status: SessionStatus.PROCESSED },
        });
      }

      return { treatmentPlan, planVersion };
    });

    return NextResponse.json({
      success: true,
      planId: result.treatmentPlan.id,
      planVersion: result.planVersion,
    });
  } catch (error) {
    console.error('Create Plan Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid Input', details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create plan' },
      { status: 500 }
    );
  }
}
