'use server'

import { openai } from '@ai-sdk/openai';
import OpenAI from 'openai';
import { generateText } from 'ai';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '@/lib/aws-config';
import { env } from '@/lib/env';
import { prisma } from '@/lib/db';
import { SessionStatus } from '@prisma/client';

// Separate instances for AI SDK and direct API usage
const directOpenAI = new OpenAI({ apiKey: env.OPENAI_API_KEY });

interface ScriptGeneratorParams {
  patientProfile: string;
  therapistStyle: string;
  duration: number; // Number of turns
  userId: string; // Needed to fetch settings
}

export async function generateScript(params: ScriptGeneratorParams) {
  const { patientProfile, therapistStyle, duration, userId } = params;
  const startTime = performance.now();

  try {
    // Fetch User Settings
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const llmModel = (user?.preferences as any)?.llmModel || 'gpt-5.1';

    const prompt = `
      You are writing a script for a realistic therapy session.
      
      Context:
      Patient Profile: ${patientProfile}
      Therapist Style: ${therapistStyle}
      
      Generate a dialogue with exactly ${duration} turns (split evenly between Therapist and Patient).
      Each turn should be substantial (2-4 sentences).
      Format the output strictly as:
      Therapist: [Text]
      Patient: [Text]
      
      Do NOT include stage directions like (sighs). Just text.
    `;

    const { text } = await generateText({
      model: openai(llmModel),
      prompt,
    });

    const endTime = performance.now();
    const durationMs = endTime - startTime;

    return { 
      success: true, 
      transcript: text,
      metrics: {
        model: llmModel,
        durationMs: Math.round(durationMs)
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Script Generation Error:", error);
    return { success: false, error: error.message };
  }
}

export async function synthesizeAudio(transcript: string, userId: string) {
  const sessionName = `generated-session-${Date.now()}`;
  const s3Key = `generated-audio/${sessionName}.mp3`;
  const startTime = performance.now();

  try {
    // Fetch User Settings
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ttsModel = (user?.preferences as any)?.ttsModel || 'gpt-4o-mini-tts';

    // Parse transcript
    const turns: Array<{ speaker: 'Therapist' | 'Patient', text: string }> = [];
    const lines = transcript.split('\n');
    for (const line of lines) {
      if (line.startsWith('Therapist:')) {
        turns.push({ speaker: 'Therapist', text: line.replace('Therapist:', '').trim() });
      } else if (line.startsWith('Patient:')) {
        turns.push({ speaker: 'Patient', text: line.replace('Patient:', '').trim() });
      }
    }

    if (turns.length === 0) {
        throw new Error("No valid dialogue lines found in transcript. Ensure lines start with 'Therapist:' or 'Patient:'.");
    }

    // Synthesize Audio chunks in parallel batches for speed
    const BATCH_SIZE = 5;
    const audioBuffers: Buffer[] = [];

    for (let i = 0; i < turns.length; i += BATCH_SIZE) {
      const batch = turns.slice(i, i + BATCH_SIZE);

      // Process batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (turn) => {
          const voice = turn.speaker === 'Therapist' ? 'alloy' : 'echo';
          const mp3 = await directOpenAI.audio.speech.create({
            model: ttsModel,
            voice: voice,
            input: turn.text,
          });
          return Buffer.from(await mp3.arrayBuffer());
        })
      );

      audioBuffers.push(...batchResults);
    }

    // Concatenate all audio buffers (MP3 is a streaming format, so simple concatenation works)
    const mergedAudio = Buffer.concat(audioBuffers);

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: mergedAudio,
      ContentType: 'audio/mpeg',
    });
    await s3Client.send(putCommand);

    // Generate signed download URL (valid for 1 hour)
    const getCommand = new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: s3Key,
    });
    const downloadUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    const endTime = performance.now();
    const durationMs = endTime - startTime;

    return {
      success: true,
      fileUrl: downloadUrl,
      s3Key,
      metrics: {
        model: ttsModel,
        durationMs: Math.round(durationMs)
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Audio Synthesis Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Step 1: Generate script with patient context
 */
interface GenerateSessionScriptParams {
  userId: string;
  patientId?: string;
  scenario?: string;
  therapistStyle: string;
  duration: number;
}

interface GenerateSessionScriptResult {
  success: boolean;
  transcript?: string;
  error?: string;
  metrics?: { model: string; durationMs: number };
}

export async function generateSessionScript(
  params: GenerateSessionScriptParams
): Promise<GenerateSessionScriptResult> {
  const { userId, patientId, scenario, therapistStyle, duration } = params;
  const startTime = performance.now();

  try {
    // Parallel fetch: user settings and patient data
    const [user, patient] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
      }),
      patientId ? prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          sessions: {
            where: {
              OR: [
                { summary: { not: null } },
                { transcript: { not: null } }
              ]
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
              sessionDate: true,
              summary: true,
              transcript: true,
            }
          },
          treatmentPlan: {
            include: {
              versions: {
                orderBy: { version: 'desc' },
                take: 1,
              }
            }
          }
        }
      }) : null
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const llmModel = (user?.preferences as any)?.llmModel || 'gpt-4o-mini';

    // Build context from patient data
    let patientContext = '';
    let isInitialIntake = true;

    if (patient) {
      isInitialIntake = patient.sessions.length === 0;

      if (!isInitialIntake) {
        const sessionSummaries = patient.sessions
          .map((s, i) => {
            const date = s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : 'Unknown date';
            const content = s.summary || (s.transcript ? s.transcript.substring(0, 500) + '...' : 'No notes');
            return `Session ${patient.sessions.length - i} (${date}): ${content}`;
          })
          .reverse()
          .join('\n\n');

        const planContent = patient.treatmentPlan?.versions[0]?.content;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const planSummary = planContent ? JSON.stringify(planContent as any, null, 2) : 'No treatment plan yet';

        patientContext = `
PATIENT HISTORY:
Patient Name: ${patient.name}
Number of Previous Sessions: ${patient.sessions.length}

CURRENT TREATMENT PLAN:
${planSummary}

PREVIOUS SESSION SUMMARIES (most recent last):
${sessionSummaries}
`;
      } else {
        patientContext = `
PATIENT: ${patient.name}
This is an INITIAL INTAKE session. The therapist is meeting this patient for the first time.
`;
      }
    }

    const prompt = `
You are writing a script for a realistic therapy session.

SESSION TYPE: ${isInitialIntake ? 'INITIAL INTAKE - First meeting with patient' : 'FOLLOW-UP SESSION - Continuing therapeutic relationship'}
THERAPIST STYLE: ${therapistStyle}
${patientContext}
${scenario ? `SCENARIO/FOCUS FOR THIS SESSION: ${scenario}` : ''}

Generate a dialogue with exactly ${duration} turns (split evenly between Therapist and Patient).
${isInitialIntake ? `
For this initial intake:
- Therapist should introduce themselves and explain the therapeutic process
- Focus on building rapport and understanding the patient's background
- Gather information about presenting concerns, history, and goals
- Be warm, welcoming, and establish a safe space
` : `
For this follow-up session:
- Reference previous sessions and ongoing themes where appropriate
- Build on established therapeutic relationship
- Check in on progress with treatment goals
- Address any homework or between-session experiences
`}

Each turn should be substantial (2-4 sentences).
Format the output strictly as:
Therapist: [Text]
Patient: [Text]

Do NOT include stage directions like (sighs). Just text.
`;

    const { text: transcript } = await generateText({
      model: openai(llmModel),
      prompt,
    });

    const endTime = performance.now();

    return {
      success: true,
      transcript,
      metrics: {
        model: llmModel,
        durationMs: Math.round(endTime - startTime)
      }
    };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Script Generation Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Step 3: Save generated session to database
 */
interface SaveGeneratedSessionParams {
  userId: string;
  patientId?: string;
  transcript: string;
  s3Key?: string;
  autoGenerateSummary?: boolean;
}

interface SaveGeneratedSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export async function saveGeneratedSession(
  params: SaveGeneratedSessionParams
): Promise<SaveGeneratedSessionResult> {
  const { userId, patientId, transcript, s3Key, autoGenerateSummary } = params;

  try {
    const session = await prisma.session.create({
      data: {
        clinicianId: userId,
        patientId: patientId || null,
        transcript,
        s3Key: s3Key || null,
        status: patientId ? SessionStatus.PENDING : SessionStatus.UNASSIGNED,
        sessionDate: new Date(),
      }
    });

    // Auto-generate summary if enabled
    if (autoGenerateSummary && transcript) {
      const { generateSessionSummary } = await import('@/app/actions/sessions');
      await generateSessionSummary(session.id, userId);
    }

    return { success: true, sessionId: session.id };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Save Session Error:", error);
    return { success: false, error: error.message };
  }
}
