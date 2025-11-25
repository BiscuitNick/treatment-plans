import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '@/lib/aws-config';
import { env } from '@/lib/env';
import { z } from 'zod';
import { auth } from '@/lib/auth';

// Allow for longer execution times for audio processing
export const maxDuration = 300;

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const transcribeSchema = z.object({
  s3Key: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { s3Key } = transcribeSchema.parse(body);

    // Validate s3Key format (security check - must be in uploads/ folder)
    if (!s3Key.startsWith('uploads/')) {
      return NextResponse.json({ error: 'Invalid S3 key' }, { status: 400 });
    }

    // Generate a pre-signed GET URL for the audio file
    const getCommand = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: s3Key,
    });
    const audioUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 300 });

    // Fetch audio file using signed URL
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
