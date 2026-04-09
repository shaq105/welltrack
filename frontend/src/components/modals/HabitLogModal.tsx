import { useState, useEffect, type FormEvent } from 'react';
import apiClient from '../../lib/apiClient';
import type { Habit } from '../../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HabitLogModal({ isOpen, onClose, onSuccess }: Props) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitId, setHabitId] = useState('');
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [valueBoolean, setValueBoolean] = useState(true);
  const [valueNumeric, setValueNumeric] = useState('');
  const [valueDuration, setValueDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen]);

  const handleHabitChange = (id: string) => {
    setHabitId(id);
    setSelectedHabit(habits.find((h) => h.id === id) ?? null);
    setValueNumeric('');
    setValueDuration('');
    setValueBoolean(true);
  };

  const handleClose = () => {
    setError('');
    setNotes('');
    setValueBoolean(true);
    setValueNumeric('');
    setValueDuration('');
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!habitId || !selectedHabit) {
      setError('Please select a habit.');
      return;
    }

    const payload: Record<string, unknown> = {
      habitId,
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
      await apiClient.post('/api/habit-logs', payload);
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
        <h2 className="mb-4 text-xl font-bold text-teal-800">Log Habit</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              <label className="mb-1 block text-sm font-medium text-sage-700">Duration (minutes)</label>
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
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
