export interface Symptom {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
  userId: string | null;
}

export interface SymptomLog {
  id: string;
  userId: string;
  symptomId: string;
  severity: number;
  notes: string | null;
  loggedAt: string;
  symptom?: Pick<Symptom, 'id' | 'name' | 'category'>;
}

export interface MoodLog {
  id: string;
  userId: string;
  moodScore: number;
  energyLevel: number | null;
  stressLevel: number | null;
  notes: string | null;
  loggedAt: string;
}

export interface Medication {
  id: string;
  userId: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  isActive: boolean;
}

export interface MedicationLog {
  id: string;
  userId: string;
  medicationId: string;
  taken: boolean;
  takenAt: string | null;
  notes: string | null;
  loggedAt: string;
  medication?: Pick<Medication, 'id' | 'name' | 'dosage'>;
}

export interface Habit {
  id: string;
  userId: string | null;
  name: string;
  trackingType: 'boolean' | 'numeric' | 'duration';
  unit: string | null;
  isActive: boolean;
}

export interface HabitLog {
  id: string;
  userId: string;
  habitId: string;
  valueBoolean: boolean | null;
  valueNumeric: number | null;
  valueDuration: number | null;
  notes: string | null;
  loggedAt: string;
  habit?: Pick<Habit, 'name' | 'trackingType' | 'unit'>;
}

export interface Correlation {
  habitName: string;
  outcomeType: 'mood' | 'energy' | 'stress' | 'symptom';
  outcomeName: string;
  withHabit: number;
  withoutHabit: number;
  difference: number;
  direction: 'positive' | 'negative';
  sampleSize: number;
  description: string;
}

export interface CorrelationMeta {
  daysAnalyzed: number;
  habitsTracked: number;
  hasEnoughData: boolean;
  message: string | null;
}
