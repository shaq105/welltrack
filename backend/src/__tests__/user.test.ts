import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const JWT_SECRET = 'test-secret';

const existingUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  timezone: 'UTC',
};

function makeToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '15m' });
}

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
});

describe('GET /api/users/me', () => {
  it('returns 200 with user profile', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
    const token = makeToken(existingUser.id);

    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      id: existingUser.id,
      email: existingUser.email,
      displayName: existingUser.displayName,
      timezone: existingUser.timezone,
    });
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    const res = await request(app).get('/api/users/me').set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(401);
  });

  it('returns 404 when user no longer exists', async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const token = makeToken('ghost-id');

    const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/users/me', () => {
  it('returns 200 with updated user when displayName is changed', async () => {
    const updated = { ...existingUser, displayName: 'Alicia' };
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(existingUser.id);

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 'Alicia' });

    expect(res.status).toBe(200);
    expect(res.body.user.displayName).toBe('Alicia');
  });

  it('returns 200 with updated user when timezone is changed', async () => {
    const updated = { ...existingUser, timezone: 'America/New_York' };
    (mockPrisma.user.update as jest.Mock).mockResolvedValue(updated);
    const token = makeToken(existingUser.id);

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ timezone: 'America/New_York' });

    expect(res.status).toBe(200);
    expect(res.body.user.timezone).toBe('America/New_York');
  });

  it('returns 400 when body has no valid fields', async () => {
    const token = makeToken(existingUser.id);

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('returns 400 when displayName is not a string', async () => {
    const token = makeToken(existingUser.id);

    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ displayName: 123 });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).patch('/api/users/me').send({ displayName: 'Alicia' });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/users/me', () => {
  it('returns 204 on successful deletion', async () => {
    (mockPrisma.user.delete as jest.Mock).mockResolvedValue(existingUser);
    const token = makeToken(existingUser.id);

    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: existingUser.id } });
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).delete('/api/users/me');
    expect(res.status).toBe(401);
  });
});
