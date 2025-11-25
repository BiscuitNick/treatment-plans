import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { env } from '@/lib/env';
import { z } from 'zod';
import { auth } from '@/lib/auth';

// Allow for longer execution times for audio processing
export const maxDuration = 300;

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const transcribeSchema = z.object({
  audioUrl: z.string().url(),
});

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { audioUrl } = transcribeSchema.parse(body);

    // Validate audioUrl domain (security check)
    const url = new URL(audioUrl);
    if (!url.hostname.endsWith('amazonaws.com')) {
      return NextResponse.json({ error: 'Invalid audio URL domain' }, { status: 400 });
    }

    // Fetch audio file
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to fetch audio file: ${audioResponse.statusText}`);
    }

    // Convert to File object for OpenAI
    const blob = await audioResponse.blob();
    const file = new File([blob], 'audio.mp3', { type: blob.type });

    // Transcribe
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'json',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.issues }, { status: 400 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorMessage = (error as any).message || "Unknown error";
    console.error('Transcription error details:', error);
    return NextResponse.json({ error: `Transcription failed: ${errorMessage}` }, { status: 500 });
  }
}
