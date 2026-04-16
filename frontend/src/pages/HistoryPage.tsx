import { useState, useEffect, useMemo, useCallback } from 'react';
import apiClient from '../lib/apiClient';
import type { SymptomLog, MoodLog, MedicationLog, HabitLog } from '../types/api';
import SymptomLogModal from '../components/modals/SymptomLogModal';
import MoodLogModal from '../components/modals/MoodLogModal';
import MedicationLogModal from '../components/modals/MedicationLogModal';
import HabitLogModal from '../components/modals/HabitLogModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterType = 'all' | 'symptoms' | 'mood' | 'medications' | 'habits';

type LogEntry =
  | { type: 'symptom'; data: SymptomLog }
  | { type: 'mood'; data: MoodLog }
  | { type: 'medication'; data: MedicationLog }
  | { type: 'habit'; data: HabitLog };

interface DayGroup {
  dateKey: string;
  label: string;
  entries: LogEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocalDateKey(isoString: string): string {
  const d = new Date(isoString);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatDayLabel(dateKey: string): string {
  const today = new Date();
  const todayKey = getLocalDateKey(today.toISOString());

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayKey = getLocalDateKey(yesterday.toISOString());

  if (dateKey === todayKey) return 'Today';
  if (dateKey === yesterdayKey) return 'Yesterday';

  return new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function severityBadge(severity: number): string {
  if (severity <= 3) return 'bg-teal-100 text-teal-700';
  if (severity <= 6) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
}

function habitValue(log: HabitLog): string {
  if (log.valueBoolean !== null) return log.valueBoolean ? 'Yes' : 'No';
  if (log.valueNumeric !== null) {
    return log.habit?.unit ? `${log.valueNumeric} ${log.habit.unit}` : String(log.valueNumeric);
  }
  if (log.valueDuration !== null) {
    const h = Math.floor(log.valueDuration / 60);
    const m = log.valueDuration % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }
  return '—';
}

const MOOD_LABELS: Record<number, string> = {
  1: 'Very Bad',
  2: 'Bad',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
};

const SCORE_LABELS: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Very High',
};

const TYPE_CONFIG: Record<
  LogEntry['type'],
  { label: string; pill: string }
> = {
  symptom: { label: 'Symptom', pill: 'bg-rose-100 text-rose-700' },
  mood: { label: 'Mood', pill: 'bg-amber-100 text-amber-700' },
  medication: { label: 'Medication', pill: 'bg-blue-100 text-blue-700' },
  habit: { label: 'Habit', pill: 'bg-teal-100 text-teal-700' },
};

// ─── Entry Card ───────────────────────────────────────────────────────────────

function EntryContent({ entry }: { entry: LogEntry }) {
  if (entry.type === 'symptom') {
    const { data } = entry;
    return (
      <div>
        <p className="font-medium text-sage-800">
          {data.symptom?.name ?? 'Unknown symptom'}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityBadge(data.severity)}`}>
            Severity {data.severity}/10
          </span>
          {data.notes && <span className="text-xs text-sage-500 italic">"{data.notes}"</span>}
        </div>
      </div>
    );
  }

  if (entry.type === 'mood') {
    const { data } = entry;
    return (
      <div>
        <p className="font-medium text-sage-800">
          {MOOD_LABELS[data.moodScore]} <span className="text-sm text-sage-500">({data.moodScore}/5)</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          {data.energyLevel !== null && (
            <span className="text-xs text-sage-500">
              Energy: {SCORE_LABELS[data.energyLevel!]}
            </span>
          )}
          {data.stressLevel !== null && (
            <span className="text-xs text-sage-500">
              Stress: {SCORE_LABELS[data.stressLevel!]}
            </span>
          )}
          {data.notes && <span className="text-xs text-sage-500 italic">"{data.notes}"</span>}
        </div>
      </div>
    );
  }

  if (entry.type === 'medication') {
    const { data } = entry;
    return (
      <div>
        <p className="font-medium text-sage-800">
          {data.medication?.name ?? 'Unknown medication'}
          {data.medication?.dosage && (
            <span className="ml-1 text-sm text-sage-500">{data.medication.dosage}</span>
          )}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              data.taken ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-600'
            }`}
          >
            {data.taken ? 'Taken' : 'Not taken'}
          </span>
          {data.notes && <span className="text-xs text-sage-500 italic">"{data.notes}"</span>}
        </div>
      </div>
    );
  }

  // habit
  const { data } = entry;
  return (
    <div>
      <p className="font-medium text-sage-800">{data.habit?.name ?? 'Unknown habit'}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
          {habitValue(data)}
        </span>
        {data.notes && <span className="text-xs text-sage-500 italic">"{data.notes}"</span>}
      </div>
    </div>
  );
}

function EntryCard({ entry, onEdit }: { entry: LogEntry; onEdit: (e: LogEntry) => void }) {
  const { label, pill } = TYPE_CONFIG[entry.type];
  return (
    <button
      onClick={() => onEdit(entry)}
      className="w-full rounded-lg border border-sage-200 bg-white p-4 text-left transition hover:border-teal-300 hover:bg-teal-50/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${pill}`}>
            {label}
          </span>
          <EntryContent entry={entry} />
        </div>
        <span className="shrink-0 text-xs text-sage-400">
          {formatTime(entry.data.loggedAt)}
        </span>
      </div>
    </button>
  );
}

// ─── Filter Tabs ─────────────────────────────────────────────────────────────

const FILTER_TABS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'symptoms', label: 'Symptoms' },
  { value: 'mood', label: 'Mood' },
  { value: 'medications', label: 'Medications' },
  { value: 'habits', label: 'Habits' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [symptomLogs, setSymptomLogs] = useState<SymptomLog[]>([]);
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editState, setEditState] = useState<LogEntry | null>(null);

  // Last 30 days — computed once
  const dateRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, []);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = dateRange;
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
      // fail silently — data stays at empty arrays
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const dayGroups = useMemo<DayGroup[]>(() => {
    const entries: LogEntry[] = [];
    if (filter === 'all' || filter === 'symptoms') {
      symptomLogs.forEach((l) => entries.push({ type: 'symptom', data: l }));
    }
    if (filter === 'all' || filter === 'mood') {
      moodLogs.forEach((l) => entries.push({ type: 'mood', data: l }));
    }
    if (filter === 'all' || filter === 'medications') {
      medicationLogs.forEach((l) => entries.push({ type: 'medication', data: l }));
    }
    if (filter === 'all' || filter === 'habits') {
      habitLogs.forEach((l) => entries.push({ type: 'habit', data: l }));
    }

    entries.sort(
      (a, b) => new Date(b.data.loggedAt).getTime() - new Date(a.data.loggedAt).getTime(),
    );

    const map = new Map<string, LogEntry[]>();
    entries.forEach((entry) => {
      const key = getLocalDateKey(entry.data.loggedAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    });

    return Array.from(map.entries()).map(([dateKey, dayEntries]) => ({
      dateKey,
      label: formatDayLabel(dateKey),
      entries: dayEntries,
    }));
  }, [symptomLogs, moodLogs, medicationLogs, habitLogs, filter]);

  const totalCount =
    symptomLogs.length + moodLogs.length + medicationLogs.length + habitLogs.length;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-teal-800">History</h1>
          <p className="mt-1 text-sm text-sage-600">Last 30 days</p>
        </div>
        {!isLoading && (
          <span className="text-sm text-sage-500">{totalCount} entries</span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-sage-200 bg-white p-1 shadow-sm">
        {FILTER_TABS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`shrink-0 rounded-lg px-4 py-3 text-sm font-medium transition ${
              filter === value
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-sage-600 hover:bg-sage-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
        </div>
      ) : dayGroups.length === 0 ? (
        <div className="rounded-xl border border-sage-200 bg-white py-16 text-center shadow-sm">
          <p className="text-sage-600">No entries found for this period.</p>
          <p className="mt-1 text-sm text-sage-400">
            Use the quick-add buttons on the Dashboard to start logging.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {dayGroups.map(({ dateKey, label, entries }) => (
            <section key={dateKey}>
              <h2 className="mb-3 text-sm font-semibold text-sage-700">{label}</h2>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <EntryCard key={`${entry.type}-${entry.data.id}`} entry={entry} onEdit={setEditState} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Edit Modals */}
      <SymptomLogModal
        isOpen={editState?.type === 'symptom'}
        onClose={() => setEditState(null)}
        onSuccess={() => { setEditState(null); loadLogs(); }}
        initialData={editState?.type === 'symptom' ? editState.data : undefined}
      />
      <MoodLogModal
        isOpen={editState?.type === 'mood'}
        onClose={() => setEditState(null)}
        onSuccess={() => { setEditState(null); loadLogs(); }}
        initialData={editState?.type === 'mood' ? editState.data : undefined}
      />
      <MedicationLogModal
        isOpen={editState?.type === 'medication'}
        onClose={() => setEditState(null)}
        onSuccess={() => { setEditState(null); loadLogs(); }}
        initialData={editState?.type === 'medication' ? editState.data : undefined}
      />
      <HabitLogModal
        isOpen={editState?.type === 'habit'}
        onClose={() => setEditState(null)}
        onSuccess={() => { setEditState(null); loadLogs(); }}
        initialData={editState?.type === 'habit' ? editState.data : undefined}
      />
    </>
  );
}
