import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import ffmpeg from 'fluent-ffmpeg';
import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Load env vars
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const aiSdkOpenAI = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OUTPUT_FILE = path.resolve('./public/long-session.mp3');
const TEMP_DIR = path.resolve('./temp_audio');

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR);
}

async function generateLongTranscript(): Promise<Array<{ speaker: 'Therapist' | 'Patient', text: string }>> {
  console.log("📝 Generating long-form transcript (~3000 words)...");
  
  const turns: Array<{ speaker: 'Therapist' | 'Patient', text: string }> = [];
  let conversationHistory = "";

  // We will generate in 3 chunks to reach length without context limits issues
  for (let i = 0; i < 3; i++) {
    console.log(`   - Generating chunk ${i + 1}/3...`);
    
    const prompt = `
      You are writing a script for a realistic 20-minute therapy session.
      This is part ${i + 1} of 3.
      
      Context:
      The patient, Alex, is dealing with severe burnout and impostor syndrome at a new tech job.
      The therapist, Dr. Sarah, is using CBT techniques.
      
      ${conversationHistory ? `Previous conversation context: ${conversationHistory.slice(-500)}...` : "Start from the beginning of the session."} 
      
      Generate a dialogue with at least 20 turns (10 each). 
      Each turn should be substantial (2-4 sentences).
      Format the output strictly as:
      Therapist: [Text]
      Patient: [Text]
      
      Do NOT include stage directions like (sighs). Just text.
    `;

    const { text } = await generateText({
      model: aiSdkOpenAI('gpt-4o'),
      prompt,
    });

    conversationHistory += text + "\n";

    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('Therapist:')) {
        turns.push({ speaker: 'Therapist', text: line.replace('Therapist:', '').trim() });
      } else if (line.startsWith('Patient:')) {
        turns.push({ speaker: 'Patient', text: line.replace('Patient:', '').trim() });
      }
    }
  }

  console.log(`✅ Transcript generated: ${turns.length} turns.`);
  return turns;
}

async function synthesizeAudio(turns: Array<{ speaker: 'Therapist' | 'Patient', text: string }>) {
  console.log("🗣️  Synthesizing audio...");
  const files: string[] = [];

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i];
    const voice = turn.speaker === 'Therapist' ? 'alloy' : 'echo'; // Alloy (Therapist), Echo (Patient)
    const filePath = path.join(TEMP_DIR, `part_${i.toString().padStart(3, '0')}.mp3`);
    
    process.stdout.write(`   - Processing turn ${i + 1}/${turns.length}\r`);

    try {
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice,
        input: turn.text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      await fs.promises.writeFile(filePath, buffer);
      files.push(filePath);
    } catch (error) {
      console.error(`Failed to synthesize turn ${i}:`, error);
    }
  }
  console.log(`\n✅ Audio synthesis complete. ${files.length} files created.`);
  return files;
}

async function mergeAudioFiles(files: string[]) {
  console.log("💿 Merging audio files with ffmpeg...");
  
  return new Promise<void>((resolve, reject) => {
    const command = ffmpeg();

    files.forEach(file => {
      command.input(file);
    });

    command
      .on('error', (err) => {
        console.error('An error occurred: ' + err.message);
        reject(err);
      })
      .on('end', () => {
        console.log('✅ Merging finished!');
        resolve();
      })
      .mergeToFile(OUTPUT_FILE, TEMP_DIR);
  });
}

async function main() {
  try {
    const turns = await generateLongTranscript();
    const audioFiles = await synthesizeAudio(turns);
    await mergeAudioFiles(audioFiles);
    
    console.log(`🎉 Success! Long session audio saved to: ${OUTPUT_FILE}`);
    
    // Cleanup temp files
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  } catch (error) {
    console.error("Script failed:", error);
  }
}

main();
