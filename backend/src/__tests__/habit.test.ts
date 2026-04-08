import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    habit: {
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

const habit = {
  id: 'habit-uuid-1',
  userId,
  name: 'Exercise',
  trackingType: 'boolean' as const,
  unit: null,
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

const otherUserHabit = {
  id: 'habit-uuid-2',
  userId: otherUserId,
  name: 'Yoga',
  trackingType: 'boolean' as const,
  unit: null,
  isActive: true,
};

function makeToken(id: string): string {
  return jwt.sign({ sub: id }, JWT_SECRET, { expiresIn: '15m' });
}

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
});

describe('GET /api/habits', () => {
  it('returns 200 with system and user habits', async () => {
    (mockPrisma.habit.findMany as jest.Mock).mockResolvedValue([systemHabit, habit]);
    const token = makeToken(userId);

    const res = await request(app)
      .get('/api/habits')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.habits).toHaveLength(2);
    expect(mockPrisma.habit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { OR: [{ userId: null }, { userId }] },
      }),
    );
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/habits');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/habits', () => {
  it('returns 201 with created habit (boolean type)', async () => {
    (mockPrisma.habit.create as jest.Mock).mockResolvedValue(habit);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Exercise', trackingType: 'boolean' });

    expect(res.status).toBe(201);
    expect(res.body.habit).toMatchObject({ name: 'Exercise', trackingType: 'boolean' });
  });

  it('returns 201 with unit for numeric type', async () => {
    const numericHabit = { ...habit, trackingType: 'numeric', unit: 'glasses' };
    (mockPrisma.habit.create as jest.Mock).mockResolvedValue(numericHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Water Intake', trackingType: 'numeric', unit: 'glasses' });

    expect(res.status).toBe(201);
    expect(res.body.habit.unit).toBe('glasses');
  });

  it('returns 400 when name is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ trackingType: 'boolean' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when name is empty string', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: '   ', trackingType: 'boolean' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when trackingType is missing', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Exercise' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when trackingType is invalid', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Exercise', trackingType: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when unit is not a string', async () => {
    const token = makeToken(userId);

    const res = await request(app)
      .post('/api/habits')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Water Intake', trackingType: 'numeric', unit: 123 });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .post('/api/habits')
      .send({ name: 'Exercise', trackingType: 'boolean' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/habits/:id', () => {
  it('returns 200 with updated habit', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(habit);
    const updated = { ...habit, name: 'Daily Exercise' };
    (mockPrisma.habit.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Daily Exercise' });

    expect(res.status).toBe(200);
    expect(res.body.habit.name).toBe('Daily Exercise');
  });

  it('returns 200 when toggling isActive', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(habit);
    const updated = { ...habit, isActive: false };
    (mockPrisma.habit.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.habit.isActive).toBe(false);
  });

  it('returns 404 when habit does not exist', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .patch('/api/habits/nonexistent-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Other' });

    expect(res.status).toBe(404);
  });

  it('returns 403 when updating another user\'s habit', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(otherUserHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habits/${otherUserHabit.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Other' });

    expect(res.status).toBe(403);
  });

  it('returns 403 when updating a system habit', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(systemHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habits/${systemHabit.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Other' });

    expect(res.status).toBe(403);
  });

  it('returns 400 when no fields provided', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(habit);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when isActive is not a boolean', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(habit);
    const token = makeToken(userId);

    const res = await request(app)
      .patch(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ isActive: 'yes' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch(`/api/habits/${habit.id}`)
      .send({ name: 'Other' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/habits/:id', () => {
  it('returns 204 on successful deletion', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(habit);
    (mockPrisma.habit.delete as jest.Mock).mockResolvedValue(habit);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/habits/${habit.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(mockPrisma.habit.delete).toHaveBeenCalledWith({ where: { id: habit.id } });
  });

  it('returns 404 when habit does not exist', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken(userId);

    const res = await request(app)
      .delete('/api/habits/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 when deleting another user\'s habit', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(otherUserHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/habits/${otherUserHabit.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 403 when deleting a system habit', async () => {
    (mockPrisma.habit.findUnique as jest.Mock).mockResolvedValue(systemHabit);
    const token = makeToken(userId);

    const res = await request(app)
      .delete(`/api/habits/${systemHabit.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).delete(`/api/habits/${habit.id}`);
    expect(res.status).toBe(401);
  });
});
