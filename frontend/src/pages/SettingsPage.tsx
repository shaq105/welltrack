import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import type { Symptom, Habit, Medication } from '../types/api';

type Section = 'profile' | 'symptoms' | 'habits' | 'medications' | 'data' | 'account';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'habits', label: 'Habits' },
  { id: 'medications', label: 'Medications' },
  { id: 'data', label: 'Data' },
  { id: 'account', label: 'Account' },
];

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? 'bg-teal-600' : 'bg-sage-300'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<Section>('profile');

  // ---- Profile state ----
  const [displayName, setDisplayName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name);
      setTimezone(user.timezone ?? 'UTC');
    }
  }, [user]);

  // ---- Symptoms state ----
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [symptomsLoading, setSymptomsLoading] = useState(false);
  const [symptomsError, setSymptomsError] = useState('');
  const [showAddSymptom, setShowAddSymptom] = useState(false);
  const [newSymptomName, setNewSymptomName] = useState('');
  const [newSymptomCategory, setNewSymptomCategory] = useState('');
  const [symptomSubmitting, setSymptomSubmitting] = useState(false);

  // ---- Habits state ----
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [habitsError, setHabitsError] = useState('');
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<Habit['trackingType']>('boolean');
  const [newHabitUnit, setNewHabitUnit] = useState('');
  const [habitSubmitting, setHabitSubmitting] = useState(false);

  // ---- Medications state ----
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medsLoading, setMedsLoading] = useState(false);
  const [medsError, setMedsError] = useState('');
  const [showMedModal, setShowMedModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('');
  const [medSubmitting, setMedSubmitting] = useState(false);
  const [medModalError, setMedModalError] = useState('');

  // ---- Account state ----
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // ---- Data fetching ----

  const loadSymptoms = useCallback(async () => {
    setSymptomsLoading(true);
    setSymptomsError('');
    try {
      const { data } = await apiClient.get<{ symptoms: Symptom[] }>('/api/symptoms');
      setSymptoms(data.symptoms);
    } catch {
      setSymptomsError('Failed to load symptoms.');
    } finally {
      setSymptomsLoading(false);
    }
  }, []);

  const loadHabits = useCallback(async () => {
    setHabitsLoading(true);
    setHabitsError('');
    try {
      const { data } = await apiClient.get<{ habits: Habit[] }>('/api/habits');
      setHabits(data.habits);
    } catch {
      setHabitsError('Failed to load habits.');
    } finally {
      setHabitsLoading(false);
    }
  }, []);

  const loadMedications = useCallback(async () => {
    setMedsLoading(true);
    setMedsError('');
    try {
      const { data } = await apiClient.get<{ medications: Medication[] }>('/api/medications');
      setMedications(data.medications);
    } catch {
      setMedsError('Failed to load medications.');
    } finally {
      setMedsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeSection === 'symptoms') loadSymptoms();
    else if (activeSection === 'habits') loadHabits();
    else if (activeSection === 'medications') loadMedications();
  }, [activeSection, loadSymptoms, loadHabits, loadMedications]);

  // ---- Profile handlers ----

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      await apiClient.patch('/api/users/me', {
        display_name: displayName.trim() || undefined,
        timezone,
      });
      setProfileSuccess('Profile saved successfully.');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setProfileError(apiError.response?.data?.message ?? 'Failed to save profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ---- Symptom handlers ----

  const handleToggleSymptom = async (symptom: Symptom) => {
    setSymptomsError('');
    const newActive = !symptom.isActive;
    setSymptoms((prev) =>
      prev.map((s) => (s.id === symptom.id ? { ...s, isActive: newActive } : s)),
    );
    try {
      await apiClient.patch(`/api/symptoms/${symptom.id}`, { isActive: newActive });
    } catch {
      setSymptoms((prev) =>
        prev.map((s) => (s.id === symptom.id ? { ...s, isActive: symptom.isActive } : s)),
      );
      setSymptomsError('Failed to update symptom.');
    }
  };

  const handleDeleteSymptom = async (id: string) => {
    setSymptomsError('');
    try {
      await apiClient.delete(`/api/symptoms/${id}`);
      setSymptoms((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setSymptomsError('Failed to delete symptom.');
    }
  };

  const handleAddSymptom = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSymptomName.trim()) return;
    setSymptomSubmitting(true);
    setSymptomsError('');
    try {
      const { data } = await apiClient.post<{ symptom: Symptom }>('/api/symptoms', {
        name: newSymptomName.trim(),
        category: newSymptomCategory.trim() || undefined,
      });
      setSymptoms((prev) => [...prev, data.symptom]);
      setNewSymptomName('');
      setNewSymptomCategory('');
      setShowAddSymptom(false);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setSymptomsError(apiError.response?.data?.message ?? 'Failed to add symptom.');
    } finally {
      setSymptomSubmitting(false);
    }
  };

  // ---- Habit handlers ----

  const handleToggleHabit = async (habit: Habit) => {
    setHabitsError('');
    const newActive = !habit.isActive;
    setHabits((prev) =>
      prev.map((h) => (h.id === habit.id ? { ...h, isActive: newActive } : h)),
    );
    try {
      await apiClient.patch(`/api/habits/${habit.id}`, { isActive: newActive });
    } catch {
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? { ...h, isActive: habit.isActive } : h)),
      );
      setHabitsError('Failed to update habit.');
    }
  };

  const handleDeleteHabit = async (id: string) => {
    setHabitsError('');
    try {
      await apiClient.delete(`/api/habits/${id}`);
      setHabits((prev) => prev.filter((h) => h.id !== id));
    } catch {
      setHabitsError('Failed to delete habit.');
    }
  };

  const handleAddHabit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    setHabitSubmitting(true);
    setHabitsError('');
    try {
      const { data } = await apiClient.post<{ habit: Habit }>('/api/habits', {
        name: newHabitName.trim(),
        trackingType: newHabitType,
        unit: newHabitUnit.trim() || undefined,
      });
      setHabits((prev) => [...prev, data.habit]);
      setNewHabitName('');
      setNewHabitUnit('');
      setNewHabitType('boolean');
      setShowAddHabit(false);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setHabitsError(apiError.response?.data?.message ?? 'Failed to add habit.');
    } finally {
      setHabitSubmitting(false);
    }
  };

  // ---- Medication handlers ----

  const openAddMed = () => {
    setEditingMed(null);
    setMedName('');
    setMedDosage('');
    setMedFrequency('');
    setMedModalError('');
    setShowMedModal(true);
  };

  const openEditMed = (med: Medication) => {
    setEditingMed(med);
    setMedName(med.name);
    setMedDosage(med.dosage ?? '');
    setMedFrequency(med.frequency ?? '');
    setMedModalError('');
    setShowMedModal(true);
  };

  const handleMedSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!medName.trim()) return;
    setMedSubmitting(true);
    setMedModalError('');
    try {
      if (editingMed) {
        const { data } = await apiClient.patch<{ medication: Medication }>(
          `/api/medications/${editingMed.id}`,
          {
            name: medName.trim(),
            dosage: medDosage.trim() || undefined,
            frequency: medFrequency.trim() || undefined,
          },
        );
        setMedications((prev) => prev.map((m) => (m.id === editingMed.id ? data.medication : m)));
      } else {
        const { data } = await apiClient.post<{ medication: Medication }>('/api/medications', {
          name: medName.trim(),
          dosage: medDosage.trim() || undefined,
          frequency: medFrequency.trim() || undefined,
        });
        setMedications((prev) => [...prev, data.medication]);
      }
      setShowMedModal(false);
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setMedModalError(apiError.response?.data?.message ?? 'Failed to save medication.');
    } finally {
      setMedSubmitting(false);
    }
  };

  const handleToggleMed = async (med: Medication) => {
    setMedsError('');
    const newActive = !med.isActive;
    setMedications((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, isActive: newActive } : m)),
    );
    try {
      await apiClient.patch(`/api/medications/${med.id}`, { isActive: newActive });
    } catch {
      setMedications((prev) =>
        prev.map((m) => (m.id === med.id ? { ...m, isActive: med.isActive } : m)),
      );
      setMedsError('Failed to update medication.');
    }
  };

  const handleDeleteMed = async (id: string) => {
    setMedsError('');
    try {
      await apiClient.delete(`/api/medications/${id}`);
      setMedications((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setMedsError('Failed to delete medication.');
    }
  };

  // ---- Account handlers ----

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleDeleteAccount = async () => {
    if (deleteText !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await apiClient.delete('/api/users/me');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      navigate('/login', { replace: true });
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { message?: string } } };
      setDeleteError(apiError.response?.data?.message ?? 'Failed to delete account.');
      setIsDeleting(false);
    }
  };

  // ---- Data export handler ----

  const handleExportCsv = async () => {
    try {
      const response = await apiClient.get('/api/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(response.data as Blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'welltrack-export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert('Export failed. The export feature may not be available yet.');
    }
  };

  // ---- Render ----

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-teal-800">Settings</h1>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-sage-200">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition ${
              activeSection === id
                ? 'border-b-2 border-teal-600 text-teal-700'
                : 'text-sage-600 hover:text-sage-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-teal-800">Profile</h2>
          <form onSubmit={handleProfileSave} className="max-w-md space-y-4">
            {profileError && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {profileError}
              </div>
            )}
            {profileSuccess && (
              <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
                {profileSuccess}
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Email</label>
              <p className="rounded-lg border border-sage-200 bg-sage-50 px-3 py-2 text-sm text-sage-600">
                {user?.email}
              </p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
                className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-sage-700">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={profileSaving}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
            >
              {profileSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Symptoms Section */}
      {activeSection === 'symptoms' && (
        <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-teal-800">Symptoms</h2>
          {symptomsError && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {symptomsError}
            </div>
          )}
          {symptomsLoading ? (
            <p className="text-sm text-sage-500">Loading…</p>
          ) : (
            <>
              {symptoms.length === 0 ? (
                <p className="mb-4 text-sm text-sage-500">No symptoms found.</p>
              ) : (
                <ul className="mb-4 divide-y divide-sage-100">
                  {symptoms.map((symptom) => (
                    <li key={symptom.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-sage-800">{symptom.name}</p>
                        {symptom.category && (
                          <p className="text-xs text-sage-500">{symptom.category}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <ToggleSwitch
                          checked={symptom.isActive}
                          onChange={() => handleToggleSymptom(symptom)}
                        />
                        {symptom.userId !== null && (
                          <button
                            onClick={() => handleDeleteSymptom(symptom.id)}
                            className="text-xs text-red-500 transition hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {showAddSymptom ? (
                <form
                  onSubmit={handleAddSymptom}
                  className="mt-2 space-y-3 rounded-lg border border-sage-200 bg-sage-50 p-4"
                >
                  <h3 className="text-sm font-semibold text-sage-800">Add Custom Symptom</h3>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-sage-600">Name *</label>
                    <input
                      type="text"
                      value={newSymptomName}
                      onChange={(e) => setNewSymptomName(e.target.value)}
                      placeholder="Symptom name"
                      required
                      className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-sage-600">
                      Category (optional)
                    </label>
                    <input
                      type="text"
                      value={newSymptomCategory}
                      onChange={(e) => setNewSymptomCategory(e.target.value)}
                      placeholder="e.g. Neurological, Digestive"
                      className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={symptomSubmitting}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                    >
                      {symptomSubmitting ? 'Adding…' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddSymptom(false);
                        setNewSymptomName('');
                        setNewSymptomCategory('');
                      }}
                      className="rounded-lg border border-sage-300 px-4 py-2 text-sm text-sage-700 transition hover:bg-sage-100"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddSymptom(true)}
                  className="mt-2 rounded-lg border border-dashed border-teal-400 px-4 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50"
                >
                  + Add Custom Symptom
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Habits Section */}
      {activeSection === 'habits' && (
        <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-teal-800">Habits</h2>
          {habitsError && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {habitsError}
            </div>
          )}
          {habitsLoading ? (
            <p className="text-sm text-sage-500">Loading…</p>
          ) : (
            <>
              {habits.length === 0 ? (
                <p className="mb-4 text-sm text-sage-500">No habits found.</p>
              ) : (
                <ul className="mb-4 divide-y divide-sage-100">
                  {habits.map((habit) => (
                    <li key={habit.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-sage-800">{habit.name}</p>
                        <p className="text-xs text-sage-500">
                          {habit.trackingType === 'boolean'
                            ? 'Yes / No'
                            : habit.trackingType === 'duration'
                              ? 'Duration (min)'
                              : `Numeric${habit.unit ? ` · ${habit.unit}` : ''}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <ToggleSwitch
                          checked={habit.isActive}
                          onChange={() => handleToggleHabit(habit)}
                        />
                        {habit.userId !== null && (
                          <button
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="text-xs text-red-500 transition hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {showAddHabit ? (
                <form
                  onSubmit={handleAddHabit}
                  className="mt-2 space-y-3 rounded-lg border border-sage-200 bg-sage-50 p-4"
                >
                  <h3 className="text-sm font-semibold text-sage-800">Add Custom Habit</h3>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-sage-600">Name *</label>
                    <input
                      type="text"
                      value={newHabitName}
                      onChange={(e) => setNewHabitName(e.target.value)}
                      placeholder="Habit name"
                      required
                      className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-sage-600">
                      Tracking Type
                    </label>
                    <select
                      value={newHabitType}
                      onChange={(e) => setNewHabitType(e.target.value as Habit['trackingType'])}
                      className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    >
                      <option value="boolean">Yes / No</option>
                      <option value="numeric">Numeric</option>
                      <option value="duration">Duration (minutes)</option>
                    </select>
                  </div>
                  {newHabitType === 'numeric' && (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-sage-600">
                        Unit (optional)
                      </label>
                      <input
                        type="text"
                        value={newHabitUnit}
                        onChange={(e) => setNewHabitUnit(e.target.value)}
                        placeholder="e.g. glasses, km, pages"
                        className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={habitSubmitting}
                      className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                    >
                      {habitSubmitting ? 'Adding…' : 'Add'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddHabit(false);
                        setNewHabitName('');
                        setNewHabitUnit('');
                        setNewHabitType('boolean');
                      }}
                      className="rounded-lg border border-sage-300 px-4 py-2 text-sm text-sage-700 transition hover:bg-sage-100"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddHabit(true)}
                  className="mt-2 rounded-lg border border-dashed border-teal-400 px-4 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50"
                >
                  + Add Custom Habit
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Medications Section */}
      {activeSection === 'medications' && (
        <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-teal-800">Medications</h2>
          {medsError && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {medsError}
            </div>
          )}
          {medsLoading ? (
            <p className="text-sm text-sage-500">Loading…</p>
          ) : (
            <>
              {medications.length === 0 ? (
                <p className="mb-4 text-sm text-sage-500">No medications added yet.</p>
              ) : (
                <ul className="mb-4 divide-y divide-sage-100">
                  {medications.map((med) => (
                    <li key={med.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p
                          className={`truncate text-sm font-medium ${
                            med.isActive ? 'text-sage-800' : 'text-sage-400 line-through'
                          }`}
                        >
                          {med.name}
                        </p>
                        {(med.dosage || med.frequency) && (
                          <p className="text-xs text-sage-500">
                            {[med.dosage, med.frequency].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => openEditMed(med)}
                          className="rounded px-2 py-1 text-xs text-teal-600 transition hover:bg-teal-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleMed(med)}
                          className={`rounded px-2 py-1 text-xs transition ${
                            med.isActive
                              ? 'text-amber-600 hover:bg-amber-50'
                              : 'text-teal-600 hover:bg-teal-50'
                          }`}
                        >
                          {med.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => handleDeleteMed(med.id)}
                          className="rounded px-2 py-1 text-xs text-red-500 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <button
                onClick={openAddMed}
                className="rounded-lg border border-dashed border-teal-400 px-4 py-2 text-sm font-medium text-teal-600 transition hover:bg-teal-50"
              >
                + Add Medication
              </button>
            </>
          )}
        </div>
      )}

      {/* Data Section */}
      {activeSection === 'data' && (
        <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-teal-800">Data</h2>
          <p className="mb-4 text-sm text-sage-600">
            Export all your health logs as a CSV file for use in spreadsheets or sharing with your
            healthcare provider.
          </p>
          <button
            onClick={handleExportCsv}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            Export as CSV
          </button>
        </div>
      )}

      {/* Account Section */}
      {activeSection === 'account' && (
        <div className="rounded-xl border border-sage-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-teal-800">Account</h2>
          <div className="space-y-6">
            <div>
              <h3 className="mb-1 text-sm font-semibold text-sage-700">Sign Out</h3>
              <p className="mb-3 text-sm text-sage-500">Sign out of your account on this device.</p>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-sage-300 px-4 py-2 text-sm font-medium text-sage-700 transition hover:bg-sage-100"
              >
                Sign Out
              </button>
            </div>

            <div className="border-t border-sage-200 pt-6">
              <h3 className="mb-1 text-sm font-semibold text-red-600">Danger Zone</h3>
              <p className="mb-3 text-sm text-sage-500">
                Permanently delete your account and all associated data. This action cannot be
                undone.
              </p>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Delete Account
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  {deleteError && <p className="text-sm text-red-700">{deleteError}</p>}
                  <p className="text-sm font-medium text-red-700">
                    Type <span className="font-mono font-bold">DELETE</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder="DELETE"
                    className="w-full max-w-xs rounded-lg border border-red-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteText !== 'DELETE' || isDeleting}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDeleting ? 'Deleting…' : 'Permanently Delete Account'}
                    </button>
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteText('');
                        setDeleteError('');
                      }}
                      className="rounded-lg border border-sage-300 px-4 py-2 text-sm text-sage-700 transition hover:bg-sage-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Medication modal */}
      {showMedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-xl font-bold text-teal-800">
              {editingMed ? 'Edit Medication' : 'Add Medication'}
            </h2>
            {medModalError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {medModalError}
              </div>
            )}
            <form onSubmit={handleMedSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-sage-700">Name *</label>
                <input
                  type="text"
                  value={medName}
                  onChange={(e) => setMedName(e.target.value)}
                  placeholder="Medication name"
                  required
                  className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-sage-700">
                  Dosage (optional)
                </label>
                <input
                  type="text"
                  value={medDosage}
                  onChange={(e) => setMedDosage(e.target.value)}
                  placeholder="e.g. 10mg"
                  className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-sage-700">
                  Frequency (optional)
                </label>
                <input
                  type="text"
                  value={medFrequency}
                  onChange={(e) => setMedFrequency(e.target.value)}
                  placeholder="e.g. Once daily"
                  className="w-full rounded-lg border border-sage-300 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMedModal(false)}
                  className="rounded-lg border border-sage-300 px-4 py-2 text-sm text-sage-700 transition hover:bg-sage-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={medSubmitting}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
                >
                  {medSubmitting ? 'Saving…' : editingMed ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
