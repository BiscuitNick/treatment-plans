'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { REVIEW_FREQUENCY_OPTIONS, type ReviewFrequency } from '@/lib/constants/review-frequency';

const SettingsSchema = z.object({
  clinicalModality: z.enum(['CBT', 'DBT', 'ACT', 'Psychodynamic', 'Integrative']),
  llmModel: z.enum(['gpt-5.1', 'gpt-5-mini', 'gpt-4o']),
  ttsModel: z.enum(['gpt-4o-mini-tts', 'tts-1']),
  sttModel: z.enum(['whisper-1', 'gpt-4o-mini-transcribe', 'gpt-4o-transcribe']),
  reviewFrequency: z.enum(['90_DAY', '30_DAY', '2_WEEK', '1_WEEK', '1_DAY', 'EVERY_SESSION']),
  userId: z.string(),
});

export async function updateUserSettings(data: z.infer<typeof SettingsSchema>) {
  const { clinicalModality, llmModel, ttsModel, sttModel, reviewFrequency, userId } = SettingsSchema.parse(data);

  try {
    // Fetch existing preferences to merge
    const user = await prisma.user.findUnique({ where: { id: userId } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentPreferences = (user?.preferences as any) || {};

    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          ...currentPreferences,
          clinicalModality,
          llmModel,
          ttsModel,
          sttModel,
          reviewFrequency
        }
      }
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error("Update Settings Error:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function getUserSettings(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferences: true }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prefs = (user?.preferences as any) || {};

  return {
    clinicalModality: prefs.clinicalModality || 'Integrative',
    llmModel: prefs.llmModel || 'gpt-5.1',
    ttsModel: prefs.ttsModel || 'gpt-4o-mini-tts',
    sttModel: prefs.sttModel || 'whisper-1',
    reviewFrequency: (prefs.reviewFrequency || '90_DAY') as ReviewFrequency,
  };
}

/**
 * Get the review frequency in days for a user
 */
export async function getReviewFrequencyDays(userId: string): Promise<number> {
  const settings = await getUserSettings(userId);
  return REVIEW_FREQUENCY_OPTIONS[settings.reviewFrequency].days;
}