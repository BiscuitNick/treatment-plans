'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SettingsSchema = z.object({
  clinicalModality: z.enum(['CBT', 'DBT', 'ACT', 'Psychodynamic', 'Integrative']),
  llmModel: z.enum(['gpt-5.1', 'gpt-5-mini', 'gpt-4o']),
  ttsModel: z.enum(['gpt-4o-mini-tts', 'tts-1']),
  userId: z.string(),
});

export async function updateUserSettings(data: z.infer<typeof SettingsSchema>) {
  const { clinicalModality, llmModel, ttsModel, userId } = SettingsSchema.parse(data);

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
          ttsModel
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
    llmModel: prefs.llmModel || 'gpt-5.1', // Default to latest
    ttsModel: prefs.ttsModel || 'gpt-4o-mini-tts' // Default to best quality/speed balance
  };
}