import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

function escapeCsvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(fields: (string | number | boolean | null | undefined)[]): string {
  return fields.map(escapeCsvField).join(',');
}

const CSV_HEADERS = [
  'type',
  'logged_at',
  'symptom_name',
  'severity',
  'mood_score',
  'energy_level',
  'stress_level',
  'medication_name',
  'taken',
  'habit_name',
  'habit_value',
  'notes',
];

export async function exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;
    const { startDate, endDate } = req.query;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      const start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'startDate must be a valid ISO date' });
        return;
      }
      dateFilter.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        res.status(400).json({ error: 'Bad Request', message: 'endDate must be a valid ISO date' });
        return;
      }
      dateFilter.lte = end;
    }

    const loggedAtFilter = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

    const [symptomLogs, moodLogs, medicationLogs, habitLogs] = await Promise.all([
      prisma.symptomLog.findMany({
        where: { userId, ...(loggedAtFilter && { loggedAt: loggedAtFilter }) },
        include: { symptom: { select: { name: true } } },
        orderBy: { loggedAt: 'desc' },
      }),
      prisma.moodLog.findMany({
        where: { userId, ...(loggedAtFilter && { loggedAt: loggedAtFilter }) },
        orderBy: { loggedAt: 'desc' },
      }),
      prisma.medicationLog.findMany({
        where: { userId, ...(loggedAtFilter && { loggedAt: loggedAtFilter }) },
        include: { medication: { select: { name: true } } },
        orderBy: { loggedAt: 'desc' },
      }),
      prisma.habitLog.findMany({
        where: { userId, ...(loggedAtFilter && { loggedAt: loggedAtFilter }) },
        include: { habit: { select: { name: true, trackingType: true } } },
        orderBy: { loggedAt: 'desc' },
      }),
    ]);

    const rows: string[] = [CSV_HEADERS.join(',')];

    for (const log of symptomLogs) {
      rows.push(
        csvRow([
          'symptom_log',
          log.loggedAt.toISOString(),
          log.symptom.name,
          log.severity,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          log.notes ?? '',
        ]),
      );
    }

    for (const log of moodLogs) {
      rows.push(
        csvRow([
          'mood_log',
          log.loggedAt.toISOString(),
          '',
          '',
          log.moodScore,
          log.energyLevel ?? '',
          log.stressLevel ?? '',
          '',
          '',
          '',
          '',
          log.notes ?? '',
        ]),
      );
    }

    for (const log of medicationLogs) {
      rows.push(
        csvRow([
          'medication_log',
          log.loggedAt.toISOString(),
          '',
          '',
          '',
          '',
          '',
          log.medication.name,
          log.taken,
          '',
          '',
          log.notes ?? '',
        ]),
      );
    }

    for (const log of habitLogs) {
      let habitValue: string | number = '';
      if (log.habit.trackingType === 'boolean') {
        habitValue = log.valueBoolean !== null && log.valueBoolean !== undefined ? String(log.valueBoolean) : '';
      } else if (log.habit.trackingType === 'numeric') {
        habitValue = log.valueNumeric !== null && log.valueNumeric !== undefined ? log.valueNumeric : '';
      } else if (log.habit.trackingType === 'duration') {
        habitValue = log.valueDuration !== null && log.valueDuration !== undefined ? log.valueDuration : '';
      }

      rows.push(
        csvRow([
          'habit_log',
          log.loggedAt.toISOString(),
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          log.habit.name,
          habitValue,
          log.notes ?? '',
        ]),
      );
    }

    const csv = rows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="welltrack-export.csv"');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}
