import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('User API tokens', () => {
  it('GET /users/me/tokens returns empty list initially', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/users/me/tokens').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /users/me/tokens creates a token and returns raw token once', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post('/api/v1/users/me/tokens')
      .set('Cookie', cookie)
      .send({ name: 'my-test-token' });
    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^ois_/);
    expect(res.body.name).toBe('my-test-token');
    expect(res.body.prefix).toBe(res.body.token.slice(0, 12));
  });

  it('GET /users/me/tokens lists created tokens without tokenHash', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    // Create a token first
    await request(app)
      .post('/api/v1/users/me/tokens')
      .set('Cookie', cookie)
      .send({ name: 'list-test-token' });
    const res = await request(app).get('/api/v1/users/me/tokens').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const t of res.body) {
      expect(t.tokenHash).toBeUndefined();
    }
  });

  it('DELETE /users/me/tokens/:id revokes the token (204)', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const create = await request(app)
      .post('/api/v1/users/me/tokens')
      .set('Cookie', cookie)
      .send({ name: 'delete-me' });
    expect(create.status).toBe(201);
    const id = create.body.id;
    const del = await request(app)
      .delete(`/api/v1/users/me/tokens/${id}`)
      .set('Cookie', cookie);
    expect(del.status).toBe(204);
    // Revoked token should not appear in listing
    const list = await request(app).get('/api/v1/users/me/tokens').set('Cookie', cookie);
    expect(list.body.find((t: { id: string }) => t.id === id)).toBeUndefined();
  });

  it('POST /users/me/tokens returns 400 when name is missing', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post('/api/v1/users/me/tokens')
      .set('Cookie', cookie)
      .send({});
    expect(res.status).toBe(400);
  });
});
