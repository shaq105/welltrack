import { useState, useEffect, type FormEvent } from 'react';
import apiClient from '../../lib/apiClient';
import type { MoodLog } from '../../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: MoodLog;
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

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function nowDatetimeLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function ScoreRow({
  label,
  value,
  onChange,
  labels,
  optional,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  labels: Record<number, string>;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-sage-700">
        {label}{' '}
        {optional && <span className="font-normal text-sage-500">(optional)</span>}
        {value !== null && (
          <>
            {': '}
            <span className="font-bold text-teal-700">{labels[value]}</span>
          </>
        )}
      </label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(optional && value === n ? null : n)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              value === n
                ? 'bg-teal-600 text-white'
                : 'border border-sage-300 text-sage-700 hover:bg-sage-100'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MoodLogModal({ isOpen, onClose, onSuccess, initialData }: Props) {
  const isEditing = !!initialData;

  const [moodScore, setMoodScore] = useState(3);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [stressLevel, setStressLevel] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(nowDatetimeLocal);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setMoodScore(initialData.moodScore);
      setEnergyLevel(initialData.energyLevel);
      setStressLevel(initialData.stressLevel);
      setNotes(initialData.notes ?? '');
      setLoggedAt(toDatetimeLocal(initialData.loggedAt));
    } else {
      setMoodScore(3);
      setEnergyLevel(null);
      setStressLevel(null);
      setNotes('');
      setLoggedAt(nowDatetimeLocal());
    }
    setError('');
  }, [isOpen, initialData]);

  const handleClose = () => {
    setError('');
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await apiClient.patch(`/api/mood-logs/${initialData.id}`, {
          moodScore,
          energyLevel,
          stressLevel,
          notes: notes.trim() || undefined,
          loggedAt: new Date(loggedAt).toISOString(),
        });
      } else {
        await apiClient.post('/api/mood-logs', {
          moodScore,
          energyLevel: energyLevel ?? undefined,
          stressLevel: stressLevel ?? undefined,
          notes: notes.trim() || undefined,
          loggedAt: new Date(loggedAt).toISOString(),
        });
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
          {isEditing ? 'Edit Mood Log' : 'Log Mood'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <ScoreRow label="Mood" value={moodScore} onChange={(v) => v !== null && setMoodScore(v)} labels={MOOD_LABELS} />
          <ScoreRow label="Energy Level" value={energyLevel} onChange={setEnergyLevel} labels={SCORE_LABELS} optional />
          <ScoreRow label="Stress Level" value={stressLevel} onChange={setStressLevel} labels={SCORE_LABELS} optional />

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
              placeholder="How are you feeling?"
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
