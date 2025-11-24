import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load env vars from .env file
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SPEECH_FILE = path.resolve('./public/demo-session.mp3');

async function main() {
  console.log("Generating demo audio...");

  const text = `
    Hi, I've been feeling really overwhelmed lately. 
    Work has been piling up, and I feel like I can't catch my breath.
    I start sweating and my heart races whenever I think about the presentation next week.
    I know I should prepare, but I just freeze up.
    It's affecting my sleep too. I wake up at 3 AM and can't fall back asleep.
  `.trim();

  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(SPEECH_FILE, buffer);
    console.log(`Successfully generated demo audio at ${SPEECH_FILE}`);
  } catch (error) {
    console.error("Error generating audio:", error);
    process.exit(1);
  }
}

main();
