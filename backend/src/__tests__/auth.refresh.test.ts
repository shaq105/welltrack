import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    refreshToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
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

const userId = 'user-uuid-1';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function makeRefreshToken(sub: string = userId): string {
  return jwt.sign({ sub }, ENV.JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

beforeEach(() => {
  process.env.JWT_SECRET = ENV.JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = ENV.JWT_REFRESH_SECRET;
  process.env.JWT_EXPIRES_IN = ENV.JWT_EXPIRES_IN;
  process.env.JWT_REFRESH_EXPIRES_IN = ENV.JWT_REFRESH_EXPIRES_IN;

  (mockPrisma.refreshToken.delete as jest.Mock).mockResolvedValue({});
  (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});
});

describe('POST /api/auth/refresh', () => {
  describe('success', () => {
    it('returns 200 with new accessToken and refreshToken', async () => {
      const oldRefreshToken = makeRefreshToken();
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        tokenHash: hashToken(oldRefreshToken),
        userId,
        expiresAt: new Date(Date.now() + 86400_000),
      });

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('new accessToken is signed with JWT_SECRET and has correct sub', async () => {
      const oldRefreshToken = makeRefreshToken();
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        tokenHash: hashToken(oldRefreshToken),
        userId,
        expiresAt: new Date(Date.now() + 86400_000),
      });

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefreshToken });
      const decoded = jwt.verify(res.body.accessToken, ENV.JWT_SECRET) as jwt.JwtPayload;
      expect(decoded.sub).toBe(userId);
    });

    it('rotates the refresh token (old one is deleted, new one stored)', async () => {
      const oldRefreshToken = makeRefreshToken();
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        tokenHash: hashToken(oldRefreshToken),
        userId,
        expiresAt: new Date(Date.now() + 86400_000),
      });

      await request(app).post('/api/auth/refresh').send({ refreshToken: oldRefreshToken });

      // Verify old token deleted and new one stored
      expect(mockPrisma.refreshToken.delete).toHaveBeenCalledWith({ where: { tokenHash: hashToken(oldRefreshToken) } });
      expect(mockPrisma.refreshToken.create).toHaveBeenCalled();
    });
  });

  describe('validation errors', () => {
    it('returns 400 when refreshToken is missing', async () => {
      const res = await request(app).post('/api/auth/refresh').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('auth failures', () => {
    it('returns 401 for an invalid JWT', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'not-a-jwt' });
      expect(res.status).toBe(401);
    });

    it('returns 401 when token is not found in DB', async () => {
      const token = makeRefreshToken();
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token });
      expect(res.status).toBe(401);
    });

    it('returns 401 when stored token is expired', async () => {
      const token = makeRefreshToken();
      (mockPrisma.refreshToken.findUnique as jest.Mock).mockResolvedValue({
        tokenHash: hashToken(token),
        userId,
        expiresAt: new Date(Date.now() - 1000), // expired
      });

      const res = await request(app).post('/api/auth/refresh').send({ refreshToken: token });
      expect(res.status).toBe(401);
    });
  });
});
