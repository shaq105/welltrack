import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import { sendPasswordResetEmail } from '../lib/email';

const SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRES_MS = 60 * 60 * 1000; // 1 hour

function signAccessToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '15m';
  return jwt.sign({ sub: userId }, secret, { expiresIn } as jwt.SignOptions);
}

function signRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
  const expiresIn = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  return jwt.sign({ sub: userId }, secret, { expiresIn } as jwt.SignOptions);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseRefreshExpiry(): Date {
  const raw = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';
  const match = raw.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const [, amount, unit] = match;
  const ms: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return new Date(Date.now() + Number(amount) * ms[unit]);
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, displayName, timezone } = req.body;

    if (!email || !password || !displayName) {
      res.status(400).json({ error: 'Bad Request', message: 'email, password, and displayName are required' });
      return;
    }

    if (typeof email !== 'string' || typeof password !== 'string' || typeof displayName !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'email, password, and displayName must be strings' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Bad Request', message: 'password must be at least 8 characters' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Conflict', message: 'An account with that email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        timezone: typeof timezone === 'string' ? timezone : 'UTC',
      },
      select: { id: true, email: true, displayName: true, timezone: true, createdAt: true },
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: parseRefreshExpiry(),
      },
    });

    res.status(201).json({ user, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Bad Request', message: 'email and password are required' });
      return;
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'email and password must be strings' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
      return;
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: parseRefreshExpiry(),
      },
    });

    const { passwordHash: _ph, ...userWithoutHash } = user;
    res.status(200).json({ user: userWithoutHash, accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'refreshToken is required' });
      return;
    }

    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, secret) as jwt.JwtPayload;
    } catch {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired refresh token' });
      return;
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.userId !== payload.sub || stored.expiresAt < new Date()) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired refresh token' });
      return;
    }

    // Rotate: delete old token, issue new one
    await prisma.refreshToken.delete({ where: { tokenHash } });

    const newAccessToken = signAccessToken(stored.userId);
    const newRefreshToken = signRefreshToken(stored.userId);

    await prisma.refreshToken.create({
      data: {
        userId: stored.userId,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: parseRefreshExpiry(),
      },
    });

    res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken || typeof refreshToken !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'refreshToken is required' });
      return;
    }

    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'email is required' });
      return;
    }

    // Always respond 200 to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(200).json({ message: 'If that email is registered, a reset link has been sent' });
      return;
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRES_MS);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await sendPasswordResetEmail(user.email, rawToken);

    res.status(200).json({ message: 'If that email is registered, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: 'Bad Request', message: 'token and password are required' });
      return;
    }

    if (typeof token !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'token and password must be strings' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Bad Request', message: 'password must be at least 8 characters' });
      return;
    }

    const tokenHash = hashToken(token);
    const resetRecord = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid or expired reset token' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });

    // Invalidate all refresh tokens and the used reset token
    await prisma.refreshToken.deleteMany({ where: { userId: resetRecord.userId } });
    await prisma.passwordResetToken.deleteMany({ where: { userId: resetRecord.userId } });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
}
