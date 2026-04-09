import { z } from 'zod';

// ── Auth ────────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z
    .string({ error: 'email is required' })
    .email('email must be a valid email address'),
  password: z
    .string({ error: 'password is required' })
    .min(8, 'password must be at least 8 characters'),
  displayName: z
    .string({ error: 'displayName is required' })
    .min(1, 'displayName is required'),
  timezone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string({ error: 'email is required' }).min(1, 'email is required'),
  password: z.string({ error: 'password is required' }).min(1, 'password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string({ error: 'refreshToken is required' })
    .min(1, 'refreshToken is required'),
});

export const logoutSchema = z.object({
  refreshToken: z
    .string({ error: 'refreshToken is required' })
    .min(1, 'refreshToken is required'),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ error: 'email is required' })
    .email('email must be a valid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string({ error: 'token is required' }).min(1, 'token is required'),
  password: z
    .string({ error: 'password is required' })
    .min(8, 'password must be at least 8 characters'),
});

// ── Users ───────────────────────────────────────────────────────────────────

export const updateMeSchema = z
  .object({
    displayName: z.string().optional(),
    timezone: z.string().optional(),
  })
  .refine((data) => data.displayName !== undefined || data.timezone !== undefined, {
    message: 'At least one of displayName or timezone is required',
  });

// ── Symptoms ────────────────────────────────────────────────────────────────

const symptomCategoryEnum = z.enum(
  ['pain', 'neurological', 'digestive', 'respiratory', 'cardiovascular', 'mental', 'other'],
  { message: 'category must be one of: pain, neurological, digestive, respiratory, cardiovascular, mental, other' },
);

export const createSymptomSchema = z.object({
  name: z
    .string({ error: 'name is required and must be a string' })
    .min(1, 'name is required and must be a string'),
  category: symptomCategoryEnum.optional(),
});

export const updateSymptomSchema = z
  .object({
    name: z.string().min(1, 'name must be a non-empty string').optional(),
    category: symptomCategoryEnum.optional(),
    isActive: z.boolean({ message: 'isActive must be a boolean' }).optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.category !== undefined || data.isActive !== undefined,
    { message: 'At least one field is required' },
  );

// ── Symptom Logs ─────────────────────────────────────────────────────────────

export const createSymptomLogSchema = z.object({
  symptomId: z
    .string({ error: 'symptomId is required' })
    .min(1, 'symptomId is required'),
  severity: z
    .number({ error: 'severity must be an integer between 1 and 10' })
    .int('severity must be an integer between 1 and 10')
    .min(1, 'severity must be an integer between 1 and 10')
    .max(10, 'severity must be an integer between 1 and 10'),
  notes: z.string().optional(),
  loggedAt: z
    .string()
    .datetime({ message: 'loggedAt must be a valid ISO date' })
    .optional(),
});

export const updateSymptomLogSchema = z
  .object({
    severity: z
      .number({ error: 'severity must be an integer between 1 and 10' })
      .int('severity must be an integer between 1 and 10')
      .min(1, 'severity must be an integer between 1 and 10')
      .max(10, 'severity must be an integer between 1 and 10')
      .optional(),
    notes: z.string().optional(),
    loggedAt: z
      .string()
      .datetime({ message: 'loggedAt must be a valid ISO date' })
      .optional(),
  })
  .refine(
    (data) => data.severity !== undefined || data.notes !== undefined || data.loggedAt !== undefined,
    { message: 'At least one field is required' },
  );

// ── Mood Logs ────────────────────────────────────────────────────────────────

const scoreField = (name: string) =>
  z
    .number({ error: `${name} must be an integer between 1 and 5` })
    .int(`${name} must be an integer between 1 and 5`)
    .min(1, `${name} must be an integer between 1 and 5`)
    .max(5, `${name} must be an integer between 1 and 5`);

export const createMoodLogSchema = z.object({
  moodScore: scoreField('moodScore'),
  energyLevel: scoreField('energyLevel').optional(),
  stressLevel: scoreField('stressLevel').optional(),
  notes: z.string().optional(),
  loggedAt: z
    .string()
    .datetime({ message: 'loggedAt must be a valid ISO date' })
    .optional(),
});

export const updateMoodLogSchema = z
  .object({
    moodScore: scoreField('moodScore').optional(),
    energyLevel: scoreField('energyLevel').optional(),
    stressLevel: scoreField('stressLevel').optional(),
    notes: z.string().nullable().optional(),
    loggedAt: z
      .string()
      .datetime({ message: 'loggedAt must be a valid ISO date' })
      .optional(),
  })
  .refine(
    (data) =>
      data.moodScore !== undefined ||
      data.energyLevel !== undefined ||
      data.stressLevel !== undefined ||
      data.notes !== undefined ||
      data.loggedAt !== undefined,
    { message: 'At least one field is required' },
  );

// ── Medications ──────────────────────────────────────────────────────────────

export const createMedicationSchema = z.object({
  name: z
    .string({ error: 'name is required and must be a non-empty string' })
    .min(1, 'name is required and must be a non-empty string'),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
});

export const updateMedicationSchema = z
  .object({
    name: z.string().min(1, 'name must be a non-empty string').optional(),
    dosage: z.string().nullable().optional(),
    frequency: z.string().nullable().optional(),
    isActive: z.boolean({ message: 'isActive must be a boolean' }).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.dosage !== undefined ||
      data.frequency !== undefined ||
      data.isActive !== undefined,
    { message: 'At least one field is required' },
  );

// ── Medication Logs ───────────────────────────────────────────────────────────

export const createMedicationLogSchema = z.object({
  medicationId: z
    .string({ error: 'medicationId is required' })
    .min(1, 'medicationId is required'),
  taken: z.boolean({ message: 'taken must be a boolean' }),
  takenAt: z
    .string()
    .datetime({ message: 'takenAt must be a valid ISO date' })
    .optional(),
  notes: z.string().optional(),
  loggedAt: z
    .string()
    .datetime({ message: 'loggedAt must be a valid ISO date' })
    .optional(),
});

export const updateMedicationLogSchema = z
  .object({
    taken: z.boolean({ message: 'taken must be a boolean' }).optional(),
    takenAt: z
      .string()
      .datetime({ message: 'takenAt must be a valid ISO date' })
      .nullable()
      .optional(),
    notes: z.string().nullable().optional(),
    loggedAt: z
      .string()
      .datetime({ message: 'loggedAt must be a valid ISO date' })
      .optional(),
  })
  .refine(
    (data) =>
      data.taken !== undefined ||
      data.takenAt !== undefined ||
      data.notes !== undefined ||
      data.loggedAt !== undefined,
    { message: 'At least one field is required' },
  );

// ── Habits ────────────────────────────────────────────────────────────────────

const trackingTypeEnum = z.enum(
  ['boolean', 'numeric', 'duration'],
  { message: 'trackingType is required and must be one of: boolean, numeric, duration' },
);

export const createHabitSchema = z.object({
  name: z
    .string({ error: 'name is required and must be a non-empty string' })
    .trim()
    .min(1, 'name is required and must be a non-empty string'),
  trackingType: trackingTypeEnum,
  unit: z.string().optional(),
});

export const updateHabitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'name must be a non-empty string')
      .optional(),
    unit: z.string().nullable().optional(),
    isActive: z.boolean({ message: 'isActive must be a boolean' }).optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.unit !== undefined || data.isActive !== undefined,
    { message: 'At least one field is required' },
  );

// ── Habit Logs ────────────────────────────────────────────────────────────────

export const createHabitLogSchema = z.object({
  habitId: z.string({ error: 'habitId is required' }).min(1, 'habitId is required'),
  valueBoolean: z.boolean().optional(),
  valueNumeric: z.number().optional(),
  valueDuration: z.number().int('valueDuration must be an integer').optional(),
  notes: z.string().optional(),
  loggedAt: z
    .string()
    .datetime({ message: 'loggedAt must be a valid ISO date' })
    .optional(),
});

export const updateHabitLogSchema = z
  .object({
    valueBoolean: z.boolean().optional(),
    valueNumeric: z.number().optional(),
    valueDuration: z.number().int('valueDuration must be an integer').optional(),
    notes: z.string().nullable().optional(),
    loggedAt: z
      .string()
      .datetime({ message: 'loggedAt must be a valid ISO date' })
      .optional(),
  })
  .refine(
    (data) =>
      data.valueBoolean !== undefined ||
      data.valueNumeric !== undefined ||
      data.valueDuration !== undefined ||
      data.notes !== undefined ||
      data.loggedAt !== undefined,
    { message: 'At least one field is required' },
  );
