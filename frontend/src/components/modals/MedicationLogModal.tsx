import { useState, useEffect, type FormEvent } from 'react';
import apiClient from '../../lib/apiClient';
import type { Medication, MedicationLog } from '../../types/api';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: MedicationLog;
}

function toDatetimeLocal(isoString: string): string {
  const d = new Date(isoString);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function nowDatetimeLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function MedicationLogModal({ isOpen, onClose, onSuccess, initialData }: Props) {
  const isEditing = !!initialData;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationId, setMedicationId] = useState('');
  const [taken, setTaken] = useState(true);
  const [takenAt, setTakenAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loggedAt, setLoggedAt] = useState(nowDatetimeLocal);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load medications list for create mode
  useEffect(() => {
    if (!isOpen || isEditing) return;
    apiClient
      .get<{ medications: Medication[] }>('/api/medications')
      .then(({ data }) => {
        const active = data.medications.filter((m) => m.isActive);
        setMedications(active);
        if (active.length > 0) setMedicationId(active[0].id);
      })
      .catch(() => setError('Failed to load medications.'));
  }, [isOpen, isEditing]);

  // Reset form state when modal opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setTaken(initialData.taken);
      setTakenAt(initialData.takenAt ? toDatetimeLocal(initialData.takenAt) : '');
      setNotes(initialData.notes ?? '');
      setLoggedAt(toDatetimeLocal(initialData.loggedAt));
    } else {
      setTaken(true);
      setTakenAt('');
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
    if (!isEditing && !medicationId) {
      setError('Please select a medication.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await apiClient.patch(`/api/medication-logs/${initialData.id}`, {
          taken,
          takenAt: taken && takenAt ? new Date(takenAt).toISOString() : null,
          notes: notes.trim() || undefined,
          loggedAt: new Date(loggedAt).toISOString(),
        });
      } else {
        await apiClient.post('/api/medication-logs', {
          medicationId,
          taken,
          takenAt: taken && takenAt ? new Date(takenAt).toISOString() : undefined,
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

  const noMedications = !isEditing && medications.length === 0 && !error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-teal-800">
          {isEditing ? 'Edit Medication Log' : 'Log Medication'}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {noMedications ? (
          <>
            <p className="mb-4 text-sm text-sage-600">
              No active medications found. Add medications in Settings first.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-sage-300 px-4 py-2 text-sm text-sage-700 transition hover:bg-sage-100"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isEditing ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-sage-700">Medication</label>
                <p className="rounded-lg border border-sage-200 bg-sage-50 px-3 py-2 text-sm text-sage-800">
                  {initialData.medication?.name ?? 'Unknown medication'}
                  {initialData.medication?.dosage ? ` — ${initialData.medication.dosage}` : ''}
                </p>
              </div>
            ) : (
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
            )}

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
                {isSubmitting ? 'Saving…' : isEditing ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
