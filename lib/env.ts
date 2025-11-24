import { z } from "zod";

const envSchema = z.object({
  AWS_REGION: z.string().min(1, "AWS_REGION is required"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  COGNITO_USER_POOL_ID: z.string().min(1, "COGNITO_USER_POOL_ID is required"),
  S3_BUCKET_NAME: z.string().min(1, "S3_BUCKET_NAME is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
});

// Only parse if we are NOT in a test environment (or mock it in tests)
// OR, we can export a function to parse so it's lazy.
// Ideally, we should mock process.env in Jest before this file is imported,
// BUT Next.js imports are tricky.

// Better approach for CLI/Test: Allow loose validation or default if SKIP_ENV_VALIDATION is set
const skipValidation = process.env.NODE_ENV === 'test' || process.env.SKIP_ENV_VALIDATION === 'true';

export const env = skipValidation 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ? (process.env as any) // UNSAFE: only for tests
  : envSchema.parse(process.env);