import OpenAI from 'openai';
import { env } from '@/lib/env';
import { RiskLevel, SafetyCheckResult } from '@/lib/types/safety';

// Lazy initialization or only if key exists (handled by env validation usually, but for tests we mock)
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY || "mock-key-for-build", // Fallback for build/test phases if env is bypassed
});

const HIGH_RISK_PATTERNS = [
  /suicide/i,
  /kill myself/i,
  /end my life/i,
  /hurt others/i,
  /bomb/i,
  /terrorist/i,
];

export function scanForKeywords(transcript: string): string[] {
  const flags: string[] = [];
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(transcript)) {
      flags.push(`Detected keyword pattern: ${pattern.source}`);
    }
  }
  return flags;
}

export async function analyzeRiskWithLLM(transcript: string): Promise<{ riskLevel: RiskLevel; reasoning: string }> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a safety content moderator for a mental health app. 
          Analyze the following transcript for risk of self-harm, violence, or abuse.
          Classify risk as:
          - HIGH: Immediate threat to life or safety (e.g., active suicide plan, intent to harm others).
          - MEDIUM: Concerning themes but no immediate threat (e.g., vague suicidal ideation without plan, severe distress).
          - LOW: No safety concerns found (e.g., general anxiety, sadness, daily stressors).
          
          Return ONLY a JSON object with the keys "riskLevel" (LOW/MEDIUM/HIGH) and "reasoning".`
        },
        {
          role: 'user',
          content: transcript
        }
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No content returned from LLM");

    const result = JSON.parse(content);
    
    // Validate result shape
    const riskLevel = Object.values(RiskLevel).includes(result.riskLevel) 
      ? (result.riskLevel as RiskLevel) 
      : RiskLevel.HIGH; // Default to high risk if output is malformed

    return {
      riskLevel,
      reasoning: result.reasoning || "No reasoning provided",
    };

  } catch (error) {
    console.error("LLM Risk Analysis Failed:", error);
    // Fail closed (safe) if LLM fails
    return {
      riskLevel: RiskLevel.HIGH,
      reasoning: "Automated safety check failed. Marking as high risk for manual review.",
    };
  }
}

export async function validateContent(transcript: string): Promise<SafetyCheckResult> {
  // 1. Fast Regex Check
  const keywordFlags = scanForKeywords(transcript);
  
  if (keywordFlags.length > 0) {
    return {
      safeToGenerate: false,
      riskLevel: RiskLevel.HIGH,
      riskFlags: keywordFlags,
      reasoning: "Immediate keyword match for high-risk content.",
    };
  }

  // 2. Deep Semantic Check (LLM)
  const llmResult = await analyzeRiskWithLLM(transcript);

  return {
    safeToGenerate: llmResult.riskLevel !== RiskLevel.HIGH, // Only block HIGH risk
    riskLevel: llmResult.riskLevel,
    riskFlags: llmResult.riskLevel === RiskLevel.LOW ? [] : [`LLM Classification: ${llmResult.riskLevel}`],
    reasoning: llmResult.reasoning,
  };
}
