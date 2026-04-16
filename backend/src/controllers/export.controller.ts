import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
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

export async function exportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
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

    const [user, symptomLogs, moodLogs, medicationLogs, habitLogs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { displayName: true, email: true } }),
      prisma.symptomLog.findMany({
        where: { userId, ...(loggedAtFilter && { loggedAt: loggedAtFilter }) },
        include: { symptom: { select: { name: true } } },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.moodLog.findMany({
        where: { userId, ...(loggedAtFilter && { loggedAt: loggedAtFilter }) },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.medicationLog.findMany({
        where: { userId, ...(loggedAtFilter && { loggedAt: loggedAtFilter }) },
        include: { medication: { select: { name: true, dosage: true } } },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.habitLog.findMany({
        where: { userId, ...(loggedAtFilter && { loggedAt: loggedAtFilter }) },
        include: { habit: { select: { name: true, trackingType: true, unit: true } } },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="welltrack-health-report.pdf"');
    doc.pipe(res);

    const TEAL = '#0d9488';
    const GRAY = '#6b7280';
    const LIGHT_GRAY = '#f3f4f6';
    const DARK = '#111827';

    // ── Header ───────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 100).fill(TEAL);
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold').text('WellTrack', 50, 30);
    doc.fontSize(12).font('Helvetica').text('Health Report', 50, 58);
    doc.fillColor('#ffffff').fontSize(10).text(`Patient: ${user?.displayName ?? 'Unknown'} (${user?.email ?? ''})`, 50, 75);
    doc.moveDown(4);

    // Date range
    const fromLabel = dateFilter.gte ? dateFilter.gte.toLocaleDateString() : 'All time';
    const toLabel = dateFilter.lte ? dateFilter.lte.toLocaleDateString() : 'Present';
    doc.fillColor(GRAY).fontSize(10).font('Helvetica').text(`Report period: ${fromLabel} – ${toLabel}`, { align: 'right' });
    doc.moveDown(1);

    const sectionHeader = (title: string) => {
      doc.moveDown(0.5);
      doc.rect(50, doc.y, doc.page.width - 100, 22).fill(LIGHT_GRAY);
      doc.fillColor(TEAL).fontSize(12).font('Helvetica-Bold').text(title, 55, doc.y - 18);
      doc.moveDown(0.8);
    };

    const row = (label: string, value: string) => {
      doc.fillColor(GRAY).fontSize(9).font('Helvetica-Bold').text(label, 60, doc.y, { continued: true, width: 140 });
      doc.fillColor(DARK).font('Helvetica').text(value, { align: 'left' });
    };

    // ── Symptom Logs ─────────────────────────────────────────────────────────
    sectionHeader(`Symptom Logs (${symptomLogs.length})`);
    if (symptomLogs.length === 0) {
      doc.fillColor(GRAY).fontSize(9).text('No symptom logs in this period.', 60);
    } else {
      for (const log of symptomLogs) {
        row('Date:', log.loggedAt.toLocaleDateString());
        row('Symptom:', log.symptom.name);
        row('Severity:', `${log.severity} / 10`);
        if (log.notes) row('Notes:', log.notes);
        doc.moveDown(0.5);
      }
    }

    // ── Mood Logs ────────────────────────────────────────────────────────────
    sectionHeader(`Mood Logs (${moodLogs.length})`);
    if (moodLogs.length === 0) {
      doc.fillColor(GRAY).fontSize(9).text('No mood logs in this period.', 60);
    } else {
      for (const log of moodLogs) {
        row('Date:', log.loggedAt.toLocaleDateString());
        row('Mood:', `${log.moodScore} / 5`);
        if (log.energyLevel !== null) row('Energy:', `${log.energyLevel} / 5`);
        if (log.stressLevel !== null) row('Stress:', `${log.stressLevel} / 5`);
        if (log.notes) row('Notes:', log.notes);
        doc.moveDown(0.5);
      }
    }

    // ── Medication Logs ──────────────────────────────────────────────────────
    sectionHeader(`Medication Logs (${medicationLogs.length})`);
    if (medicationLogs.length === 0) {
      doc.fillColor(GRAY).fontSize(9).text('No medication logs in this period.', 60);
    } else {
      for (const log of medicationLogs) {
        row('Date:', log.loggedAt.toLocaleDateString());
        row('Medication:', [log.medication.name, log.medication.dosage].filter(Boolean).join(' – '));
        row('Taken:', log.taken ? 'Yes' : 'No');
        if (log.notes) row('Notes:', log.notes);
        doc.moveDown(0.5);
      }
    }

    // ── Habit Logs ───────────────────────────────────────────────────────────
    sectionHeader(`Habit Logs (${habitLogs.length})`);
    if (habitLogs.length === 0) {
      doc.fillColor(GRAY).fontSize(9).text('No habit logs in this period.', 60);
    } else {
      for (const log of habitLogs) {
        let value = '';
        if (log.habit.trackingType === 'boolean') {
          value = log.valueBoolean !== null ? (log.valueBoolean ? 'Yes' : 'No') : '—';
        } else if (log.habit.trackingType === 'numeric') {
          value = log.valueNumeric !== null ? `${log.valueNumeric}${log.habit.unit ? ' ' + log.habit.unit : ''}` : '—';
        } else {
          value = log.valueDuration !== null ? `${log.valueDuration} min` : '—';
        }
        row('Date:', log.loggedAt.toLocaleDateString());
        row('Habit:', log.habit.name);
        row('Value:', value);
        if (log.notes) row('Notes:', log.notes);
        doc.moveDown(0.5);
      }
    }

    // ── Footer ───────────────────────────────────────────────────────────────
    doc.moveDown(2);
    doc.fillColor(GRAY).fontSize(8).font('Helvetica')
      .text(`Generated by WellTrack on ${new Date().toLocaleDateString()}`, { align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
}
