import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    habit: {
      findUnique: jest.fn(),
    },
    habitLog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const JWT_SECRET = 'test-secret';

const userId = 'user-uuid-1';
const otherUserId = 'user-uuid-2';

const booleanHabit = {
  id: 'habit-uuid-1',
  userId,
  name: 'Exercise',
  trackingType: 'boolean' as const,
  unit: null,
  isActive: true,
};

const numericHabit = {
  id: 'habit-uuid-2',
  userId,
  name: 'Water Intake',
  trackingType: 'numeric' as const,
  unit: 'glasses',
  isActive: true,
};

const durationHabit = {
  id: 'habit-uuid-3',
  userId,
  name: 'Sleep',
  trackingType: 'duration' as const,
  unit: 'minutes',
  isActive: true,
};

const systemHabit = {
  id: 'habit-uuid-sys',
  userId: null,
  name: 'Sleep Duration',
  trackingType: 'duration' as const,
  unit: 'minutes',
  isActive: true,
};

const booleanHabitLog = {
  id: 'hlog-uuid-1',
  userId,
  habitId: booleanHabit.id,
  valueBoolean: true,
  valueNumeric: null,
  valueDuration: null,
  notes: 'Went for a run',
  loggedAt: new Date('2026-04-01T10:00:00Z'),
  createdAt: new Date('2026-04-01T10:00:00Z'),
};

const otherUserLog = {
  id: 'hlog-uuid-2',
  userId: otherUserId,
  habitId: 'habit-uuid-other',
  valueBoolean: false,
  valueNumeric: null,
  valueDuration: null,
  notes: null,
  loggedAt: new Date('2026-04-01T09:00:00Z'),
  createdAt: new Date('2026-04-01T09:00:00Z'),
};

function makeToken(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: '15m' });
}

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
});

describe('GET /api/habit-logs', () => {
  it('returns 200 with user habit logs', async () => {
    (mockPrisma.habitLog.findMany as jest.Mock).mockResolvedValue([booleanHabitLog]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.habitLogs).toHaveLength(1);
    expect(mockPrisma.habitLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId }) }),
    );
  });

  it('filters by startDate and endDate', async () => {
    (mockPrisma.habitLog.findMany as jest.Mock).mockResolvedValue([booleanHabitLog]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/habit-logs?startDate=2026-04-01&endDate=2026-04-02')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockPrisma.habitLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          loggedAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('returns 400 for invalid startDate', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/habit-logs?startDate=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid endDate', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/habit-logs?endDate=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/habit-logs');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/habit-logs (boolean)', () => {
  it('returns 201 with boolean habit log', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(booleanHabit);
    (mockPrisma.habitLog.create as jest.Mock).mockResolvedValue(booleanHabitLog);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: booleanHabit.id, valueBoolean: true });

    expect(res.status).toBe(201);
    expect(res.body.habitLog.valueBoolean).toBe(true);
  });

  it('returns 400 when valueBoolean is missing for boolean type', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(booleanHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: booleanHabit.id });

    expect(res.status).toBe(400);
  });

  it('returns 400 when valueBoolean is not a boolean', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(booleanHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: booleanHabit.id, valueBoolean: 'yes' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/habit-logs (numeric)', () => {
  it('returns 201 with numeric habit log', async () => {
    const numericLog = { ...booleanHabitLog, habitId: numericHabit.id, valueBoolean: null, valueNumeric: 8.5 };
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(numericHabit);
    (mockPrisma.habitLog.create as jest.Mock).mockResolvedValue(numericLog);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: numericHabit.id, valueNumeric: 8.5 });

    expect(res.status).toBe(201);
    expect(res.body.habitLog.valueNumeric).toBe(8.5);
  });

  it('returns 400 when valueNumeric is missing for numeric type', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(numericHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: numericHabit.id });

    expect(res.status).toBe(400);
  });

  it('returns 400 when valueNumeric is not a number', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(numericHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: numericHabit.id, valueNumeric: 'eight' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/habit-logs (duration)', () => {
  it('returns 201 with duration habit log', async () => {
    const durationLog = { ...booleanHabitLog, habitId: durationHabit.id, valueBoolean: null, valueDuration: 480 };
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(durationHabit);
    (mockPrisma.habitLog.create as jest.Mock).mockResolvedValue(durationLog);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: durationHabit.id, valueDuration: 480 });

    expect(res.status).toBe(201);
    expect(res.body.habitLog.valueDuration).toBe(480);
  });

  it('returns 400 when valueDuration is missing for duration type', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(durationHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: durationHabit.id });

    expect(res.status).toBe(400);
  });

  it('returns 400 when valueDuration is not an integer', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(durationHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: durationHabit.id, valueDuration: 7.5 });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/habit-logs (general)', () => {
  it('allows logging a system habit', async () => {
    const sysLog = { ...booleanHabitLog, habitId: systemHabit.id, valueBoolean: null, valueDuration: 480 };
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(systemHabit);
    (mockPrisma.habitLog.create as jest.Mock).mockResolvedValue(sysLog);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: systemHabit.id, valueDuration: 480 });

    expect(res.status).toBe(201);
  });

  it('returns 400 when habitId is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ valueBoolean: true });

    expect(res.status).toBe(400);
  });

  it('returns 404 when habit does not exist', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: 'nonexistent-id', valueBoolean: true });

    expect(res.status).toBe(404);
  });

  it('returns 403 when logging another user\'s habit', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue({
      ...booleanHabit,
      userId: otherUserId,
    });
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: booleanHabit.id, valueBoolean: true });

    expect(res.status).toBe(403);
  });

  it('returns 400 when loggedAt is invalid', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(booleanHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habit-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ habitId: booleanHabit.id, valueBoolean: true, loggedAt: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/habit-logs')
      .send({ habitId: booleanHabit.id, valueBoolean: true });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/habit-logs/:id', () => {
  it('returns 200 with updated habit log', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(booleanHabitLog);
    const updated = { ...booleanHabitLog, valueBoolean: false };
    (mockPrisma.habitLog.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habit-logs/${booleanHabitLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ valueBoolean: false });

    expect(res.status).toBe(200);
    expect(res.body.habitLog.valueBoolean).toBe(false);
  });

  it('returns 404 when log does not exist', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .patch('/api/habit-logs/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ valueBoolean: false });

    expect(res.status).toBe(404);
  });

  it('returns 403 when updating another user\'s log', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(otherUserLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habit-logs/${otherUserLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ valueBoolean: false });

    expect(res.status).toBe(403);
  });

  it('returns 400 when no fields provided', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(booleanHabitLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habit-logs/${booleanHabitLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when valueBoolean is not a boolean', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(booleanHabitLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habit-logs/${booleanHabitLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ valueBoolean: 'yes' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when valueDuration is not an integer', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(booleanHabitLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habit-logs/${booleanHabitLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ valueDuration: 7.5 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when loggedAt is invalid', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(booleanHabitLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habit-logs/${booleanHabitLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ loggedAt: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/habit-logs/${booleanHabitLog.id}`)
      .send({ valueBoolean: false });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/habit-logs/:id', () => {
  it('returns 204 on successful deletion', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(booleanHabitLog);
    (mockPrisma.habitLog.delete as jest.Mock).mockResolvedValue(booleanHabitLog);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/habit-logs/${booleanHabitLog.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(mockPrisma.habitLog.delete).toHaveBeenCalledWith({ where: { id: booleanHabitLog.id } });
  });

  it('returns 404 when log does not exist', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .delete('/api/habit-logs/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when deleting another user\'s log', async () => {
    (mockPrisma.habitLog.findUnique as jest.Mock).mockResolvedValue(otherUserLog);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/habit-logs/${otherUserLog.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).delete(`/api/habit-logs/${booleanHabitLog.id}`);
    expect(res.status).toBe(401);
  });
});
