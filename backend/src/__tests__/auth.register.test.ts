import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock Prisma so tests don't need a real database
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const ENV = {
  JWT_SECRET: 'test-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

const validBody = {
  email: 'alice@example.com',
  password: 'password123',
  displayName: 'Alice',
};

const createdUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  timezone: 'UTC',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
};

beforeEach(() => {
  process.env.JWT_SECRET = ENV.JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = ENV.JWT_REFRESH_SECRET;
  process.env.JWT_EXPIRES_IN = ENV.JWT_EXPIRES_IN;
  process.env.JWT_REFRESH_EXPIRES_IN = ENV.JWT_REFRESH_EXPIRES_IN;

  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
  (mockPrisma.user.create as jest.Mock).mockResolvedValue(createdUser);
  (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
});

describe('POST /api/auth/register', () => {
  describe('success', () => {
    it('returns 201 with user, accessToken, and refreshToken', async () => {
      const res = await request(app).post('/api/auth/register').send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        id: createdUser.id,
        email: createdUser.email,
        displayName: createdUser.displayName,
        timezone: createdUser.timezone,
      });
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('does not return passwordHash in response', async () => {
      const res = await request(app).post('/api/auth/register').send(validBody);
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('hashes the password before storing', async () => {
      await request(app).post('/api/auth/register').send(validBody);

      const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
      const stored = createCall.data.passwordHash;
      expect(stored).toBeDefined();
      expect(stored).not.toBe(validBody.password);
      expect(await bcrypt.compare(validBody.password, stored)).toBe(true);
    });

    it('returns a valid JWT accessToken signed with JWT_SECRET', async () => {
      const res = await request(app).post('/api/auth/register').send(validBody);
      const decoded = jwt.verify(res.body.accessToken, ENV.JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe(createdUser.id);
    });

    it('returns a valid JWT refreshToken signed with JWT_REFRESH_SECRET', async () => {
      const res = await request(app).post('/api/auth/register').send(validBody);
      const decoded = jwt.verify(res.body.refreshToken, ENV.JWT_REFRESH_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe(createdUser.id);
    });

    it('defaults timezone to UTC when not provided', async () => {
      await request(app).post('/api/auth/register').send(validBody);
      const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.timezone).toBe('UTC');
    });

    it('uses provided timezone when given', async () => {
      const body = { ...validBody, timezone: 'America/New_York' };
      (mockPrisma.user.create as jest.Mock).mockResolvedValue({ ...createdUser, timezone: 'America/New_York' });

      await request(app).post('/api/auth/register').send(body);
      const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.timezone).toBe('America/New_York');
    });

    it('stores a hashed refresh token in the database', async () => {
      const res = await request(app).post('/api/auth/register').send(validBody);
      const createCall = (mockPrisma.refreshToken.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tokenHash).toBeDefined();
      expect(createCall.data.tokenHash).not.toBe(res.body.refreshToken);
    });
  });

  describe('validation errors', () => {
    it('returns 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123', displayName: 'Alice' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@example.com', displayName: 'Alice' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when displayName is missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'alice@example.com', password: 'password123' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ ...validBody, password: 'short' });
      expect(res.status).toBe(400);
    });

    it('returns error and message fields on 400', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ password: 'password123', displayName: 'Alice' });
      expect(res.body.error).toBeDefined();
      expect(res.body.message).toBeDefined();
    });
  });

  describe('conflict', () => {
    it('returns 409 when email is already registered', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      const res = await request(app).post('/api/auth/register').send(validBody);
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Conflict');
    });
  });
});
