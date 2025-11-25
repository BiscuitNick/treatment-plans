import { z } from 'zod';
import { NextResponse } from 'next/server';
import { processSession } from '@/services/analysis';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, userId, patientId } = z.object({
      transcript: z.string(),
      userId: z.string().optional(),
      patientId: z.string().optional(),
    }).parse(body);

    // We now prioritize patientId for the new architecture
    // Legacy support for userId/sessionId is minimal or removed
    const result = await processSession(transcript, userId, undefined, patientId);

    if (!result.success) {
       return NextResponse.json({
        error: result.error,
        safetyResult: result.safetyResult
      }, { status: 400 });
    }

    return NextResponse.json({ 
      plan: result.plan,
      safetyResult: result.safetyResult,
      savedPlanId: result.savedPlanId
    });

  } catch (error) {
    console.error("Plan Generation Error:", error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: "Invalid Input", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to generate plan" }, { status: 500 });
  }
}
