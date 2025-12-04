// Mock Prisma before importing
jest.mock('@/lib/db', () => ({
  prisma: {
    patient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  getPatientsForSelect,
} from './patients';

describe('Patient Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPatients', () => {
    it('should throw error if no userId provided', async () => {
      await expect(getPatients('')).rejects.toThrow('User ID required');
    });

    it('should fetch patients for a user', async () => {
      const mockPatients = [
        {
          id: 'patient-1',
          name: 'John Doe',
          status: 'ACTIVE',
          updatedAt: new Date(),
          sessions: [{ createdAt: new Date() }],
          treatmentPlan: {
            versions: [{ content: { riskScore: 'LOW' } }],
          },
        },
      ];

      (prisma.patient.findMany as jest.Mock).mockResolvedValue(mockPatients);

      const result = await getPatients('user-123');

      expect(prisma.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicianId: 'user-123' },
        })
      );
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
      expect(result[0].riskScore).toBe('LOW');
    });

    it('should return N/A for riskScore if no plan exists', async () => {
      const mockPatients = [
        {
          id: 'patient-1',
          name: 'Jane Doe',
          status: 'ACTIVE',
          sessions: [],
          treatmentPlan: null,
        },
      ];

      (prisma.patient.findMany as jest.Mock).mockResolvedValue(mockPatients);

      const result = await getPatients('user-123');

      expect(result[0].riskScore).toBe('N/A');
      expect(result[0].lastSessionDate).toBeNull();
    });
  });

  describe('getPatientById', () => {
    it('should fetch patient by ID with sessions and plan', async () => {
      const mockPatient = {
        id: 'patient-1',
        name: 'John Doe',
        sessions: [],
        treatmentPlan: {
          versions: [],
        },
      };

      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(mockPatient);

      const result = await getPatientById('patient-1');

      expect(prisma.patient.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'patient-1' },
        })
      );
      expect(result).toEqual(mockPatient);
    });

    it('should return null if patient not found', async () => {
      (prisma.patient.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getPatientById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('createPatient', () => {
    it('should create patient with valid data', async () => {
      const mockPatient = {
        id: 'patient-new',
        name: 'New Patient',
        clinicianId: 'user-123',
        status: 'ACTIVE',
      };

      (prisma.patient.create as jest.Mock).mockResolvedValue(mockPatient);

      const result = await createPatient({
        name: 'New Patient',
        userId: 'user-123',
      });

      expect(result.success).toBe(true);
      expect(result.patient).toEqual(mockPatient);
      expect(revalidatePath).toHaveBeenCalledWith('/patients');
      expect(revalidatePath).toHaveBeenCalledWith('/sessions');
    });

    it('should create patient with all optional fields', async () => {
      const mockPatient = {
        id: 'patient-new',
        name: 'New Patient',
        clinicianId: 'user-123',
        status: 'ACTIVE',
        age: 35,
        gender: 'Female',
        diagnosis: 'Anxiety',
        notes: 'Some notes',
      };

      (prisma.patient.create as jest.Mock).mockResolvedValue(mockPatient);

      const result = await createPatient({
        name: 'New Patient',
        userId: 'user-123',
        age: 35,
        gender: 'Female',
        diagnosis: 'Anxiety',
        notes: 'Some notes',
      });

      expect(result.success).toBe(true);
      expect(prisma.patient.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Patient',
          age: 35,
          gender: 'Female',
        }),
      });
    });

    it('should return error if database fails', async () => {
      (prisma.patient.create as jest.Mock).mockRejectedValue(
        new Error('DB Error')
      );

      const result = await createPatient({
        name: 'New Patient',
        userId: 'user-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create patient');
    });
  });

  describe('updatePatient', () => {
    it('should update patient with valid data', async () => {
      const existingPatient = {
        id: 'patient-1',
        clinicianId: 'user-123',
      };
      const updatedPatient = {
        id: 'patient-1',
        name: 'Updated Name',
        status: 'ACTIVE',
      };

      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(existingPatient);
      (prisma.patient.update as jest.Mock).mockResolvedValue(updatedPatient);

      const result = await updatePatient('patient-1', 'user-123', {
        name: 'Updated Name',
      });

      expect(result.success).toBe(true);
      expect(result.patient).toEqual(updatedPatient);
      expect(revalidatePath).toHaveBeenCalled();
    });

    it('should return error if patient not found', async () => {
      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await updatePatient('non-existent', 'user-123', {
        name: 'Updated',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Patient not found');
    });

    it('should update patient status', async () => {
      const existingPatient = { id: 'patient-1', clinicianId: 'user-123' };
      const updatedPatient = { id: 'patient-1', status: 'INACTIVE' };

      (prisma.patient.findFirst as jest.Mock).mockResolvedValue(existingPatient);
      (prisma.patient.update as jest.Mock).mockResolvedValue(updatedPatient);

      const result = await updatePatient('patient-1', 'user-123', {
        status: 'INACTIVE',
      });

      expect(result.success).toBe(true);
      expect(prisma.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-1' },
        data: { status: 'INACTIVE' },
      });
    });
  });

  describe('getPatientsForSelect', () => {
    it('should throw error if no userId provided', async () => {
      await expect(getPatientsForSelect('')).rejects.toThrow('User ID required');
    });

    it('should fetch only active patients for select', async () => {
      const mockPatients = [
        { id: 'patient-1', name: 'Alice' },
        { id: 'patient-2', name: 'Bob' },
      ];

      (prisma.patient.findMany as jest.Mock).mockResolvedValue(mockPatients);

      const result = await getPatientsForSelect('user-123');

      expect(prisma.patient.findMany).toHaveBeenCalledWith({
        where: {
          clinicianId: 'user-123',
          status: 'ACTIVE',
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockPatients);
    });
  });
});
