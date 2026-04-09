import { useState, useEffect, type FormEvent } from 'react';
import apiClient from '../../lib/apiClient';
import type { Symptom } from '../../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SymptomLogModal({ isOpen, onClose, onSuccess }: Props) {
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [symptomId, setSymptomId] = useState('');
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiClient
      .get<{ symptoms: Symptom[] }>('/api/symptoms')
      .then(({ data }) => {
        const active = data.symptoms.filter((s) => s.isActive);
        setSymptoms(active);
        if (active.length > 0) setSymptomId(active[0].id);
      })
      .catch(() => setError('Failed to load symptoms.'));
  }, [isOpen]);

  const handleClose = () => {
    setError('');
    setNotes('');
    setSeverity(5);
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!symptomId) {
      setError('Please select a symptom.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/symptom-logs', {
        symptomId,
        severity,
        notes: notes.trim() || undefined,
        loggedAt: new Date(loggedAt).toISOString(),
      });
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
        <h2 className="mb-4 text-xl font-bold text-teal-800">Log Symptom</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">Symptom</label>
            <select
              value={symptomId}
              onChange={(e) => setSymptomId(e.target.value)}
              className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            >
              {symptoms.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-sage-700">
              Severity: <span className="font-bold text-teal-700">{severity}</span> / 10
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-xs text-sage-500">
              <span>Mild (1)</span>
              <span>Severe (10)</span>
            </div>
          </div>

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
