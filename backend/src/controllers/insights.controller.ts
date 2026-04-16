import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

interface DayData {
  habitDays: Map<string, { habitName: string; highValue: boolean }>;
  moodScore: number | null;
  energyLevel: number | null;
  stressLevel: number | null;
  symptomSeverities: Map<string, { symptomName: string; totalSeverity: number; count: number }>;
}

interface Correlation {
  habitName: string;
  outcomeType: 'mood' | 'energy' | 'stress' | 'symptom';
  outcomeName: string;
  withHabit: number;
  withoutHabit: number;
  difference: number;
  direction: 'positive' | 'negative';
  sampleSize: number;
  description: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getCorrelations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id;

    // Look at the last 90 days
    const since = new Date();
    since.setDate(since.getDate() - 90);

    const [habitLogs, moodLogs, symptomLogs] = await Promise.all([
      prisma.habitLog.findMany({
        where: { userId, loggedAt: { gte: since } },
        include: { habit: { select: { name: true, trackingType: true } } },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.moodLog.findMany({
        where: { userId, loggedAt: { gte: since } },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.symptomLog.findMany({
        where: { userId, loggedAt: { gte: since } },
        include: { symptom: { select: { name: true } } },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    // Build per-day data map
    const dayMap = new Map<string, DayData>();

    const getOrCreateDay = (key: string): DayData => {
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          habitDays: new Map(),
          moodScore: null,
          energyLevel: null,
          stressLevel: null,
          symptomSeverities: new Map(),
        });
      }
      return dayMap.get(key)!;
    };

    // Index habit logs — for boolean: true=high, false=low; for numeric/duration: above median = high
    // First pass: collect values per habit to compute medians
    const habitValues = new Map<string, { name: string; values: number[] }>();
    for (const log of habitLogs) {
      if (!habitValues.has(log.habitId)) {
        habitValues.set(log.habitId, { name: log.habit.name, values: [] });
      }
      if (log.habit.trackingType === 'boolean') {
        habitValues.get(log.habitId)!.values.push(log.valueBoolean ? 1 : 0);
      } else if (log.habit.trackingType === 'numeric' && log.valueNumeric !== null) {
        habitValues.get(log.habitId)!.values.push(log.valueNumeric);
      } else if (log.habit.trackingType === 'duration' && log.valueDuration !== null) {
        habitValues.get(log.habitId)!.values.push(log.valueDuration);
      }
    }

    // Compute medians
    const habitMedians = new Map<string, number>();
    for (const [habitId, { values }] of habitValues) {
      if (values.length === 0) continue;
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      habitMedians.set(habitId, sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]);
    }

    // Second pass: index into dayMap
    for (const log of habitLogs) {
      const key = toDateKey(log.loggedAt);
      const day = getOrCreateDay(key);
      const median = habitMedians.get(log.habitId) ?? 0.5;
      let highValue = false;
      if (log.habit.trackingType === 'boolean') {
        highValue = log.valueBoolean === true;
      } else if (log.habit.trackingType === 'numeric' && log.valueNumeric !== null) {
        highValue = log.valueNumeric >= median;
      } else if (log.habit.trackingType === 'duration' && log.valueDuration !== null) {
        highValue = log.valueDuration >= median;
      }
      day.habitDays.set(log.habitId, { habitName: log.habit.name, highValue });
    }

    // Index mood logs
    for (const log of moodLogs) {
      const key = toDateKey(log.loggedAt);
      const day = getOrCreateDay(key);
      day.moodScore = log.moodScore;
      if (log.energyLevel !== null) day.energyLevel = log.energyLevel;
      if (log.stressLevel !== null) day.stressLevel = log.stressLevel;
    }

    // Index symptom logs — average per symptom per day
    for (const log of symptomLogs) {
      const key = toDateKey(log.loggedAt);
      const day = getOrCreateDay(key);
      const existing = day.symptomSeverities.get(log.symptomId);
      if (existing) {
        existing.totalSeverity += log.severity;
        existing.count += 1;
      } else {
        day.symptomSeverities.set(log.symptomId, {
          symptomName: log.symptom.name,
          totalSeverity: log.severity,
          count: 1,
        });
      }
    }

    const days = Array.from(dayMap.values());
    const correlations: Correlation[] = [];

    // For each habit, compute correlations against mood outcomes and symptoms
    for (const [habitId, { name: habitName }] of habitValues) {
      const withHabitDays = days.filter((d) => d.habitDays.get(habitId)?.highValue === true);
      const withoutHabitDays = days.filter((d) => d.habitDays.get(habitId)?.highValue === false);

      const MIN_SAMPLES = 3;
      if (withHabitDays.length < MIN_SAMPLES || withoutHabitDays.length < MIN_SAMPLES) continue;

      // Mood correlation
      const moodWith = withHabitDays.filter((d) => d.moodScore !== null);
      const moodWithout = withoutHabitDays.filter((d) => d.moodScore !== null);
      if (moodWith.length >= MIN_SAMPLES && moodWithout.length >= MIN_SAMPLES) {
        const avgWith = moodWith.reduce((s, d) => s + d.moodScore!, 0) / moodWith.length;
        const avgWithout = moodWithout.reduce((s, d) => s + d.moodScore!, 0) / moodWithout.length;
        const diff = avgWith - avgWithout;
        if (Math.abs(diff) >= 0.4) {
          const direction = diff > 0 ? 'positive' : 'negative';
          correlations.push({
            habitName,
            outcomeType: 'mood',
            outcomeName: 'Mood',
            withHabit: round1(avgWith),
            withoutHabit: round1(avgWithout),
            difference: round1(Math.abs(diff)),
            direction,
            sampleSize: moodWith.length + moodWithout.length,
            description: direction === 'positive'
              ? `Your mood scores are higher on days you track "${habitName}" as high/done.`
              : `Your mood scores tend to be lower on days you track "${habitName}" as high/done.`,
          });
        }
      }

      // Energy correlation
      const energyWith = withHabitDays.filter((d) => d.energyLevel !== null);
      const energyWithout = withoutHabitDays.filter((d) => d.energyLevel !== null);
      if (energyWith.length >= MIN_SAMPLES && energyWithout.length >= MIN_SAMPLES) {
        const avgWith = energyWith.reduce((s, d) => s + d.energyLevel!, 0) / energyWith.length;
        const avgWithout = energyWithout.reduce((s, d) => s + d.energyLevel!, 0) / energyWithout.length;
        const diff = avgWith - avgWithout;
        if (Math.abs(diff) >= 0.4) {
          const direction = diff > 0 ? 'positive' : 'negative';
          correlations.push({
            habitName,
            outcomeType: 'energy',
            outcomeName: 'Energy',
            withHabit: round1(avgWith),
            withoutHabit: round1(avgWithout),
            difference: round1(Math.abs(diff)),
            direction,
            sampleSize: energyWith.length + energyWithout.length,
            description: direction === 'positive'
              ? `Your energy levels are higher on days you track "${habitName}" as high/done.`
              : `Your energy levels tend to be lower on days you track "${habitName}" as high/done.`,
          });
        }
      }

      // Stress correlation (inverted — high stress is bad)
      const stressWith = withHabitDays.filter((d) => d.stressLevel !== null);
      const stressWithout = withoutHabitDays.filter((d) => d.stressLevel !== null);
      if (stressWith.length >= MIN_SAMPLES && stressWithout.length >= MIN_SAMPLES) {
        const avgWith = stressWith.reduce((s, d) => s + d.stressLevel!, 0) / stressWith.length;
        const avgWithout = stressWithout.reduce((s, d) => s + d.stressLevel!, 0) / stressWithout.length;
        const diff = avgWith - avgWithout;
        if (Math.abs(diff) >= 0.4) {
          // More stress when habit = negative, less stress when habit = positive
          const direction = diff > 0 ? 'negative' : 'positive';
          correlations.push({
            habitName,
            outcomeType: 'stress',
            outcomeName: 'Stress',
            withHabit: round1(avgWith),
            withoutHabit: round1(avgWithout),
            difference: round1(Math.abs(diff)),
            direction,
            sampleSize: stressWith.length + stressWithout.length,
            description: diff > 0
              ? `Your stress levels tend to be higher on days you track "${habitName}" as high/done.`
              : `Your stress levels are lower on days you track "${habitName}" as high/done.`,
          });
        }
      }

      // Symptom correlations
      const allSymptomIds = new Set<string>();
      [...withHabitDays, ...withoutHabitDays].forEach((d) => {
        d.symptomSeverities.forEach((_, sid) => allSymptomIds.add(sid));
      });

      for (const symptomId of allSymptomIds) {
        const sympWith = withHabitDays.filter((d) => d.symptomSeverities.has(symptomId));
        const sympWithout = withoutHabitDays.filter((d) => d.symptomSeverities.has(symptomId));
        if (sympWith.length < MIN_SAMPLES || sympWithout.length < MIN_SAMPLES) continue;

        const avgWith = sympWith.reduce((s, d) => {
          const entry = d.symptomSeverities.get(symptomId)!;
          return s + entry.totalSeverity / entry.count;
        }, 0) / sympWith.length;

        const avgWithout = sympWithout.reduce((s, d) => {
          const entry = d.symptomSeverities.get(symptomId)!;
          return s + entry.totalSeverity / entry.count;
        }, 0) / sympWithout.length;

        const diff = avgWith - avgWithout;
        if (Math.abs(diff) < 0.5) continue;

        const symptomName = withHabitDays
          .find((d) => d.symptomSeverities.has(symptomId))
          ?.symptomSeverities.get(symptomId)?.symptomName ?? 'Unknown symptom';

        // Higher severity when habit active = negative correlation
        const direction = diff > 0 ? 'negative' : 'positive';
        correlations.push({
          habitName,
          outcomeType: 'symptom',
          outcomeName: symptomName,
          withHabit: round1(avgWith),
          withoutHabit: round1(avgWithout),
          difference: round1(Math.abs(diff)),
          direction,
          sampleSize: sympWith.length + sympWithout.length,
          description: diff > 0
            ? `Your "${symptomName}" severity tends to be higher on days you track "${habitName}" as high/done.`
            : `Your "${symptomName}" severity is lower on days you track "${habitName}" as high/done.`,
        });
      }
    }

    // Sort by difference descending (strongest first)
    correlations.sort((a, b) => b.difference - a.difference);

    const hasEnoughData = days.length >= 7 && habitValues.size > 0;

    res.status(200).json({
      correlations,
      meta: {
        daysAnalyzed: days.length,
        habitsTracked: habitValues.size,
        hasEnoughData,
        message: hasEnoughData
          ? null
          : 'Track at least 7 days of both habits and mood/symptoms to generate correlation insights.',
      },
    });
  } catch (err) {
    next(err);
  }
}
