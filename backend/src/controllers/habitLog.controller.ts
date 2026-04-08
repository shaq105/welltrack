import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function getHabitLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const where: {
      userId: string;
      loggedAt?: { gte?: Date; lte?: Date };
    } = { userId };

    if (startDate || endDate) {
      where.loggedAt = {};
      if (startDate) {
        const start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          res.status(400).json({ error: 'Bad Request', message: 'startDate must be a valid ISO date' });
          return;
        }
        where.loggedAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          res.status(400).json({ error: 'Bad Request', message: 'endDate must be a valid ISO date' });
          return;
        }
        where.loggedAt.lte = end;
      }
    }

    const habitLogs = await prisma.habitLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
      include: { habit: { select: { name: true, trackingType: true, unit: true } } },
    });

    res.status(200).json({ habitLogs });
  } catch (err) {
    next(err);
  }
}

export async function createHabitLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { habitId, valueBoolean, valueNumeric, valueDuration, notes, loggedAt } = req.body;

    if (!habitId || typeof habitId !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'habitId is required' });
      return;
    }

    const habit = await prisma.habit.findUnique({ where: { id: habitId } });

    if (!habit) {
      res.status(404).json({ error: 'Not Found', message: 'Habit not found' });
      return;
    }

    if (habit.userId !== null && habit.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only log your own habits' });
      return;
    }

    const data: {
      userId: string;
      habitId: string;
      valueBoolean?: boolean;
      valueNumeric?: number;
      valueDuration?: number;
      notes?: string | null;
      loggedAt?: Date;
    } = { userId, habitId };

    if (habit.trackingType === 'boolean') {
      if (valueBoolean === undefined || valueBoolean === null) {
        res.status(400).json({ error: 'Bad Request', message: 'valueBoolean is required for boolean tracking type' });
        return;
      }
      if (typeof valueBoolean !== 'boolean') {
        res.status(400).json({ error: 'Bad Request', message: 'valueBoolean must be a boolean' });
        return;
      }
      data.valueBoolean = valueBoolean;
    } else if (habit.trackingType === 'numeric') {
      if (valueNumeric === undefined || valueNumeric === null) {
        res.status(400).json({ error: 'Bad Request', message: 'valueNumeric is required for numeric tracking type' });
        return;
      }
      if (typeof valueNumeric !== 'number') {
        res.status(400).json({ error: 'Bad Request', message: 'valueNumeric must be a number' });
        return;
      }
      data.valueNumeric = valueNumeric;
    } else if (habit.trackingType === 'duration') {
      if (valueDuration === undefined || valueDuration === null) {
        res.status(400).json({ error: 'Bad Request', message: 'valueDuration is required for duration tracking type' });
        return;
      }
      if (typeof valueDuration !== 'number' || !Number.isInteger(valueDuration)) {
        res.status(400).json({ error: 'Bad Request', message: 'valueDuration must be an integer' });
        return;
      }
      data.valueDuration = valueDuration;
    }

    if (notes !== undefined && typeof notes !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'notes must be a string' });
      return;
    }
    if (notes !== undefined) data.notes = notes;

    if (loggedAt !== undefined) {
      const parsedLoggedAt = new Date(loggedAt);
      if (isNaN(parsedLoggedAt.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'loggedAt must be a valid ISO date' });
        return;
      }
      data.loggedAt = parsedLoggedAt;
    }

    const habitLog = await prisma.habitLog.create({ data });

    res.status(201).json({ habitLog });
  } catch (err) {
    next(err);
  }
}

export async function updateHabitLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { valueBoolean, valueNumeric, valueDuration, notes, loggedAt } = req.body;

    const habitLog = await prisma.habitLog.findUnique({ where: { id } });

    if (!habitLog) {
      res.status(404).json({ error: 'Not Found', message: 'Habit log not found' });
      return;
    }

    if (habitLog.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only update your own habit logs' });
      return;
    }

    if (
      valueBoolean === undefined &&
      valueNumeric === undefined &&
      valueDuration === undefined &&
      notes === undefined &&
      loggedAt === undefined
    ) {
      res.status(400).json({ error: 'Bad Request', message: 'At least one field is required' });
      return;
    }

    if (valueBoolean !== undefined && typeof valueBoolean !== 'boolean') {
      res.status(400).json({ error: 'Bad Request', message: 'valueBoolean must be a boolean' });
      return;
    }

    if (valueNumeric !== undefined && typeof valueNumeric !== 'number') {
      res.status(400).json({ error: 'Bad Request', message: 'valueNumeric must be a number' });
      return;
    }

    if (valueDuration !== undefined && (typeof valueDuration !== 'number' || !Number.isInteger(valueDuration))) {
      res.status(400).json({ error: 'Bad Request', message: 'valueDuration must be an integer' });
      return;
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'notes must be a string' });
      return;
    }

    let parsedLoggedAt: Date | undefined;
    if (loggedAt !== undefined) {
      parsedLoggedAt = new Date(loggedAt);
      if (isNaN(parsedLoggedAt.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'loggedAt must be a valid ISO date' });
        return;
      }
    }

    const data: {
      valueBoolean?: boolean;
      valueNumeric?: number;
      valueDuration?: number;
      notes?: string | null;
      loggedAt?: Date;
    } = {};
    if (valueBoolean !== undefined) data.valueBoolean = valueBoolean;
    if (valueNumeric !== undefined) data.valueNumeric = valueNumeric;
    if (valueDuration !== undefined) data.valueDuration = valueDuration;
    if (notes !== undefined) data.notes = notes;
    if (parsedLoggedAt !== undefined) data.loggedAt = parsedLoggedAt;

    const updated = await prisma.habitLog.update({ where: { id }, data });

    res.status(200).json({ habitLog: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteHabitLog(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const habitLog = await prisma.habitLog.findUnique({ where: { id } });

    if (!habitLog) {
      res.status(404).json({ error: 'Not Found', message: 'Habit log not found' });
      return;
    }

    if (habitLog.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own habit logs' });
      return;
    }

    await prisma.habitLog.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
