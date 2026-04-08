import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    medication: {
      findUnique: jest.fn(),
    },
    medicationLog: {
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

const medication = {
  id: 'med-uuid-1',
  userId,
  name: 'Ibuprofen',
  dosage: '400mg',
  frequency: 'twice daily',
  isActive: true,
  createdAt: new Date('2026-04-01T08:00:00Z'),
};

const medicationLog = {
  id: 'med-log-uuid-1',
  userId,
  medicationId: medication.id,
  taken: true,
  takenAt: new Date('2026-04-01T08:00:00Z'),
  notes: 'Taken with food',
  loggedAt: new Date('2026-04-01T08:00:00Z'),
  createdAt: new Date('2026-04-01T08:00:00Z'),
};

const otherUserLog = {
  id: 'med-log-uuid-2',
  userId: otherUserId,
  medicationId: 'med-uuid-other',
  taken: false,
  takenAt: null,
  notes: null,
  loggedAt: new Date('2026-04-01T07:00:00Z'),
  createdAt: new Date('2026-04-01T07:00:00Z'),
};

function makeToken(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: '15m' });
}

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
});

describe('GET /api/medication-logs', () => {
  it('returns 200 with user medication logs', async () => {
    (mockPrisma.medicationLog.findMany as jest.Mock).mockResolvedValue([medicationLog]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.medicationLogs).toHaveLength(1);
    expect(mockPrisma.medicationLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId }) }),
    );
  });

  it('filters by startDate and endDate', async () => {
    (mockPrisma.medicationLog.findMany as jest.Mock).mockResolvedValue([medicationLog]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/medication-logs?startDate=2026-04-01&endDate=2026-04-02')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(mockPrisma.medicationLog.findMany).toHaveBeenCalledWith(
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
      .get('/api/medication-logs?startDate=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid endDate', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/medication-logs?endDate=not-a-date')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/medication-logs');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/medication-logs', () => {
  it('returns 201 with created medication log', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(medication);
    (mockPrisma.medicationLog.create as jest.Mock).mockResolvedValue(medicationLog);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicationId: medication.id, taken: true, notes: 'Taken with food' });

    expect(res.status).toBe(201);
    expect(res.body.medicationLog).toMatchObject({ taken: true });
  });

  it('returns 201 with taken=false', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(medication);
    const notTakenLog = { ...medicationLog, taken: false, takenAt: null };
    (mockPrisma.medicationLog.create as jest.Mock).mockResolvedValue(notTakenLog);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicationId: medication.id, taken: false });

    expect(res.status).toBe(201);
    expect(res.body.medicationLog.taken).toBe(false);
  });

  it('returns 400 when medicationId is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ taken: true });

    expect(res.status).toBe(400);
  });

  it('returns 400 when taken is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicationId: medication.id });

    expect(res.status).toBe(400);
  });

  it('returns 400 when taken is not a boolean', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicationId: medication.id, taken: 'yes' });

    expect(res.status).toBe(400);
  });

  it('returns 404 when medication does not exist', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicationId: 'nonexistent-id', taken: true });

    expect(res.status).toBe(404);
  });

  it('returns 403 when logging another user\'s medication', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue({
      ...medication,
      userId: otherUserId,
    });
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicationId: medication.id, taken: true });

    expect(res.status).toBe(403);
  });

  it('returns 400 when takenAt is invalid', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(medication);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicationId: medication.id, taken: true, takenAt: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when loggedAt is invalid', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(medication);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medication-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({ medicationId: medication.id, taken: true, loggedAt: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/medication-logs')
      .send({ medicationId: medication.id, taken: true });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/medication-logs/:id', () => {
  it('returns 200 with updated medication log', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(medicationLog);
    const updated = { ...medicationLog, taken: false };
    (mockPrisma.medicationLog.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medication-logs/${medicationLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ taken: false });

    expect(res.status).toBe(200);
    expect(res.body.medicationLog.taken).toBe(false);
  });

  it('returns 404 when log does not exist', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .patch('/api/medication-logs/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ taken: false });

    expect(res.status).toBe(404);
  });

  it('returns 403 when updating another user\'s log', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(otherUserLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medication-logs/${otherUserLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ taken: false });

    expect(res.status).toBe(403);
  });

  it('returns 400 when no fields provided', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(medicationLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medication-logs/${medicationLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when taken is not a boolean', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(medicationLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medication-logs/${medicationLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ taken: 'yes' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when takenAt is invalid', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(medicationLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medication-logs/${medicationLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ takenAt: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when loggedAt is invalid', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(medicationLog);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medication-logs/${medicationLog.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ loggedAt: 'not-a-date' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/medication-logs/${medicationLog.id}`)
      .send({ taken: false });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/medication-logs/:id', () => {
  it('returns 204 on successful deletion', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(medicationLog);
    (mockPrisma.medicationLog.delete as jest.Mock).mockResolvedValue(medicationLog);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/medication-logs/${medicationLog.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(mockPrisma.medicationLog.delete).toHaveBeenCalledWith({ where: { id: medicationLog.id } });
  });

  it('returns 404 when log does not exist', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .delete('/api/medication-logs/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when deleting another user\'s log', async () => {
    (mockPrisma.medicationLog.findUnique as jest.Mock).mockResolvedValue(otherUserLog);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/medication-logs/${otherUserLog.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).delete(`/api/medication-logs/${medicationLog.id}`);
    expect(res.status).toBe(401);
  });
});
