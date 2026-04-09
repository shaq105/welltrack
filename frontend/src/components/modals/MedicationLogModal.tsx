import { useState, useEffect, type FormEvent } from 'react';
import apiClient from '../../lib/apiClient';
import type { Medication } from '../../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MedicationLogModal({ isOpen, onClose, onSuccess }: Props) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationId, setMedicationId] = useState('');
  const [taken, setTaken] = useState(true);
  const [takenAt, setTakenAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiClient
      .get<{ medications: Medication[] }>('/api/medications')
      .then(({ data }) => {
        const active = data.medications.filter((m) => m.isActive);
        setMedications(active);
        if (active.length > 0) setMedicationId(active[0].id);
      })
      .catch(() => setError('Failed to load medications.'));
  }, [isOpen]);

  const handleClose = () => {
    setError('');
    setNotes('');
    setTaken(true);
    setTakenAt('');
    onClose();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!medicationId) {
      setError('Please select a medication.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await apiClient.post('/api/medication-logs', {
        medicationId,
        taken,
        takenAt: taken && takenAt ? new Date(takenAt).toISOString() : undefined,
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
        <h2 className="mb-4 text-xl font-bold text-teal-800">Log Medication</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {medications.length === 0 && !error ? (
          <p className="mb-4 text-sm text-sage-600">
            No active medications found. Add medications in Settings first.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Medication</label>
              <select
                value={medicationId}
                onChange={(e) => setMedicationId(e.target.value)}
                className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              >
                {medications.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.dosage ? ` — ${m.dosage}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Status</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTaken(true)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    taken
                      ? 'bg-teal-600 text-white'
                      : 'border border-sage-300 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  Taken
                </button>
                <button
                  type="button"
                  onClick={() => setTaken(false)}
                  className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                    !taken
                      ? 'bg-red-500 text-white'
                      : 'border border-sage-300 text-sage-700 hover:bg-sage-100'
                  }`}
                >
                  Not taken
                </button>
              </div>
            </div>

            {taken && (
              <div>
                <label className="mb-1 block text-sm font-medium text-sage-700">
                  Time taken <span className="font-normal text-sage-500">(optional)</span>
                </label>
                <input
                  type="datetime-local"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
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
        )}

        {medications.length === 0 && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-sage-300 px-4 py-2 text-sm text-sage-700 transition hover:bg-sage-100"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
