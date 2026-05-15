import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
const SESSION_ID = 'test-session-ai-messages';

afterAll(async () => {
  // Clean up test messages
  await prisma.aiMessage.deleteMany({ where: { sessionId: SESSION_ID } }).catch(() => {});
  await prisma.$disconnect();
});

describe('AI session messages', () => {
  it('GET /ai/sessions/:id/messages returns 401 when unauthenticated', async () => {
    const res = await request(app).get(`/api/v1/ai/sessions/${SESSION_ID}/messages`);
    expect(res.status).toBe(401);
  });

  it('POST /ai/sessions/:id/messages returns 400 when body is missing', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post(`/api/v1/ai/sessions/${SESSION_ID}/messages`)
      .set('Cookie', cookie)
      .send({});
    expect(res.status).toBe(400);
  });

  it('POST /ai/sessions/:id/messages returns 201 with user and assistant messages', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post(`/api/v1/ai/sessions/${SESSION_ID}/messages`)
      .set('Cookie', cookie)
      .send({ body: 'hello' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('user');
    expect(res.body.assistant.role).toBe('assistant');
    expect(res.body.assistant.body).toMatch(/^Acknowledged:/);
  });

  it('GET /ai/sessions/:id/messages returns >= 2 rows ordered by createdAt', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .get(`/api/v1/ai/sessions/${SESSION_ID}/messages`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    // Verify ordering
    const times = res.body.map((m: { createdAt: string }) => new Date(m.createdAt).getTime());
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]);
    }
  });
});
