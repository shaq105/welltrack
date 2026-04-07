import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function getSymptomLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { startDate, endDate, limit, offset } = req.query;

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

    const take = limit !== undefined ? parseInt(limit as string, 10) : undefined;
    const skip = offset !== undefined ? parseInt(offset as string, 10) : undefined;

    if (take !== undefined && (isNaN(take) || take < 1)) {
      res.status(400).json({ error: 'Bad Request', message: 'limit must be a positive integer' });
      return;
    }

    if (skip !== undefined && (isNaN(skip) || skip < 0)) {
      res.status(400).json({ error: 'Bad Request', message: 'offset must be a non-negative integer' });
      return;
    }

    const symptomLogs = await prisma.symptomLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
      take,
      skip,
      include: { symptom: { select: { id: true, name: true, category: true } } },
    });

    res.status(200).json({ symptomLogs });
  } catch (err) {
    next(err);
  }
}

export async function createSymptomLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { symptomId, severity, notes, loggedAt } = req.body;

    if (!symptomId || typeof symptomId !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'symptomId is required' });
      return;
    }

    if (severity === undefined || typeof severity !== 'number' || !Number.isInteger(severity) || severity < 1 || severity > 10) {
      res.status(400).json({ error: 'Bad Request', message: 'severity must be an integer between 1 and 10' });
      return;
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

    const symptom = await prisma.symptom.findUnique({ where: { id: symptomId } });
    if (!symptom) {
      res.status(404).json({ error: 'Not Found', message: 'Symptom not found' });
      return;
    }

    if (symptom.userId !== null && symptom.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You cannot log another user\'s custom symptom' });
      return;
    }

    const symptomLog = await prisma.symptomLog.create({
      data: {
        userId,
        symptomId,
        severity,
        notes,
        ...(parsedLoggedAt && { loggedAt: parsedLoggedAt }),
      },
      include: { symptom: { select: { id: true, name: true, category: true } } },
    });

    res.status(201).json({ symptomLog });
  } catch (err) {
    next(err);
  }
}

export async function updateSymptomLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { severity, notes, loggedAt } = req.body;

    const symptomLog = await prisma.symptomLog.findUnique({ where: { id } });

    if (!symptomLog) {
      res.status(404).json({ error: 'Not Found', message: 'Symptom log not found' });
      return;
    }

    if (symptomLog.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only update your own symptom logs' });
      return;
    }

    if (severity !== undefined && (typeof severity !== 'number' || !Number.isInteger(severity) || severity < 1 || severity > 10)) {
      res.status(400).json({ error: 'Bad Request', message: 'severity must be an integer between 1 and 10' });
      return;
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

    if (severity === undefined && notes === undefined && loggedAt === undefined) {
      res.status(400).json({ error: 'Bad Request', message: 'At least one field is required' });
      return;
    }

    const data: { severity?: number; notes?: string; loggedAt?: Date } = {};
    if (severity !== undefined) data.severity = severity;
    if (notes !== undefined) data.notes = notes;
    if (parsedLoggedAt !== undefined) data.loggedAt = parsedLoggedAt;

    const updated = await prisma.symptomLog.update({
      where: { id },
      data,
      include: { symptom: { select: { id: true, name: true, category: true } } },
    });

    res.status(200).json({ symptomLog: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteSymptomLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const symptomLog = await prisma.symptomLog.findUnique({ where: { id } });

    if (!symptomLog) {
      res.status(404).json({ error: 'Not Found', message: 'Symptom log not found' });
      return;
    }

    if (symptomLog.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own symptom logs' });
      return;
    }

    await prisma.symptomLog.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
