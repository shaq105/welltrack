import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function getMoodLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const moodLogs = await prisma.moodLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
    });

    res.status(200).json({ moodLogs });
  } catch (err) {
    next(err);
  }
}

function validateScore(value: unknown, fieldName: string): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    return `${fieldName} must be an integer between 1 and 5`;
  }
  return null;
}

export async function createMoodLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { moodScore, energyLevel, stressLevel, notes, loggedAt } = req.body;

    if (moodScore === undefined) {
      res.status(400).json({ error: 'Bad Request', message: 'moodScore is required' });
      return;
    }

    const moodScoreError = validateScore(moodScore, 'moodScore');
    if (moodScoreError) {
      res.status(400).json({ error: 'Bad Request', message: moodScoreError });
      return;
    }

    if (energyLevel !== undefined) {
      const energyError = validateScore(energyLevel, 'energyLevel');
      if (energyError) {
        res.status(400).json({ error: 'Bad Request', message: energyError });
        return;
      }
    }

    if (stressLevel !== undefined) {
      const stressError = validateScore(stressLevel, 'stressLevel');
      if (stressError) {
        res.status(400).json({ error: 'Bad Request', message: stressError });
        return;
      }
    }

    if (notes !== undefined && typeof notes !== 'string') {
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

    const moodLog = await prisma.moodLog.create({
      data: {
        userId,
        moodScore,
        energyLevel,
        stressLevel,
        notes,
        ...(parsedLoggedAt && { loggedAt: parsedLoggedAt }),
      },
    });

    res.status(201).json({ moodLog });
  } catch (err) {
    next(err);
  }
}

export async function updateMoodLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { moodScore, energyLevel, stressLevel, notes, loggedAt } = req.body;

    const moodLog = await prisma.moodLog.findUnique({ where: { id } });

    if (!moodLog) {
      res.status(404).json({ error: 'Not Found', message: 'Mood log not found' });
      return;
    }

    if (moodLog.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only update your own mood logs' });
      return;
    }

    if (moodScore === undefined && energyLevel === undefined && stressLevel === undefined && notes === undefined && loggedAt === undefined) {
      res.status(400).json({ error: 'Bad Request', message: 'At least one field is required' });
      return;
    }

    if (moodScore !== undefined) {
      const moodScoreError = validateScore(moodScore, 'moodScore');
      if (moodScoreError) {
        res.status(400).json({ error: 'Bad Request', message: moodScoreError });
        return;
      }
    }

    if (energyLevel !== undefined) {
      const energyError = validateScore(energyLevel, 'energyLevel');
      if (energyError) {
        res.status(400).json({ error: 'Bad Request', message: energyError });
        return;
      }
    }

    if (stressLevel !== undefined) {
      const stressError = validateScore(stressLevel, 'stressLevel');
      if (stressError) {
        res.status(400).json({ error: 'Bad Request', message: stressError });
        return;
      }
    }

    if (notes !== undefined && typeof notes !== 'string') {
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
      moodScore?: number;
      energyLevel?: number | null;
      stressLevel?: number | null;
      notes?: string | null;
      loggedAt?: Date;
    } = {};
    if (moodScore !== undefined) data.moodScore = moodScore;
    if (energyLevel !== undefined) data.energyLevel = energyLevel;
    if (stressLevel !== undefined) data.stressLevel = stressLevel;
    if (notes !== undefined) data.notes = notes;
    if (parsedLoggedAt !== undefined) data.loggedAt = parsedLoggedAt;

    const updated = await prisma.moodLog.update({ where: { id }, data });

    res.status(200).json({ moodLog: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteMoodLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const moodLog = await prisma.moodLog.findUnique({ where: { id } });

    if (!moodLog) {
      res.status(404).json({ error: 'Not Found', message: 'Mood log not found' });
      return;
    }

    if (moodLog.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own mood logs' });
      return;
    }

    await prisma.moodLog.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
