import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      update: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const rawToken = 'a'.repeat(64);
const userId = 'user-uuid-1';

const validResetRecord = {
  id: 'reset-id-1',
  userId,
  tokenHash: hashToken(rawToken),
  expiresAt: new Date(Date.now() + 3_600_000),
  createdAt: new Date(),
};

beforeEach(() => {
  (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(validResetRecord);
  (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
  (mockPrisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
  (mockPrisma.refreshToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
});

describe('POST /api/auth/reset-password', () => {
  describe('success', () => {
    it('returns 200 with a success message', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'newPassword1' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('updates the user passwordHash with a bcrypt hash', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'newPassword1' });

      const updateCall = (mockPrisma.user.update as jest.Mock).mock.calls[0][0];
      const storedHash = updateCall.data.passwordHash;
      expect(await bcrypt.compare('newPassword1', storedHash)).toBe(true);
    });

    it('invalidates all refresh tokens for the user after reset', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'newPassword1' });

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    });

    it('deletes the used reset token', async () => {
      await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'newPassword1' });

      expect(mockPrisma.passwordResetToken.deleteMany).toHaveBeenCalledWith({ where: { userId } });
    });
  });

  describe('validation errors', () => {
    it('returns 400 when token is missing', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ password: 'newPassword1' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken });
      expect(res.status).toBe(400);
    });

    it('returns 400 when password is shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'short' });
      expect(res.status).toBe(400);
    });
  });

  describe('token failures', () => {
    it('returns 400 when reset token is not found in DB', async () => {
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'newPassword1' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 400 when reset token is expired', async () => {
      (mockPrisma.passwordResetToken.findUnique as jest.Mock).mockResolvedValue({
        ...validResetRecord,
        expiresAt: new Date(Date.now() - 1000),
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: rawToken, password: 'newPassword1' });
      expect(res.status).toBe(400);
    });
  });
});
