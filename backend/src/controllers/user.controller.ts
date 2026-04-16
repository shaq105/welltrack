import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, timezone: true, reminderEnabled: true, reminderTime: true },
    });

    if (!user) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { displayName, timezone, reminderEnabled, reminderTime } = req.body;

    if (displayName !== undefined && typeof displayName !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'displayName must be a string' });
      return;
    }

    if (timezone !== undefined && typeof timezone !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'timezone must be a string' });
      return;
    }

    if (
      displayName === undefined &&
      timezone === undefined &&
      reminderEnabled === undefined &&
      reminderTime === undefined
    ) {
      res.status(400).json({ error: 'Bad Request', message: 'At least one field is required' });
      return;
    }

    const data: { displayName?: string; timezone?: string; reminderEnabled?: boolean; reminderTime?: string } = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (timezone !== undefined) data.timezone = timezone;
    if (reminderEnabled !== undefined) data.reminderEnabled = reminderEnabled;
    if (reminderTime !== undefined) data.reminderTime = reminderTime;

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, displayName: true, timezone: true, reminderEnabled: true, reminderTime: true },
    });

    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    await prisma.user.delete({ where: { id: userId } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
