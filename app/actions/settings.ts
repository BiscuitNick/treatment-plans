'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const SettingsSchema = z.object({
  clinicalModality: z.enum(['CBT', 'DBT', 'ACT', 'Psychodynamic', 'Integrative']),
  userId: z.string(),
});

export async function updateUserSettings(data: z.infer<typeof SettingsSchema>) {
  const { clinicalModality, userId } = SettingsSchema.parse(data);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        preferences: {
          clinicalModality // Store in JSON field as per schema
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

  return {
    clinicalModality: (user?.preferences as any)?.clinicalModality || 'Integrative'
  };
}
