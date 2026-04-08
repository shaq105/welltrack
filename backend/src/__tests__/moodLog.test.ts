import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    moodLog: {
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

const moodLog = {
  id: 'mood-log-uuid-1',
  userId,
  moodScore: 4,
  energyLevel: 3,
  stressLevel: 2,
  notes: 'Feeling pretty good today',
  loggedAt: new Date('2026-04-01T10:00:00Z'),
  createdAt: new Date('2026-04-01T10:00:00Z'),
};

const otherUserLog = {
  id: 'mood-log-uuid-2',
  userId: otherUserId,
  moodScore: 3,
  energyLevel: null,
  stressLevel: null,
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

describe('GET /api/mood-logs', () => {
  it('returns 200 with user mood logs', async () => {
    (mockPrisma.moodLog.findMany as jest.Mock).mockResolvedValue([moodLog]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/mood-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.moodLogs).toHaveLength(1);
    expect(mockPrisma.moodLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId }) }),
    );
  });

  it('filters by startDate and endDate', async () => {
    (mockPrisma.moodLog.findMany as jest.Mock).mockResolvedValue([moodLog]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/mood-logs?startDate=2026-04-01&endDate=2026-04-02')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockPrisma.moodLog.findMany).toHaveBeenCalledWith(
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
      .get('/api/mood-logs?startDate=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid endDate', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/mood-logs?endDate=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/mood-logs');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/mood-logs', () => {
  it('returns 201 with created mood log', async () => {
    (mockPrisma.moodLog.create as jest.Mock).mockResolvedValue(moodLog);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 4, energyLevel: 3, stressLevel: 2, notes: 'Feeling pretty good today' });

    expect(res.status).toBe(201);
    expect(res.body.moodLog).toMatchObject({ moodScore: 4, energyLevel: 3, stressLevel: 2 });
  });

  it('returns 201 with only moodScore (optional fields omitted)', async () => {
    const minimalLog = { ...moodLog, moodScore: 3, energyLevel: null, stressLevel: null, notes: null };
    (mockPrisma.moodLog.create as jest.Mock).mockResolvedValue(minimalLog);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 3 });

    expect(res.status).toBe(201);
    expect(res.body.moodLog.moodScore).toBe(3);
  });

  it('returns 400 when moodScore is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ energyLevel: 3 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when moodScore is below 1', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 0 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when moodScore is above 5', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 6 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when energyLevel is out of range', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 3, energyLevel: 0 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when stressLevel is out of range', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 3, stressLevel: 6 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when loggedAt is invalid', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/mood-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 3, loggedAt: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/mood-logs')
      .send({ moodScore: 3 });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/mood-logs/:id', () => {
  it('returns 200 with updated mood log', async () => {
    (mockPrisma.moodLog.findUnique as jest.Mock).mockResolvedValue(moodLog);
    const updated = { ...moodLog, moodScore: 2 };
    (mockPrisma.moodLog.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/mood-logs/${moodLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 2 });

    expect(res.status).toBe(200);
    expect(res.body.moodLog.moodScore).toBe(2);
  });

  it('returns 404 when log does not exist', async () => {
    (mockPrisma.moodLog.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .patch('/api/mood-logs/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 3 });

    expect(res.status).toBe(404);
  });

  it('returns 403 when updating another user\'s log', async () => {
    (mockPrisma.moodLog.findUnique as jest.Mock).mockResolvedValue(otherUserLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/mood-logs/${otherUserLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 3 });

    expect(res.status).toBe(403);
  });

  it('returns 400 when no fields provided', async () => {
    (mockPrisma.moodLog.findUnique as jest.Mock).mockResolvedValue(moodLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/mood-logs/${moodLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when moodScore is out of range', async () => {
    (mockPrisma.moodLog.findUnique as jest.Mock).mockResolvedValue(moodLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/mood-logs/${moodLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ moodScore: 10 });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/mood-logs/${moodLog.id}`)
      .send({ moodScore: 3 });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/mood-logs/:id', () => {
  it('returns 204 on successful deletion', async () => {
    (mockPrisma.moodLog.findUnique as jest.Mock).mockResolvedValue(moodLog);
    (mockPrisma.moodLog.delete as jest.Mock).mockResolvedValue(moodLog);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/mood-logs/${moodLog.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(mockPrisma.moodLog.delete).toHaveBeenCalledWith({ where: { id: moodLog.id } });
  });

  it('returns 404 when log does not exist', async () => {
    (mockPrisma.moodLog.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .delete('/api/mood-logs/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when deleting another user\'s log', async () => {
    (mockPrisma.moodLog.findUnique as jest.Mock).mockResolvedValue(otherUserLog);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/mood-logs/${otherUserLog.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).delete(`/api/mood-logs/${moodLog.id}`);
    expect(res.status).toBe(401);
  });
});
