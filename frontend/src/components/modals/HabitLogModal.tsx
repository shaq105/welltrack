import { useState, useEffect, type FormEvent } from 'react';
import apiClient from '../../lib/apiClient';
import type { Habit, HabitLog } from '../../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: HabitLog;
}

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function nowDatetimeLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function HabitLogModal({ isOpen, onClose, onSuccess, initialData }: Props) {
  const isEditing = !!initialData;

  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitId, setHabitId] = useState('');
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [valueBoolean, setValueBoolean] = useState(true);
  const [valueNumeric, setValueNumeric] = useState('');
  const [valueDuration, setValueDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(nowDatetimeLocal);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load habits list for create mode
  useEffect(() => {
    if (!isOpen || isEditing) return;
    apiClient
      .get<{ habits: Habit[] }>('/api/habits')
      .then(({ data }) => {
        const active = data.habits.filter((h) => h.isActive);
        setHabits(active);
        if (active.length > 0) {
          setHabitId(active[0].id);
          setSelectedHabit(active[0]);
        }
      })
      .catch(() => setError('Failed to load habits.'));
  }, [isOpen, isEditing]);

  // Reset form state when modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setNotes(initialData.notes ?? '');
      setLoggedAt(toDatetimeLocal(initialData.loggedAt));
      if (initialData.valueBoolean !== null) setValueBoolean(initialData.valueBoolean);
      setValueNumeric(initialData.valueNumeric !== null ? String(initialData.valueNumeric) : '');
      setValueDuration(initialData.valueDuration !== null ? String(initialData.valueDuration) : '');
      // Reconstruct selectedHabit from the included relation
      if (initialData.habit) {
        setSelectedHabit({
          id: initialData.habitId,
          userId: null,
          name: initialData.habit.name,
          trackingType: initialData.habit.trackingType,
          unit: initialData.habit.unit,
          isActive: true,
        });
      }
    } else {
      setNotes('');
      setLoggedAt(nowDatetimeLocal());
      setValueBoolean(true);
      setValueNumeric('');
      setValueDuration('');
    }
    setError('');
  }, [isOpen, initialData]);

  const handleHabitChange = (id: string) => {
    setHabitId(id);
    const habit = habits.find((h) => h.id === id) ?? null;
    setSelectedHabit(habit);
    setValueBoolean(true);
    setValueNumeric('');
    setValueDuration('');
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedHabit) {
      setError('Please select a habit.');
      return;
    }

    const payload: Record<string, unknown> = {
      notes: notes.trim() || undefined,
      loggedAt: new Date(loggedAt).toISOString(),
    };

    if (selectedHabit.trackingType === 'boolean') {
      payload.valueBoolean = valueBoolean;
    } else if (selectedHabit.trackingType === 'numeric') {
      const num = parseFloat(valueNumeric);
      if (isNaN(num)) {
        setError('Please enter a valid number.');
        return;
      }
      payload.valueNumeric = num;
    } else if (selectedHabit.trackingType === 'duration') {
      const minutes = parseInt(valueDuration, 10);
      if (isNaN(minutes) || minutes < 0) {
        setError('Please enter a valid duration in minutes.');
        return;
      }
      payload.valueDuration = minutes;
    }

    setError('');
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await apiClient.patch(`/api/habit-logs/${initialData.id}`, payload);
      } else {
        await apiClient.post('/api/habit-logs', { habitId, ...payload });
      }
      handleClose();
      onSuccess();
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setError(apiError.response?.data?.message ?? 'Failed to save. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-teal-800">
          {isEditing ? 'Edit Habit Log' : 'Log Habit'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEditing ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Habit</label>
              <p className="rounded-lg border border-sage-200 bg-sage-50 px-3 py-2 text-sm text-sage-800">
                {selectedHabit?.name ?? 'Unknown habit'}
              </p>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Habit</label>
              <select
                value={habitId}
                onChange={(e) => handleHabitChange(e.target.value)}
                className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              >
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedHabit?.trackingType === 'boolean' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Did you do it?</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setValueBoolean(true)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    valueBoolean
                      ? 'bg-teal-600 text-white'
                      : 'border border-sage-300 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setValueBoolean(false)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    !valueBoolean
                      ? 'bg-red-500 text-white'
                      : 'border border-sage-300 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          )}

          {selectedHabit?.trackingType === 'numeric' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Value{selectedHabit.unit ? ` (${selectedHabit.unit})` : ''}
              </label>
              <input
                type="number"
                step="any"
                value={valueNumeric}
                onChange={(e) => setValueNumeric(e.target.value)}
                placeholder={`Enter amount${selectedHabit.unit ? ` in ${selectedHabit.unit}` : ''}`}
                className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </div>
          )}

          {selectedHabit?.trackingType === 'duration' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={valueDuration}
                onChange={(e) => setValueDuration(e.target.value)}
                placeholder="Enter minutes"
                className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Date & Time</label>
            <input
              type="datetime-local"
              value={loggedAt}
              onChange={(e) => setLoggedAt(e.target.value)}
              className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional details…"
              className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-sage-300 px-4 py-2 text-sm text-sage-700 transition hover:bg-sage-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
