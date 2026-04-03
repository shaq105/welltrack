import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { SymptomCategory } from '../generated/prisma/enums';

const VALID_CATEGORIES: SymptomCategory[] = [
  'pain',
  'neurological',
  'digestive',
  'respiratory',
  'cardiovascular',
  'mental',
  'other',
];

export async function getSymptoms(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const symptoms = await prisma.symptom.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ userId: 'asc' }, { name: 'asc' }],
    });

    res.status(200).json({ symptoms });
  } catch (err) {
    next(err);
  }
}

export async function createSymptom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, category } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'name is required and must be a string' });
      return;
    }

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
      return;
    }

    const symptom = await prisma.symptom.create({
      data: {
        userId,
        name: name.trim(),
        category: category ?? 'other',
      },
    });

    res.status(201).json({ symptom });
  } catch (err) {
    next(err);
  }
}

export async function updateSymptom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { name, category, isActive } = req.body;

    const symptom = await prisma.symptom.findUnique({ where: { id } });

    if (!symptom) {
      res.status(404).json({ error: 'Not Found', message: 'Symptom not found' });
      return;
    }

    if (symptom.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only update your own symptoms' });
      return;
    }

    if (name !== undefined && typeof name !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'name must be a string' });
      return;
    }

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `category must be one of: ${VALID_CATEGORIES.join(', ')}`,
      });
      return;
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'Bad Request', message: 'isActive must be a boolean' });
      return;
    }

    if (name === undefined && category === undefined && isActive === undefined) {
      res.status(400).json({ error: 'Bad Request', message: 'At least one field is required' });
      return;
    }

    const data: { name?: string; category?: SymptomCategory; isActive?: boolean } = {};
    if (name !== undefined) data.name = name.trim();
    if (category !== undefined) data.category = category;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.symptom.update({ where: { id }, data });

    res.status(200).json({ symptom: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteSymptom(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const symptom = await prisma.symptom.findUnique({ where: { id } });

    if (!symptom) {
      res.status(404).json({ error: 'Not Found', message: 'Symptom not found' });
      return;
    }

    if (symptom.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own symptoms' });
      return;
    }

    await prisma.symptom.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
