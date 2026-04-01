import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
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

const plainPassword = 'password123';
let passwordHash: string;

const existingUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  timezone: 'UTC',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  passwordHash: '',
};

beforeAll(async () => {
  passwordHash = await bcrypt.hash(plainPassword, 10);
  existingUser.passwordHash = passwordHash;
});

beforeEach(() => {
  process.env.JWT_SECRET = ENV.JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = ENV.JWT_REFRESH_SECRET;
  process.env.JWT_EXPIRES_IN = ENV.JWT_EXPIRES_IN;
  process.env.JWT_REFRESH_EXPIRES_IN = ENV.JWT_REFRESH_EXPIRES_IN;

  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
  (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
});

describe('POST /api/auth/login', () => {
  describe('success', () => {
    it('returns 200 with user, accessToken, and refreshToken', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: plainPassword });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        id: existingUser.id,
        email: existingUser.email,
        displayName: existingUser.displayName,
      });
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('does not return passwordHash in response', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: plainPassword });
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('returns a valid accessToken signed with JWT_SECRET', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: plainPassword });
      const decoded = jwt.verify(res.body.accessToken, ENV.JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe(existingUser.id);
    });

    it('returns a valid refreshToken signed with JWT_REFRESH_SECRET', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: plainPassword });
      const decoded = jwt.verify(res.body.refreshToken, ENV.JWT_REFRESH_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe(existingUser.id);
    });

    it('stores a hashed refresh token in the database', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: plainPassword });
      const createCall = (mockPrisma.refreshToken.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tokenHash).toBeDefined();
      expect(createCall.data.tokenHash).not.toBe(res.body.refreshToken);
    });
  });

  describe('validation errors', () => {
    it('returns 400 when email is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({ password: plainPassword });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app).post('/api/auth/login').send({ email: 'alice@example.com' });
      expect(res.status).toBe(400);
    });
  });

  describe('authentication failures', () => {
    it('returns 401 when user does not exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: plainPassword });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 401 when password is wrong', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns the same error message for wrong email and wrong password (no enumeration)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const resNoUser = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: plainPassword });

      const resWrongPwd = await request(app)
        .post('/api/auth/login')
        .send({ email: 'alice@example.com', password: 'wrongpassword' });

      expect(resNoUser.body.message).toBe(resWrongPwd.body.message);
    });
  });
});
