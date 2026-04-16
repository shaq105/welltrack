import { useState, useEffect, useCallback } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import type { SymptomLog, MoodLog, MedicationLog, HabitLog } from '../types/api';
import SymptomLogModal from '../components/modals/SymptomLogModal';
import MoodLogModal from '../components/modals/MoodLogModal';
import MedicationLogModal from '../components/modals/MedicationLogModal';
import HabitLogModal from '../components/modals/HabitLogModal';
import OnboardingModal from '../components/OnboardingModal';

type ModalType = 'symptom' | 'mood' | 'medication' | 'habit' | null;

function getTodayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

function getWeekRange() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon, ...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { startDate: monday.toISOString(), endDate: sunday.toISOString(), monday };
}

function getDayLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface TodaySummary {
  symptoms: number;
  mood: boolean;
  medications: number;
  habits: number;
}

export default function DashboardPage() {
  const { user, isNewUser, dismissNewUser } = useAuth();
  const [todaySummary, setTodaySummary] = useState<TodaySummary>({
    symptoms: 0,
    mood: false,
    medications: 0,
    habits: 0,
  });
  const [daysLoggedThisWeek, setDaysLoggedThisWeek] = useState<Date[]>([]);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { startDate: todayStart, endDate: todayEnd } = getTodayRange();
      const { startDate: weekStart, endDate: weekEnd, monday } = getWeekRange();

      // Build week days array (Mon–Sun)
      const days: Date[] = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
      }
      setWeekDays(days);

      const [
        { data: symptomData },
        { data: moodData },
        { data: medicationData },
        { data: habitData },
        { data: weekSymptomData },
        { data: weekMoodData },
        { data: weekMedicationData },
        { data: weekHabitData },
      ] = await Promise.all([
        apiClient.get<{ symptomLogs: SymptomLog[] }>('/api/symptom-logs', {
          params: { startDate: todayStart, endDate: todayEnd },
        }),
        apiClient.get<{ moodLogs: MoodLog[] }>('/api/mood-logs', {
          params: { startDate: todayStart, endDate: todayEnd },
        }),
        apiClient.get<{ medicationLogs: MedicationLog[] }>('/api/medication-logs', {
          params: { startDate: todayStart, endDate: todayEnd },
        }),
        apiClient.get<{ habitLogs: HabitLog[] }>('/api/habit-logs', {
          params: { startDate: todayStart, endDate: todayEnd },
        }),
        apiClient.get<{ symptomLogs: SymptomLog[] }>('/api/symptom-logs', {
          params: { startDate: weekStart, endDate: weekEnd },
        }),
        apiClient.get<{ moodLogs: MoodLog[] }>('/api/mood-logs', {
          params: { startDate: weekStart, endDate: weekEnd },
        }),
        apiClient.get<{ medicationLogs: MedicationLog[] }>('/api/medication-logs', {
          params: { startDate: weekStart, endDate: weekEnd },
        }),
        apiClient.get<{ habitLogs: HabitLog[] }>('/api/habit-logs', {
          params: { startDate: weekStart, endDate: weekEnd },
        }),
      ]);

      setTodaySummary({
        symptoms: symptomData.symptomLogs.length,
        mood: moodData.moodLogs.length > 0,
        medications: medicationData.medicationLogs.length,
        habits: habitData.habitLogs.length,
      });

      // Collect all logged dates this week across all types
      const allLoggedDates = [
        ...weekSymptomData.symptomLogs.map((l) => new Date(l.loggedAt)),
        ...weekMoodData.moodLogs.map((l) => new Date(l.loggedAt)),
        ...weekMedicationData.medicationLogs.map((l) => new Date(l.loggedAt)),
        ...weekHabitData.habitLogs.map((l) => new Date(l.loggedAt)),
      ];

      const loggedDays = days.filter((day) =>
        allLoggedDates.some((logDate) => isSameDay(logDate, day)),
      );
      setDaysLoggedThisWeek(loggedDays);
    } catch {
      // Fail silently — data stays at defaults
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const quickAddButtons: { label: string; type: ModalType; color: string }[] = [
    { label: '+ Symptom', type: 'symptom', color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
    { label: '+ Mood', type: 'mood', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
    { label: '+ Medication', type: 'medication', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
    { label: '+ Habit', type: 'habit', color: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' },
  ];

  const summaryCards = [
    {
      label: 'Symptoms',
      value: isLoading ? '—' : todaySummary.symptoms.toString(),
      sub: 'logged today',
      color: 'border-rose-100',
      dot: 'bg-rose-400',
    },
    {
      label: 'Mood',
      value: isLoading ? '—' : todaySummary.mood ? 'Logged' : 'Not yet',
      sub: 'today',
      color: 'border-amber-100',
      dot: 'bg-amber-400',
    },
    {
      label: 'Medications',
      value: isLoading ? '—' : todaySummary.medications.toString(),
      sub: 'logged today',
      color: 'border-blue-100',
      dot: 'bg-blue-400',
    },
    {
      label: 'Habits',
      value: isLoading ? '—' : todaySummary.habits.toString(),
      sub: 'logged today',
      color: 'border-teal-100',
      dot: 'bg-teal-400',
    },
  ];

  const today = new Date();

  return (
    <>
      {/* Greeting & Date */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-teal-800">
          {greeting()}, {user?.display_name ?? user?.email ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-sage-600">{todayLabel}</p>
      </div>

      {/* Today's Summary */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sage-600">
          Today's Summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {summaryCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-xl border-2 bg-white p-4 shadow-sm ${card.color}`}
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${card.dot}`} />
                <span className="text-xs font-medium text-sage-600">{card.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-teal-800">{card.value}</p>
              <p className="text-xs text-sage-500">{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Week Streak */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sage-600">
          This Week
        </h2>
        <div className="rounded-xl border border-sage-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-sm text-sage-700">
            {isLoading ? (
              'Loading…'
            ) : (
              <>
                <span className="font-bold text-teal-700">{daysLoggedThisWeek.length}</span>
                {' of 7 days logged this week'}
              </>
            )}
          </p>
          <div className="flex gap-1 sm:gap-2">
            {weekDays.map((day) => {
              const logged = daysLoggedThisWeek.some((d) => isSameDay(d, day));
              const isToday = isSameDay(day, today);
              return (
                <div key={day.toISOString()} className="flex flex-1 flex-col items-center gap-1">
                  <span
                    className={`text-xs font-medium ${isToday ? 'text-teal-700' : 'text-sage-500'}`}
                  >
                    {getDayLabel(day)}
                  </span>
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-xs font-bold transition ${
                      logged
                        ? 'bg-teal-600 text-white'
                        : isToday
                          ? 'border-2 border-teal-400 text-teal-500'
                          : 'bg-sage-100 text-sage-400'
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quick Add */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-sage-600">
          Quick Add
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {quickAddButtons.map(({ label, type, color }) => (
            <button
              key={type}
              onClick={() => setActiveModal(type)}
              className={`rounded-xl border px-5 py-3 text-sm font-semibold transition ${color}`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Modals */}
      <SymptomLogModal
        isOpen={activeModal === 'symptom'}
        onClose={() => setActiveModal(null)}
        onSuccess={loadDashboardData}
      />
      <MoodLogModal
        isOpen={activeModal === 'mood'}
        onClose={() => setActiveModal(null)}
        onSuccess={loadDashboardData}
      />
      <MedicationLogModal
        isOpen={activeModal === 'medication'}
        onClose={() => setActiveModal(null)}
        onSuccess={loadDashboardData}
      />
      <HabitLogModal
        isOpen={activeModal === 'habit'}
        onClose={() => setActiveModal(null)}
        onSuccess={loadDashboardData}
      />

      {/* Onboarding for new users */}
      {isNewUser && user && (
        <OnboardingModal displayName={user.display_name || user.email} onComplete={dismissNewUser} />
      )}
    </>
  );
}
