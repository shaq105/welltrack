import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    symptom: {
      findUnique: jest.fn(),
    },
    symptomLog: {
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

const systemSymptom = {
  id: 'symptom-system-1',
  userId: null,
  name: 'Headache',
  category: 'pain',
  isActive: true,
};

const symptomLog = {
  id: 'log-uuid-1',
  userId,
  symptomId: systemSymptom.id,
  severity: 7,
  notes: 'Throbbing pain',
  loggedAt: new Date('2026-04-01T10:00:00Z'),
  createdAt: new Date('2026-04-01T10:00:00Z'),
  symptom: { id: systemSymptom.id, name: 'Headache', category: 'pain' },
};

const otherUserLog = {
  id: 'log-uuid-2',
  userId: otherUserId,
  symptomId: systemSymptom.id,
  severity: 5,
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

describe('GET /api/symptom-logs', () => {
  it('returns 200 with user\'s symptom logs', async () => {
    (mockPrisma.symptomLog.findMany as jest.Mock).mockResolvedValue([symptomLog]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/symptom-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.symptomLogs).toHaveLength(1);
    expect(mockPrisma.symptomLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId }) }),
    );
  });

  it('filters by startDate and endDate', async () => {
    (mockPrisma.symptomLog.findMany as jest.Mock).mockResolvedValue([symptomLog]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/symptom-logs?startDate=2026-04-01&endDate=2026-04-02')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockPrisma.symptomLog.findMany).toHaveBeenCalledWith(
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

  it('applies limit and offset', async () => {
    (mockPrisma.symptomLog.findMany as jest.Mock).mockResolvedValue([symptomLog]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/symptom-logs?limit=10&offset=5')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockPrisma.symptomLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10, skip: 5 }),
    );
  });

  it('returns 400 for invalid startDate', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/symptom-logs?startDate=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid limit', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/symptom-logs?limit=0')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/symptom-logs');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/symptom-logs', () => {
  it('returns 201 with created symptom log', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(systemSymptom);
    (mockPrisma.symptomLog.create as jest.Mock).mockResolvedValue(symptomLog);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ symptomId: systemSymptom.id, severity: 7, notes: 'Throbbing pain' });

    expect(res.status).toBe(201);
    expect(res.body.symptomLog).toMatchObject({ severity: 7, notes: 'Throbbing pain' });
  });

  it('returns 400 when symptomId is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ severity: 5 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when severity is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ symptomId: systemSymptom.id });

    expect(res.status).toBe(400);
  });

  it('returns 400 when severity is below 1', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ symptomId: systemSymptom.id, severity: 0 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when severity is above 10', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ symptomId: systemSymptom.id, severity: 11 });

    expect(res.status).toBe(400);
  });

  it('returns 404 when symptom does not exist', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ symptomId: 'nonexistent', severity: 5 });

    expect(res.status).toBe(404);
  });

  it('returns 403 when logging another user\'s custom symptom', async () => {
    const otherCustomSymptom = { ...systemSymptom, userId: otherUserId };
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(otherCustomSymptom);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptom-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ symptomId: otherCustomSymptom.id, severity: 5 });

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/symptom-logs')
      .send({ symptomId: systemSymptom.id, severity: 5 });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/symptom-logs/:id', () => {
  it('returns 200 with updated symptom log', async () => {
    (mockPrisma.symptomLog.findUnique as jest.Mock).mockResolvedValue(symptomLog);
    const updated = { ...symptomLog, severity: 4 };
    (mockPrisma.symptomLog.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/symptom-logs/${symptomLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ severity: 4 });

    expect(res.status).toBe(200);
    expect(res.body.symptomLog.severity).toBe(4);
  });

  it('returns 404 when log does not exist', async () => {
    (mockPrisma.symptomLog.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .patch('/api/symptom-logs/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ severity: 4 });

    expect(res.status).toBe(404);
  });

  it('returns 403 when updating another user\'s log', async () => {
    (mockPrisma.symptomLog.findUnique as jest.Mock).mockResolvedValue(otherUserLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/symptom-logs/${otherUserLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ severity: 3 });

    expect(res.status).toBe(403);
  });

  it('returns 400 when severity is out of range', async () => {
    (mockPrisma.symptomLog.findUnique as jest.Mock).mockResolvedValue(symptomLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/symptom-logs/${symptomLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ severity: 15 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when no valid fields provided', async () => {
    (mockPrisma.symptomLog.findUnique as jest.Mock).mockResolvedValue(symptomLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/symptom-logs/${symptomLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/symptom-logs/${symptomLog.id}`)
      .send({ severity: 4 });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/symptom-logs/:id', () => {
  it('returns 204 on successful deletion', async () => {
    (mockPrisma.symptomLog.findUnique as jest.Mock).mockResolvedValue(symptomLog);
    (mockPrisma.symptomLog.delete as jest.Mock).mockResolvedValue(symptomLog);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/symptom-logs/${symptomLog.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(mockPrisma.symptomLog.delete).toHaveBeenCalledWith({ where: { id: symptomLog.id } });
  });

  it('returns 404 when log does not exist', async () => {
    (mockPrisma.symptomLog.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .delete('/api/symptom-logs/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when deleting another user\'s log', async () => {
    (mockPrisma.symptomLog.findUnique as jest.Mock).mockResolvedValue(otherUserLog);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/symptom-logs/${otherUserLog.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).delete(`/api/symptom-logs/${symptomLog.id}`);
    expect(res.status).toBe(401);
  });
});
