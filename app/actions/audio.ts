'use server'

import { openai } from '@ai-sdk/openai';
import OpenAI from 'openai';
import { generateText } from 'ai';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { env } from '@/lib/env';
import { prisma } from '@/lib/db';

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
