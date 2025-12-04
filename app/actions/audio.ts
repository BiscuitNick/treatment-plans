'use server'

import { openai } from '@ai-sdk/openai';
import OpenAI from 'openai';
import { generateText } from 'ai';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
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
  const sessionName = `custom-session-${Date.now()}`;
  const outputDir = path.resolve('./public/generated-audio');
  const outputFile = path.join(outputDir, `${sessionName}.mp3`);
  const tempDir = path.resolve(`./temp_audio_${sessionName}`);
  const startTime = performance.now();

  try {
    // Fetch User Settings
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { preferences: true }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ttsModel = (user?.preferences as any)?.ttsModel || 'gpt-4o-mini-tts';

    // Ensure directories exist
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

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

    // Synthesize Audio
    const audioFiles: string[] = [];
    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const voice = turn.speaker === 'Therapist' ? 'alloy' : 'echo';
      const filePath = path.join(tempDir, `part_${i.toString().padStart(3, '0')}.mp3`);

      const mp3 = await directOpenAI.audio.speech.create({
        model: ttsModel,
        voice: voice,
        input: turn.text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);
      audioFiles.push(filePath);
    }

    // Merge Audio
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();
      audioFiles.forEach(file => command.input(file));
      command
        .on('error', reject)
        .on('end', () => resolve())
        .mergeToFile(outputFile, tempDir);
    });

    // Cleanup temp files
    fs.rmSync(tempDir, { recursive: true, force: true });

    const endTime = performance.now();
    const durationMs = endTime - startTime;

    return { 
      success: true, 
      fileUrl: `/generated-audio/${sessionName}.mp3`,
      metrics: {
        model: ttsModel,
        durationMs: Math.round(durationMs)
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Audio Synthesis Error:", error);
    // Cleanup on error
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    return { success: false, error: error.message };
  }
}

/**
 * Generate a synthetic therapy session with optional patient context.
 * Saves the session to the database.
 */
interface GenerateSyntheticSessionParams {
  userId: string;
  patientId?: string;
  scenario?: string;
  therapistStyle: string;
  duration: number;
  outputType: 'text' | 'audio';
  autoGenerateAudio: boolean;
  saveToSessions: boolean;
  autoGenerateSummary?: boolean;
}

interface GenerateSyntheticSessionResult {
  success: boolean;
  sessionId?: string;
  transcript?: string;
  audioUrl?: string;
  error?: string;
  metrics?: {
    script?: { model: string; durationMs: number };
    audio?: { model: string; durationMs: number };
  };
}

export async function generateSyntheticSession(
  params: GenerateSyntheticSessionParams
): Promise<GenerateSyntheticSessionResult> {
  const { userId, patientId, scenario, therapistStyle, duration, outputType, saveToSessions, autoGenerateSummary } = params;
  const metrics: GenerateSyntheticSessionResult['metrics'] = {};

  try {
    // Fetch User Settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true }
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const llmModel = (user?.preferences as any)?.llmModel || 'gpt-4o';

    // Build context from patient data if provided
    let patientContext = '';
    let isInitialIntake = true;

    if (patientId) {
      const patient = await prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          sessions: {
            where: { transcript: { not: null } },
            orderBy: { createdAt: 'desc' },
            take: 25,
            select: {
              sessionDate: true,
              transcript: true,
              progressNote: true,
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
      });

      if (patient) {
        isInitialIntake = patient.sessions.length === 0;

        if (!isInitialIntake) {
          // Build context from previous sessions
          const sessionSummaries = patient.sessions
            .map((s, i) => {
              const date = s.sessionDate ? new Date(s.sessionDate).toLocaleDateString() : 'Unknown date';
              const summary = s.progressNote || (s.transcript ? s.transcript.substring(0, 500) + '...' : 'No notes');
              return `Session ${patient.sessions.length - i} (${date}): ${summary}`;
            })
            .reverse()
            .join('\n\n');

          // Get treatment plan content
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
    }

    // Generate script
    const scriptStartTime = performance.now();

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

    const scriptEndTime = performance.now();
    metrics.script = {
      model: llmModel,
      durationMs: Math.round(scriptEndTime - scriptStartTime)
    };

    // Generate audio if requested
    let audioUrl: string | undefined;
    if (outputType === 'audio') {
      const audioResult = await synthesizeAudio(transcript, userId);
      if (audioResult.success && audioResult.fileUrl) {
        audioUrl = audioResult.fileUrl;
        metrics.audio = audioResult.metrics;
      } else {
        return { success: false, error: audioResult.error || 'Audio synthesis failed' };
      }
    }

    // Conditionally save session to database
    let sessionId: string | undefined;
    if (saveToSessions) {
      const now = new Date();

      const session = await prisma.session.create({
        data: {
          clinicianId: userId,
          patientId: patientId || null,
          transcript,
          audioUrl: audioUrl || null,
          status: patientId ? SessionStatus.PENDING : SessionStatus.UNASSIGNED,
          sessionDate: now,
        }
      });
      sessionId = session.id;

      // Auto-generate summary if enabled
      if (autoGenerateSummary && transcript) {
        const { generateSessionSummary } = await import('@/app/actions/sessions');
        await generateSessionSummary(session.id, userId);
      }
    }

    return {
      success: true,
      sessionId,
      transcript,
      audioUrl,
      metrics,
    };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Synthetic Session Generation Error:", error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}
