import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function getMedicationLogs(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

    const medicationLogs = await prisma.medicationLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
      include: { medication: { select: { name: true, dosage: true } } },
    });

    res.status(200).json({ medicationLogs });
  } catch (err) {
    next(err);
  }
}

export async function createMedicationLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const { medicationId, taken, takenAt, notes, loggedAt } = req.body;

    if (!medicationId || typeof medicationId !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'medicationId is required' });
      return;
    }

    if (taken === undefined || taken === null) {
      res.status(400).json({ error: 'Bad Request', message: 'taken is required' });
      return;
    }

    if (typeof taken !== 'boolean') {
      res.status(400).json({ error: 'Bad Request', message: 'taken must be a boolean' });
      return;
    }

    const medication = await prisma.medication.findUnique({ where: { id: medicationId } });

    if (!medication) {
      res.status(404).json({ error: 'Not Found', message: 'Medication not found' });
      return;
    }

    if (medication.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only log your own medications' });
      return;
    }

    if (notes !== undefined && typeof notes !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'notes must be a string' });
      return;
    }

    let parsedTakenAt: Date | undefined;
    if (takenAt !== undefined) {
      parsedTakenAt = new Date(takenAt);
      if (isNaN(parsedTakenAt.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'takenAt must be a valid ISO date' });
        return;
      }
    }

    let parsedLoggedAt: Date | undefined;
    if (loggedAt !== undefined) {
      parsedLoggedAt = new Date(loggedAt);
      if (isNaN(parsedLoggedAt.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'loggedAt must be a valid ISO date' });
        return;
      }
    }

    const medicationLog = await prisma.medicationLog.create({
      data: {
        userId,
        medicationId,
        taken,
        takenAt: parsedTakenAt ?? null,
        notes: notes ?? null,
        ...(parsedLoggedAt && { loggedAt: parsedLoggedAt }),
      },
    });

    res.status(201).json({ medicationLog });
  } catch (err) {
    next(err);
  }
}

export async function updateMedicationLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;
    const { taken, takenAt, notes, loggedAt } = req.body;

    const medicationLog = await prisma.medicationLog.findUnique({ where: { id } });

    if (!medicationLog) {
      res.status(404).json({ error: 'Not Found', message: 'Medication log not found' });
      return;
    }

    if (medicationLog.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only update your own medication logs' });
      return;
    }

    if (taken === undefined && takenAt === undefined && notes === undefined && loggedAt === undefined) {
      res.status(400).json({ error: 'Bad Request', message: 'At least one field is required' });
      return;
    }

    if (taken !== undefined && typeof taken !== 'boolean') {
      res.status(400).json({ error: 'Bad Request', message: 'taken must be a boolean' });
      return;
    }

    if (notes !== undefined && notes !== null && typeof notes !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'notes must be a string' });
      return;
    }

    let parsedTakenAt: Date | null | undefined;
    if (takenAt !== undefined) {
      if (takenAt === null) {
        parsedTakenAt = null;
      } else {
        parsedTakenAt = new Date(takenAt);
        if (isNaN(parsedTakenAt.getTime())) {
          res.status(400).json({ error: 'Bad Request', message: 'takenAt must be a valid ISO date' });
          return;
        }
      }
    }

    let parsedLoggedAt: Date | undefined;
    if (loggedAt !== undefined) {
      parsedLoggedAt = new Date(loggedAt);
      if (isNaN(parsedLoggedAt.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'loggedAt must be a valid ISO date' });
        return;
      }
    }

    const data: { taken?: boolean; takenAt?: Date | null; notes?: string | null; loggedAt?: Date } = {};
    if (taken !== undefined) data.taken = taken;
    if (takenAt !== undefined) data.takenAt = parsedTakenAt as Date | null;
    if (notes !== undefined) data.notes = notes;
    if (parsedLoggedAt !== undefined) data.loggedAt = parsedLoggedAt;

    const updated = await prisma.medicationLog.update({ where: { id }, data });

    res.status(200).json({ medicationLog: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteMedicationLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = req.user!.id;
    const id = req.params.id as string;

    const medicationLog = await prisma.medicationLog.findUnique({ where: { id } });

    if (!medicationLog) {
      res.status(404).json({ error: 'Not Found', message: 'Medication log not found' });
      return;
    }

    if (medicationLog.userId !== userId) {
      res.status(403).json({ error: 'Forbidden', message: 'You can only delete your own medication logs' });
      return;
    }

    await prisma.medicationLog.delete({ where: { id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
