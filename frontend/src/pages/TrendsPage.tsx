import { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../lib/apiClient';
import type { SymptomLog, MoodLog, MedicationLog, HabitLog } from '../types/api';
import TrendLineChart, { type DataPoint, type SeriesConfig } from '../components/charts/TrendLineChart';

// ─── Constants ────────────────────────────────────────────────────────────────

type Range = 7 | 30 | 90;

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
];

const LINE_COLORS = [
  '#0d9488', // teal-600
  '#e11d48', // rose-600
  '#d97706', // amber-600
  '#2563eb', // blue-600
  '#7c3aed', // violet-600
  '#059669', // emerald-600
  '#dc2626', // red-600
  '#0891b2', // cyan-600
  '#4f46e5', // indigo-600
  '#ea580c', // orange-600
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function buildDateRange(days: number): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function generateDateKeys(start: Date, end: Date): string[] {
  const keys: string[] = [];
  const d = new Date(start);
  d.setHours(12, 0, 0, 0);
  while (d <= end) {
    keys.push(getLocalDateKey(d.toISOString()));
    d.setDate(d.getDate() + 1);
  }
  return keys;
}

function formatXLabel(dateKey: string, range: Range): string {
  const d = new Date(dateKey + 'T12:00:00');
  if (range === 7) return d.toLocaleDateString('en-US', { weekday: 'short' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); // Monday
  return d;
}

// ─── Chart data builders ──────────────────────────────────────────────────────

function buildSymptomChartData(
  logs: SymptomLog[],
  dateKeys: string[],
  range: Range,
): { data: DataPoint[]; series: SeriesConfig[] } {
  // Aggregate: { dateKey → { symptomName → { sum, count } } }
  const byDate = new Map<string, Map<string, { sum: number; count: number }>>();
  logs.forEach((log) => {
    const dateKey = getLocalDateKey(log.loggedAt);
    if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
    const name = log.symptom?.name ?? log.symptomId;
    const day = byDate.get(dateKey)!;
    if (!day.has(name)) day.set(name, { sum: 0, count: 0 });
    const entry = day.get(name)!;
    entry.sum += log.severity;
    entry.count += 1;
  });

  const symptomNames = [...new Set(logs.map((l) => l.symptom?.name ?? l.symptomId))];

  const data: DataPoint[] = dateKeys.map((dateKey) => {
    const point: DataPoint = { date: formatXLabel(dateKey, range) };
    const dayData = byDate.get(dateKey);
    if (dayData) {
      dayData.forEach((agg, name) => {
        point[name] = Math.round((agg.sum / agg.count) * 10) / 10;
      });
    }
    // Fill missing symptoms with null so gaps render correctly
    symptomNames.forEach((name) => {
      if (!(name in point)) point[name] = null;
    });
    return point;
  });

  const series: SeriesConfig[] = symptomNames.map((name, i) => ({
    key: name,
    label: name,
    color: LINE_COLORS[i % LINE_COLORS.length],
  }));

  return { data, series };
}

function buildMoodChartData(
  logs: MoodLog[],
  dateKeys: string[],
  range: Range,
): { data: DataPoint[]; series: SeriesConfig[] } {
  // Aggregate: { dateKey → { moodSum, moodCount, energySum, energyCount, stressSum, stressCount } }
  const byDate = new Map<
    string,
    {
      moodSum: number; moodCount: number;
      energySum: number; energyCount: number;
      stressSum: number; stressCount: number;
    }
  >();

  logs.forEach((log) => {
    const dateKey = getLocalDateKey(log.loggedAt);
    if (!byDate.has(dateKey)) {
      byDate.set(dateKey, {
        moodSum: 0, moodCount: 0,
        energySum: 0, energyCount: 0,
        stressSum: 0, stressCount: 0,
      });
    }
    const day = byDate.get(dateKey)!;
    day.moodSum += log.moodScore;
    day.moodCount += 1;
    if (log.energyLevel !== null) { day.energySum += log.energyLevel; day.energyCount += 1; }
    if (log.stressLevel !== null) { day.stressSum += log.stressLevel; day.stressCount += 1; }
  });

  const hasEnergy = logs.some((l) => l.energyLevel !== null);
  const hasStress = logs.some((l) => l.stressLevel !== null);

  const data: DataPoint[] = dateKeys.map((dateKey) => {
    const point: DataPoint = { date: formatXLabel(dateKey, range) };
    const day = byDate.get(dateKey);
    if (day) {
      if (day.moodCount > 0) point['Mood'] = Math.round((day.moodSum / day.moodCount) * 10) / 10;
      if (hasEnergy) {
        point['Energy'] = day.energyCount > 0
          ? Math.round((day.energySum / day.energyCount) * 10) / 10
          : null;
      }
      if (hasStress) {
        point['Stress'] = day.stressCount > 0
          ? Math.round((day.stressSum / day.stressCount) * 10) / 10
          : null;
      }
    } else {
      point['Mood'] = null;
      if (hasEnergy) point['Energy'] = null;
      if (hasStress) point['Stress'] = null;
    }
    return point;
  });

  const series: SeriesConfig[] = [
    { key: 'Mood', label: 'Mood', color: '#d97706' },
    ...(hasEnergy ? [{ key: 'Energy', label: 'Energy', color: '#0d9488' }] : []),
    ...(hasStress ? [{ key: 'Stress', label: 'Stress', color: '#e11d48' }] : []),
  ];

  return { data, series };
}

// ─── Calendar Heatmap ─────────────────────────────────────────────────────────

interface HeatmapCell {
  dateKey: string;
  dayNum: number;
  count: number;
  inRange: boolean;
  isToday: boolean;
}

function heatmapColor(count: number, inRange: boolean, isToday: boolean): string {
  if (!inRange) return '';
  if (isToday && count === 0) return 'ring-2 ring-teal-400 bg-sage-100';
  if (count === 0) return 'bg-sage-100';
  if (count <= 2) return 'bg-teal-200';
  if (count <= 5) return 'bg-teal-400';
  return 'bg-teal-600';
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function CalendarHeatmap({
  start,
  end,
  logCountByDate,
}: {
  start: Date;
  end: Date;
  logCountByDate: Map<string, number>;
}) {
  const todayKey = getLocalDateKey(new Date().toISOString());

  // Build grid from Monday of start week to Sunday of end week
  const gridStart = getWeekStart(start);
  const gridEnd = getWeekStart(end);
  gridEnd.setDate(gridEnd.getDate() + 6);
  gridEnd.setHours(23, 59, 59, 999);

  const rows: HeatmapCell[][] = [];
  const d = new Date(gridStart);
  let currentRow: HeatmapCell[] = [];

  while (d <= gridEnd) {
    const dateKey = getLocalDateKey(d.toISOString());
    currentRow.push({
      dateKey,
      dayNum: d.getDate(),
      count: logCountByDate.get(dateKey) ?? 0,
      inRange: d >= start && d <= end,
      isToday: dateKey === todayKey,
    });
    if (currentRow.length === 7) {
      rows.push(currentRow);
      currentRow = [];
    }
    d.setDate(d.getDate() + 1);
  }
  if (currentRow.length > 0) rows.push(currentRow);

  // Month labels — show month name at the start of each month
  const monthLabels: (string | null)[] = rows.map((row) => {
    const firstInRange = row.find((c) => c.inRange);
    if (!firstInRange) return null;
    const firstDay = row[0];
    const d2 = new Date(firstDay.dateKey + 'T12:00:00');
    if (d2.getDate() <= 7) {
      return d2.toLocaleDateString('en-US', { month: 'short' });
    }
    return null;
  });

  const totalLogged = [...logCountByDate.values()].filter((c) => c > 0).length;
  const daysInRange = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div>
      <p className="mb-3 text-sm text-sage-600">
        <span className="font-semibold text-teal-700">{totalLogged}</span> of {daysInRange} days with entries
      </p>
      <div className="overflow-x-auto">
        <div className="min-w-fit">
          {/* Day-of-week header */}
          <div className="mb-1 grid grid-cols-7 gap-1" style={{ paddingLeft: 0 }}>
            {DAY_LABELS.map((d) => (
              <div key={d} className="w-8 text-center text-xs font-medium text-sage-500">
                {d}
              </div>
            ))}
          </div>
          {/* Week rows */}
          <div className="space-y-1">
            {rows.map((row, ri) => (
              <div key={ri} className="flex items-center gap-1">
                {row.map((cell) => (
                  <div
                    key={cell.dateKey}
                    title={`${new Date(cell.dateKey + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${cell.count} entr${cell.count === 1 ? 'y' : 'ies'}`}
                    className={`flex h-8 w-8 items-center justify-center rounded text-xs transition ${
                      cell.inRange
                        ? `cursor-default ${heatmapColor(cell.count, true, cell.isToday)}`
                        : 'opacity-0'
                    } ${cell.count > 3 ? 'text-white' : 'text-sage-600'}`}
                  >
                    {cell.inRange ? cell.dayNum : ''}
                  </div>
                ))}
                {/* Month label at end of row */}
                {monthLabels[ri] && (
                  <span className="ml-1 text-xs text-sage-400">{monthLabels[ri]}</span>
                )}
              </div>
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center gap-2 text-xs text-sage-500">
            <span>Less</span>
            {['bg-sage-100', 'bg-teal-200', 'bg-teal-400', 'bg-teal-600'].map((cls) => (
              <div key={cls} className={`h-4 w-4 rounded ${cls} border border-sage-200`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function ChartSection({
  title,
  children,
  isEmpty,
  emptyMessage,
}: {
  title: string;
  children: React.ReactNode;
  isEmpty: boolean;
  emptyMessage?: string;
}) {
  return (
    <section className="rounded-xl border border-sage-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-sage-600">{title}</h2>
      {isEmpty ? (
        <p className="py-8 text-center text-sm text-sage-400">
          {emptyMessage ?? 'No data in this period.'}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

export default function TrendsPage() {
  const [range, setRange] = useState<Range>(30);
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { start: rangeStart, end: rangeEnd } = useMemo(() => buildDateRange(range), [range]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const startDate = rangeStart.toISOString();
    const endDate = rangeEnd.toISOString();
    try {
      const [s, m, med, h] = await Promise.all([
        apiClient.get<{ symptomLogs: SymptomLog[] }>('/api/symptom-logs', {
          params: { startDate, endDate },
        }),
        apiClient.get<{ moodLogs: MoodLog[] }>('/api/mood-logs', {
          params: { startDate, endDate },
        }),
        apiClient.get<{ medicationLogs: MedicationLog[] }>('/api/medication-logs', {
          params: { startDate, endDate },
        }),
        apiClient.get<{ habitLogs: HabitLog[] }>('/api/habit-logs', {
          params: { startDate, endDate },
        }),
      ]);
      setSymptomLogs(s.data.symptomLogs);
      setMoodLogs(m.data.moodLogs);
      setMedicationLogs(med.data.medicationLogs);
      setHabitLogs(h.data.habitLogs);
    } catch {
      // fail silently
    } finally {
      setIsLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const dateKeys = useMemo(
    () => generateDateKeys(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  const { data: symptomData, series: symptomSeries } = useMemo(
    () => buildSymptomChartData(symptomLogs, dateKeys, range),
    [symptomLogs, dateKeys, range],
  );

  const { data: moodData, series: moodSeries } = useMemo(
    () => buildMoodChartData(moodLogs, dateKeys, range),
    [moodLogs, dateKeys, range],
  );

  const logCountByDate = useMemo(() => {
    const map = new Map<string, number>();
    const addLogs = (logs: Array<{ loggedAt: string }>) =>
      logs.forEach((l) => {
        const k = getLocalDateKey(l.loggedAt);
        map.set(k, (map.get(k) ?? 0) + 1);
      });
    addLogs(symptomLogs);
    addLogs(moodLogs);
    addLogs(medicationLogs);
    addLogs(habitLogs);
    return map;
  }, [symptomLogs, moodLogs, medicationLogs, habitLogs]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-teal-800">Trends</h1>

        {/* Range picker */}
        <div className="flex gap-1 rounded-xl border border-sage-200 bg-white p-1 shadow-sm">
          {RANGE_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setRange(value)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
                range === value
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-sage-600 hover:bg-sage-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Symptom severity chart */}
          <ChartSection
            title="Symptom Severity"
            isEmpty={symptomLogs.length === 0}
            emptyMessage="No symptom data in this period. Log symptoms to see trends."
          >
            <TrendLineChart
              data={symptomData}
              series={symptomSeries}
              yDomain={[0, 10]}
              yTicks={[0, 2, 4, 6, 8, 10]}
            />
          </ChartSection>

          {/* Mood / energy / stress chart */}
          <ChartSection
            title="Mood, Energy & Stress"
            isEmpty={moodLogs.length === 0}
            emptyMessage="No mood data in this period. Log your mood to see trends."
          >
            <TrendLineChart
              data={moodData}
              series={moodSeries}
              yDomain={[0, 5]}
              yTicks={[0, 1, 2, 3, 4, 5]}
            />
          </ChartSection>

          {/* Activity heatmap */}
          <ChartSection
            title="Activity Heatmap"
            isEmpty={false}
          >
            <CalendarHeatmap
              start={rangeStart}
              end={rangeEnd}
              logCountByDate={logCountByDate}
            />
          </ChartSection>
        </div>
      )}
    </>
  );
}
