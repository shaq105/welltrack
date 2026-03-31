import request from 'supertest';
import app from '../app';

describe('GET /api/health', () => {
  it('returns 200 status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
  });

  it('returns { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns JSON content type', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
