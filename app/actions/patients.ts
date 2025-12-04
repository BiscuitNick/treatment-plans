'use server'

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Schemas
const CreatePatientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  userId: z.string().min(1, "User ID is required"),
  age: z.number().int().min(0).max(150).optional(),
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say']).optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
});

const UpdatePatientSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  age: z.number().int().min(0).max(150).nullable().optional(),
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say']).nullable().optional(),
  diagnosis: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          sessionDate: true,
          summary: true,
          transcript: true,
          createdAt: true,
        }
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
  const { name, userId, age, gender, diagnosis, notes } = CreatePatientSchema.parse(data);

  try {
    const newPatient = await prisma.patient.create({
      data: {
        name,
        clinicianId: userId,
        status: 'ACTIVE',
        age,
        gender,
        diagnosis,
        notes,
      }
    });

    revalidatePath('/patients');
    revalidatePath('/sessions');
    return { success: true, patient: newPatient };
  } catch (error) {
    console.error("Create Patient Error:", error);
    return { success: false, error: "Failed to create patient" };
  }
}

export async function updatePatient(id: string, userId: string, data: z.infer<typeof UpdatePatientSchema>) {
  const validatedData = UpdatePatientSchema.parse(data);

  try {
    // Verify ownership
    const existing = await prisma.patient.findFirst({
      where: { id, clinicianId: userId },
    });

    if (!existing) {
      return { success: false, error: "Patient not found" };
    }

    const updatedPatient = await prisma.patient.update({
      where: { id },
      data: validatedData,
    });

    revalidatePath('/patients');
    revalidatePath('/sessions');
    return { success: true, patient: updatedPatient };
  } catch (error) {
    console.error("Update Patient Error:", error);
    return { success: false, error: "Failed to update patient" };
  }
}

export async function getPatientsForSelect(userId: string) {
  if (!userId) throw new Error("User ID required");

  const patients = await prisma.patient.findMany({
    where: {
      clinicianId: userId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' }
  });

  return patients;
}
