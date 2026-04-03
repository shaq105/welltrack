import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    symptom: {
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

const customSymptom = {
  id: 'symptom-custom-1',
  userId,
  name: 'Blurry Vision',
  category: 'neurological',
  isActive: true,
};

const otherUserSymptom = {
  id: 'symptom-other-1',
  userId: otherUserId,
  name: 'Other Symptom',
  category: 'other',
  isActive: true,
};

function makeToken(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: '15m' });
}

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
});

describe('GET /api/symptoms', () => {
  it('returns 200 with system and user symptoms', async () => {
    (mockPrisma.symptom.findMany as jest.Mock).mockResolvedValue([systemSymptom, customSymptom]);
    const token = makeToken(userId);

    const res = await request(app).get('/api/symptoms').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.symptoms).toHaveLength(2);
    expect(mockPrisma.symptom.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ userId: null }, { userId }] },
      }),
    );
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/symptoms');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/symptoms', () => {
  it('returns 201 with created symptom', async () => {
    (mockPrisma.symptom.create as jest.Mock).mockResolvedValue(customSymptom);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Blurry Vision', category: 'neurological' });

    expect(res.status).toBe(201);
    expect(res.body.symptom).toMatchObject({ name: 'Blurry Vision', category: 'neurological' });
  });

  it('returns 400 when name is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${token}`)
      .send({ category: 'pain' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when category is invalid', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test', category: 'invalid-category' });

    expect(res.status).toBe(400);
  });

  it('defaults category to other when not provided', async () => {
    (mockPrisma.symptom.create as jest.Mock).mockResolvedValue({
      ...customSymptom,
      category: 'other',
    });
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/symptoms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Blurry Vision' });

    expect(res.status).toBe(201);
    expect(mockPrisma.symptom.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ category: 'other' }) }),
    );
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).post('/api/symptoms').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/symptoms/:id', () => {
  it('returns 200 with updated symptom', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(customSymptom);
    const updated = { ...customSymptom, name: 'Updated Name' };
    (mockPrisma.symptom.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/symptoms/${customSymptom.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.symptom.name).toBe('Updated Name');
  });

  it('returns 404 when symptom does not exist', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .patch('/api/symptoms/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when updating another user\'s symptom', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(otherUserSymptom);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/symptoms/${otherUserSymptom.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(403);
  });

  it('returns 403 when updating a system symptom', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(systemSymptom);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/symptoms/${systemSymptom.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(403);
  });

  it('returns 400 when no valid fields provided', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(customSymptom);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/symptoms/${customSymptom.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/symptoms/${customSymptom.id}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/symptoms/:id', () => {
  it('returns 204 on successful deletion', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(customSymptom);
    (mockPrisma.symptom.delete as jest.Mock).mockResolvedValue(customSymptom);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/symptoms/${customSymptom.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(mockPrisma.symptom.delete).toHaveBeenCalledWith({ where: { id: customSymptom.id } });
  });

  it('returns 404 when symptom does not exist', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .delete('/api/symptoms/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when deleting another user\'s symptom', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(otherUserSymptom);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/symptoms/${otherUserSymptom.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 403 when deleting a system symptom', async () => {
    (mockPrisma.symptom.findUnique as jest.Mock).mockResolvedValue(systemSymptom);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/symptoms/${systemSymptom.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).delete(`/api/symptoms/${customSymptom.id}`);
    expect(res.status).toBe(401);
  });
});
