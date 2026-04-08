import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    medication: {
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
  createdAt: new Date('2026-04-01T10:00:00Z'),
};

const otherUserMedication = {
  id: 'med-uuid-2',
  userId: otherUserId,
  name: 'Aspirin',
  dosage: '500mg',
  frequency: 'once daily',
  isActive: true,
  createdAt: new Date('2026-04-01T09:00:00Z'),
};

function makeToken(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: '15m' });
}

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
});

describe('GET /api/medications', () => {
  it('returns 200 with user medications', async () => {
    (mockPrisma.medication.findMany as jest.Mock).mockResolvedValue([medication]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/medications')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.medications).toHaveLength(1);
    expect(mockPrisma.medication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/medications');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/medications', () => {
  it('returns 201 with created medication', async () => {
    (mockPrisma.medication.create as jest.Mock).mockResolvedValue(medication);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ibuprofen', dosage: '400mg', frequency: 'twice daily' });

    expect(res.status).toBe(201);
    expect(res.body.medication).toMatchObject({ name: 'Ibuprofen', dosage: '400mg' });
  });

  it('returns 201 with only name (optional fields omitted)', async () => {
    const minimal = { ...medication, dosage: null, frequency: null };
    (mockPrisma.medication.create as jest.Mock).mockResolvedValue(minimal);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ibuprofen' });

    expect(res.status).toBe(201);
    expect(res.body.medication.name).toBe('Ibuprofen');
  });

  it('returns 400 when name is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${token}`)
      .send({ dosage: '400mg' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when name is empty string', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when dosage is not a string', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ibuprofen', dosage: 123 });

    expect(res.status).toBe(400);
  });

  it('returns 400 when frequency is not a string', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/medications')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Ibuprofen', frequency: true });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/medications')
      .send({ name: 'Ibuprofen' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/medications/:id', () => {
  it('returns 200 with updated medication', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(medication);
    const updated = { ...medication, name: 'Paracetamol' };
    (mockPrisma.medication.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medications/${medication.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Paracetamol' });

    expect(res.status).toBe(200);
    expect(res.body.medication.name).toBe('Paracetamol');
  });

  it('returns 200 when toggling isActive', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(medication);
    const updated = { ...medication, isActive: false };
    (mockPrisma.medication.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medications/${medication.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.medication.isActive).toBe(false);
  });

  it('returns 404 when medication does not exist', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .patch('/api/medications/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Other' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when updating another user\'s medication', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(otherUserMedication);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medications/${otherUserMedication.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Other' });

    expect(res.status).toBe(403);
  });

  it('returns 400 when no fields provided', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(medication);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medications/${medication.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when isActive is not a boolean', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(medication);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/medications/${medication.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: 'yes' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/medications/${medication.id}`)
      .send({ name: 'Other' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/medications/:id', () => {
  it('returns 204 on successful deletion', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(medication);
    (mockPrisma.medication.delete as jest.Mock).mockResolvedValue(medication);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/medications/${medication.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(mockPrisma.medication.delete).toHaveBeenCalledWith({ where: { id: medication.id } });
  });

  it('returns 404 when medication does not exist', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .delete('/api/medications/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when deleting another user\'s medication', async () => {
    (mockPrisma.medication.findUnique as jest.Mock).mockResolvedValue(otherUserMedication);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/medications/${otherUserMedication.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).delete(`/api/medications/${medication.id}`);
    expect(res.status).toBe(401);
  });
});
