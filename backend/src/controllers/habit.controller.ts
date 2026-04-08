import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { TrackingType } from '../generated/prisma/enums';

const VALID_TRACKING_TYPES: TrackingType[] = ['boolean', 'numeric', 'duration'];

export async function getHabits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const habits = await prisma.habit.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: [{ userId: 'asc' }, { name: 'asc' }],
    });

    res.status(200).json({ habits });
  } catch (err) {
    next(err);
  }
}

export async function createHabit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, trackingType, unit } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      res.status(400).json({ error: 'Bad Request', message: 'name is required and must be a non-empty string' });
      return;
    }

    if (!trackingType || !VALID_TRACKING_TYPES.includes(trackingType)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `trackingType is required and must be one of: ${VALID_TRACKING_TYPES.join(', ')}`,
      });
      return;
    }

    if (unit !== undefined && typeof unit !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'unit must be a string' });
      return;
    }

    const habit = await prisma.habit.create({
      data: {
        userId,
        name: name.trim(),
        trackingType,
        unit: unit ?? null,
      },
    });

    res.status(201).json({ habit });
  } catch (err) {
    next(err);
  }
}

export async function updateHabit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { name, unit, isActive } = req.body;

    const habit = await prisma.habit.findUnique({ where: { id } });

    if (!habit) {
      res.status(404).json({ error: 'Not Found', message: 'Habit not found' });
      return;
    }

    if (habit.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only update your own habits' });
      return;
    }

    if (name === undefined && unit === undefined && isActive === undefined) {
      res.status(400).json({ error: 'Bad Request', message: 'At least one field is required' });
      return;
    }

    if (name !== undefined && (typeof name !== 'string' || name.trim() === '')) {
      res.status(400).json({ error: 'Bad Request', message: 'name must be a non-empty string' });
      return;
    }

    if (unit !== undefined && unit !== null && typeof unit !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'unit must be a string' });
      return;
    }

    if (isActive !== undefined && typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'Bad Request', message: 'isActive must be a boolean' });
      return;
    }

    const data: { name?: string; unit?: string | null; isActive?: boolean } = {};
    if (name !== undefined) data.name = name.trim();
    if (unit !== undefined) data.unit = unit;
    if (isActive !== undefined) data.isActive = isActive;

    const updated = await prisma.habit.update({ where: { id }, data });

    res.status(200).json({ habit: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteHabit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const habit = await prisma.habit.findUnique({ where: { id } });

    if (!habit) {
      res.status(404).json({ error: 'Not Found', message: 'Habit not found' });
      return;
    }

    if (habit.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own habits' });
      return;
    }

    await prisma.habit.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
