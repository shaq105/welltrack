import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    symptomLog: { findMany: jest.fn() },
    moodLog: { findMany: jest.fn() },
    medicationLog: { findMany: jest.fn() },
    habitLog: { findMany: jest.fn() },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const JWT_SECRET = 'test-secret';
const userId = 'user-uuid-1';

function makeToken(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: '15m' });
}

const symptomLogData = {
  id: 'sl-1',
  userId,
  symptomId: 'sym-1',
  severity: 7,
  notes: 'Throbbing pain',
  loggedAt: new Date('2026-04-01T10:00:00Z'),
  createdAt: new Date('2026-04-01T10:00:00Z'),
  symptom: { name: 'Headache' },
};

const moodLogData = {
  id: 'ml-1',
  userId,
  moodScore: 3,
  energyLevel: 2,
  stressLevel: 4,
  notes: 'Rough day',
  loggedAt: new Date('2026-04-01T20:00:00Z'),
  createdAt: new Date('2026-04-01T20:00:00Z'),
};

const medicationLogData = {
  id: 'medl-1',
  userId,
  medicationId: 'med-1',
  taken: true,
  takenAt: new Date('2026-04-01T08:00:00Z'),
  notes: null,
  loggedAt: new Date('2026-04-01T08:00:00Z'),
  createdAt: new Date('2026-04-01T08:00:00Z'),
  medication: { name: 'Ibuprofen' },
};

const habitLogData = {
  id: 'hl-1',
  userId,
  habitId: 'hab-1',
  valueBoolean: null,
  valueNumeric: 8,
  valueDuration: null,
  notes: 'Good intake',
  loggedAt: new Date('2026-04-01T09:00:00Z'),
  createdAt: new Date('2026-04-01T09:00:00Z'),
  habit: { name: 'Water Intake', trackingType: 'numeric' },
};

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
  (mockPrisma.symptomLog.findMany as jest.Mock).mockResolvedValue([]);
  (mockPrisma.moodLog.findMany as jest.Mock).mockResolvedValue([]);
  (mockPrisma.medicationLog.findMany as jest.Mock).mockResolvedValue([]);
  (mockPrisma.habitLog.findMany as jest.Mock).mockResolvedValue([]);
});

describe('GET /api/export/csv', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/export/csv');
    expect(res.status).toBe(401);
  });

  it('returns CSV with correct headers', async () => {
    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['content-disposition']).toMatch(/welltrack-export\.csv/);

    const lines = res.text.split('\n');
    expect(lines[0]).toBe(
      'type,logged_at,symptom_name,severity,mood_score,energy_level,stress_level,medication_name,taken,habit_name,habit_value,notes',
    );
  });

  it('returns only the header row when no logs exist', async () => {
    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const lines = res.text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(1);
  });

  it('includes a symptom log row with correct fields', async () => {
    (mockPrisma.symptomLog.findMany as jest.Mock).mockResolvedValue([symptomLogData]);
    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const lines = res.text.split('\n').filter(Boolean);
    expect(lines).toHaveLength(2); // header + data row
    const row = lines[1];
    expect(row).toContain('symptom_log');
    expect(row).toContain('Headache');
    expect(row).toContain('7');
    expect(row).toContain('Throbbing pain');
  });

  it('includes a mood log row with correct fields', async () => {
    (mockPrisma.moodLog.findMany as jest.Mock).mockResolvedValue([moodLogData]);
    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const rows = res.text.split('\n').filter(Boolean);
    expect(rows).toHaveLength(2);
    const row = rows[1];
    expect(row).toContain('mood_log');
    expect(row).toContain('3'); // mood_score
    expect(row).toContain('2'); // energy_level
    expect(row).toContain('4'); // stress_level
    expect(row).toContain('Rough day');
  });

  it('includes a medication log row with correct fields', async () => {
    (mockPrisma.medicationLog.findMany as jest.Mock).mockResolvedValue([medicationLogData]);
    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const rows = res.text.split('\n').filter(Boolean);
    expect(rows).toHaveLength(2);
    const row = rows[1];
    expect(row).toContain('medication_log');
    expect(row).toContain('Ibuprofen');
    expect(row).toContain('true');
  });

  it('includes a habit log row with correct fields', async () => {
    (mockPrisma.habitLog.findMany as jest.Mock).mockResolvedValue([habitLogData]);
    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const rows = res.text.split('\n').filter(Boolean);
    expect(rows).toHaveLength(2);
    const row = rows[1];
    expect(row).toContain('habit_log');
    expect(row).toContain('Water Intake');
    expect(row).toContain('8');
    expect(row).toContain('Good intake');
  });

  it('includes rows for all log types when all have data', async () => {
    (mockPrisma.symptomLog.findMany as jest.Mock).mockResolvedValue([symptomLogData]);
    (mockPrisma.moodLog.findMany as jest.Mock).mockResolvedValue([moodLogData]);
    (mockPrisma.medicationLog.findMany as jest.Mock).mockResolvedValue([medicationLogData]);
    (mockPrisma.habitLog.findMany as jest.Mock).mockResolvedValue([habitLogData]);

    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const rows = res.text.split('\n').filter(Boolean);
    expect(rows).toHaveLength(5); // header + 4 data rows
    expect(rows.some((r) => r.startsWith('symptom_log'))).toBe(true);
    expect(rows.some((r) => r.startsWith('mood_log'))).toBe(true);
    expect(rows.some((r) => r.startsWith('medication_log'))).toBe(true);
    expect(rows.some((r) => r.startsWith('habit_log'))).toBe(true);
  });

  it('passes startDate and endDate filters to prisma queries', async () => {
    const token = makeToken(userId);
    await request(app)
      .get('/api/export/csv?startDate=2026-04-01T00:00:00Z&endDate=2026-04-07T23:59:59Z')
      .set('Authorization', `Bearer ${token}`);

    const expectedFilter = {
      gte: new Date('2026-04-01T00:00:00Z'),
      lte: new Date('2026-04-07T23:59:59Z'),
    };

    expect(mockPrisma.symptomLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId, loggedAt: expectedFilter }),
      }),
    );
    expect(mockPrisma.moodLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId, loggedAt: expectedFilter }),
      }),
    );
  });

  it('returns 400 for an invalid startDate', async () => {
    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv?startDate=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/startDate/);
  });

  it('returns 400 for an invalid endDate', async () => {
    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv?endDate=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/endDate/);
  });

  it('escapes commas in notes fields', async () => {
    const logWithComma = {
      ...symptomLogData,
      notes: 'pain, severe, throbbing',
    };
    (mockPrisma.symptomLog.findMany as jest.Mock).mockResolvedValue([logWithComma]);

    const token = makeToken(userId);
    const res = await request(app)
      .get('/api/export/csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('"pain, severe, throbbing"');
  });
});
