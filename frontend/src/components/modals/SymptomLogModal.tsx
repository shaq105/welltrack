import { useState, useEffect, type FormEvent } from 'react';
import apiClient from '../../lib/apiClient';
import type { Symptom, SymptomLog } from '../../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: SymptomLog;
}

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function nowDatetimeLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function SymptomLogModal({ isOpen, onClose, onSuccess, initialData }: Props) {
  const isEditing = !!initialData;

  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [symptomId, setSymptomId] = useState('');
  const [severity, setSeverity] = useState(5);
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(nowDatetimeLocal);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load symptoms for create mode
  useEffect(() => {
    if (!isOpen || isEditing) return;
    apiClient
      .get<{ symptoms: Symptom[] }>('/api/symptoms')
      .then(({ data }) => {
        const active = data.symptoms.filter((s) => s.isActive);
        setSymptoms(active);
        if (active.length > 0) setSymptomId(active[0].id);
      })
      .catch(() => setError('Failed to load symptoms.'));
  }, [isOpen, isEditing]);

  // Reset form state when modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setSeverity(initialData.severity);
      setNotes(initialData.notes ?? '');
      setLoggedAt(toDatetimeLocal(initialData.loggedAt));
    } else {
      setSeverity(5);
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
    if (!isEditing && !symptomId) {
      setError('Please select a symptom.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await apiClient.patch(`/api/symptom-logs/${initialData.id}`, {
          severity,
          notes: notes.trim() || undefined,
          loggedAt: new Date(loggedAt).toISOString(),
        });
      } else {
        await apiClient.post('/api/symptom-logs', {
          symptomId,
          severity,
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
          {isEditing ? 'Edit Symptom Log' : 'Log Symptom'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEditing ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Symptom</label>
              <p className="rounded-lg border border-sage-200 bg-sage-50 px-3 py-2 text-sm text-sage-800">
                {initialData.symptom?.name ?? 'Unknown symptom'}
              </p>
            </div>
          ) : (
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
          )}

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
              {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
