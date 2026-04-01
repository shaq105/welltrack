import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import * as email from '../lib/email';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    passwordResetToken: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('../lib/email', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSendEmail = email.sendPasswordResetEmail as jest.Mock;

const existingUser = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  displayName: 'Alice',
  timezone: 'UTC',
  createdAt: new Date(),
  passwordHash: 'hashed',
};

beforeEach(() => {
  (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
  (mockPrisma.passwordResetToken.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
  (mockPrisma.passwordResetToken.create as jest.Mock).mockResolvedValue({});
  mockSendEmail.mockResolvedValue(undefined);
});

describe('POST /api/auth/forgot-password', () => {
  describe('success', () => {
    it('returns 200 with a generic message for a known email', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'alice@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('sends a password reset email', async () => {
      await request(app).post('/api/auth/forgot-password').send({ email: 'alice@example.com' });
      expect(mockSendEmail).toHaveBeenCalledWith(existingUser.email, expect.any(String));
    });

    it('stores a hashed reset token (not the raw token) in DB', async () => {
      await request(app).post('/api/auth/forgot-password').send({ email: 'alice@example.com' });

      const rawToken = mockSendEmail.mock.calls[0][1];
      const createCall = (mockPrisma.passwordResetToken.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.tokenHash).not.toBe(rawToken);
    });

    it('returns 200 with the same message for an unknown email (no enumeration)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const resKnown = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'alice@example.com' });
      // restore known user
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      const resUnknown = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' });

      expect(resUnknown.status).toBe(200);
      expect(resUnknown.body.message).toBe(resKnown.body.message);
    });

    it('does not send an email for an unknown address', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe('validation errors', () => {
    it('returns 400 when email is missing', async () => {
      const res = await request(app).post('/api/auth/forgot-password').send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
