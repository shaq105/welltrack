import request from 'supertest';
import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/authenticate';

// Build a minimal app with a protected route for testing
const testApp = express();
testApp.use(express.json());
testApp.get('/protected', authenticate, (req: Request, res: Response) => {
  res.json({ userId: req.user?.id });
});

const JWT_SECRET = 'test-secret';

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

describe('authenticate middleware', () => {
  describe('valid token', () => {
    it('calls next and attaches user to req', async () => {
      const token = jwt.sign({ sub: 'user-1' }, JWT_SECRET, { expiresIn: '15m' });

      const res = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe('user-1');
    });
  });

  describe('missing or malformed header', () => {
    it('returns 401 when Authorization header is absent', async () => {
      const res = await request(testApp).get('/protected');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 401 when Authorization header does not start with Bearer', async () => {
      const res = await request(testApp)
        .get('/protected')
        .set('Authorization', 'Basic dXNlcjpwYXNz');
      expect(res.status).toBe(401);
    });
  });

  describe('invalid token', () => {
    it('returns 401 for a tampered token', async () => {
      const res = await request(testApp)
        .get('/protected')
        .set('Authorization', 'Bearer this.is.not.valid');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('returns 401 for a token signed with the wrong secret', async () => {
      const token = jwt.sign({ sub: 'user-1' }, 'wrong-secret', { expiresIn: '15m' });
      const res = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it('returns 401 for an expired token', async () => {
      const token = jwt.sign({ sub: 'user-1' }, JWT_SECRET, { expiresIn: '-1s' });
      const res = await request(testApp)
        .get('/protected')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
    });
  });
});
