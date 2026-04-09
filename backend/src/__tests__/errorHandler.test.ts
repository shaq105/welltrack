import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { errorHandler } from '../middleware/errorHandler';

function makeApp(errorFactory: () => unknown) {
  const app = express();
  app.use(express.json());

  app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
    next(errorFactory());
  });

  app.use(errorHandler);
  return app;
}

describe('errorHandler middleware', () => {
  it('returns 400 with error and message for ZodError', async () => {
    const schema = z.object({ name: z.string({ error: 'name is required' }).min(1, 'name is required') });
    const result = schema.safeParse({});
    if (result.success) throw new Error('expected parse failure');

    const app = makeApp(() => result.error);
    const res = await request(app).get('/test');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
    expect(res.body.message).toContain('name is required');
  });

  it('returns 409 for Prisma P2002 unique constraint error', async () => {
    const prismaErr = Object.assign(new Error('unique constraint'), { code: 'P2002' });
    const app = makeApp(() => prismaErr);
    const res = await request(app).get('/test');

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Conflict');
    expect(res.body.message).toBeDefined();
  });

  it('returns 404 for Prisma P2025 not found error', async () => {
    const prismaErr = Object.assign(new Error('record not found'), { code: 'P2025' });
    const app = makeApp(() => prismaErr);
    const res = await request(app).get('/test');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Not Found');
    expect(res.body.message).toBeDefined();
  });

  it('returns 500 for unknown errors', async () => {
    const app = makeApp(() => new Error('something unexpected'));
    const res = await request(app).get('/test');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal Server Error');
    expect(res.body.message).toBeDefined();
  });

  it('response always contains error and message fields', async () => {
    const app = makeApp(() => new Error('boom'));
    const res = await request(app).get('/test');

    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('message');
  });
});
