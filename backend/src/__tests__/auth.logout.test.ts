import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    refreshToken: {
      deleteMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

beforeEach(() => {
  (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
});

describe('POST /api/auth/logout', () => {
  describe('success', () => {
    it('returns 204 with no body', async () => {
      const res = await request(app).post('/api/auth/logout').send({ refreshToken: 'some-token' });
      expect(res.status).toBe(204);
      expect(res.body).toEqual({});
    });

    it('deletes the matching refresh token from the database', async () => {
      await request(app).post('/api/auth/logout').send({ refreshToken: 'some-token' });
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('returns 204 even if token was not in DB (idempotent)', async () => {
      (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      const res = await request(app).post('/api/auth/logout').send({ refreshToken: 'unknown-token' });
      expect(res.status).toBe(204);
    });
  });

  describe('validation errors', () => {
    it('returns 400 when refreshToken is missing', async () => {
      const res = await request(app).post('/api/auth/logout').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
