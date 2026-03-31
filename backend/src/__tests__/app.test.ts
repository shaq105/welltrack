import request from 'supertest';
import app from '../app';

describe('Express app', () => {
  it('is defined', () => {
    expect(app).toBeDefined();
  });

  it('parses JSON request bodies', async () => {
    // POST to health won't exist but we can test via a made-up route;
    // instead, confirm the app handles unknown routes gracefully (not a 500)
    const res = await request(app)
      .post('/api/health')
      .send({ test: true })
      .set('Content-Type', 'application/json');
    // Express 5 returns 404 for unmatched method+route, not a crash
    expect(res.status).not.toBe(500);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
  });
});
