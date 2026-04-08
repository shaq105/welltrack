import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function getMedications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const medications = await prisma.medication.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ medications });
  } catch (err) {
    next(err);
  }
}

export async function createMedication(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, dosage, frequency } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Bad Request', message: 'name is required and must be a non-empty string' });
      return;
    }

    if (dosage !== undefined && typeof dosage !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'dosage must be a string' });
      return;
    }

    if (frequency !== undefined && typeof frequency !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'frequency must be a string' });
      return;
    }

    const medication = await prisma.medication.create({
      data: {
        userId,
        name: name.trim(),
        dosage: dosage ?? null,
        frequency: frequency ?? null,
      },
    });

    res.status(201).json({ medication });
  } catch (err) {
    next(err);
  }
}

export async function updateMedication(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { name, dosage, frequency, isActive } = req.body;

    const medication = await prisma.medication.findUnique({ where: { id } });

    if (!medication) {
      res.status(404).json({ error: 'Not Found', message: 'Medication not found' });
      return;
    }

    if (medication.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only update your own medications' });
      return;
    }

    if (name === undefined && dosage === undefined && frequency === undefined && isActive === undefined) {
      res.status(400).json({ error: 'Bad Request', message: 'At least one field is required' });
      return;
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ error: 'Bad Request', message: 'name must be a non-empty string' });
      return;
    }

    if (dosage !== undefined && dosage !== null && typeof dosage !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'dosage must be a string' });
      return;
    }

    if (frequency !== undefined && frequency !== null && typeof frequency !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'frequency must be a string' });
      return;
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'Bad Request', message: 'isActive must be a boolean' });
      return;
    }

    const data: { name?: string; dosage?: string | null; frequency?: string | null; isActive?: boolean } = {};
    if (name !== undefined) data.name = name.trim();
    if (dosage !== undefined) data.dosage = dosage;
    if (frequency !== undefined) data.frequency = frequency;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.medication.update({ where: { id }, data });

    res.status(200).json({ medication: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteMedication(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const medication = await prisma.medication.findUnique({ where: { id } });

    if (!medication) {
      res.status(404).json({ error: 'Not Found', message: 'Medication not found' });
      return;
    }

    if (medication.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own medications' });
      return;
    }

    await prisma.medication.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
