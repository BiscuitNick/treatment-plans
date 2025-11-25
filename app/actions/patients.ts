'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Schemas
const CreatePatientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  userId: z.string().min(1, "User ID is required"),
});

// Actions

export async function getPatients(userId: string) {
  if (!userId) throw new Error("User ID required");

  const patients = await prisma.patient.findMany({
    where: { clinicianId: userId },
    include: {
      sessions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      treatmentPlan: {
        select: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          }
        }
      }
    },
    orderBy: { updatedAt: 'desc' }
  });

  return patients.map(p => {
    const lastSession = p.sessions[0];
    const latestPlan = p.treatmentPlan?.versions[0];
    const riskScore = latestPlan ? (latestPlan.content as any).riskScore : 'N/A';

    return {
      id: p.id,
      name: p.name,
      status: p.status,
      lastSessionDate: lastSession?.createdAt || null,
      riskScore,
    };
  });
}

export async function getPatientById(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      sessions: {
        orderBy: { createdAt: 'desc' }
      },
      treatmentPlan: {
        include: {
          versions: {
            orderBy: { version: 'desc' }
          }
        }
      }
    }
  });
  
  return patient;
}

export async function createPatient(data: z.infer<typeof CreatePatientSchema>) {
  const { name, userId } = CreatePatientSchema.parse(data);

  try {
    const newPatient = await prisma.patient.create({
      data: {
        name,
        clinicianId: userId,
        status: 'ACTIVE',
      }
    });
    
    revalidatePath('/patients');
    return { success: true, patient: newPatient };
  } catch (error) {
    console.error("Create Patient Error:", error);
    return { success: false, error: "Failed to create patient" };
  }
}
