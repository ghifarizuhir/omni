import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('User notification channels', () => {
  it('GET /users/me/channels returns list', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/users/me/channels').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PUT /users/me/channels/email upserts email channel', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .put('/api/v1/users/me/channels/email')
      .set('Cookie', cookie)
      .send({ address: 'test@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe('email');
    expect(res.body.address).toBe('test@example.com');
  });

  it('PUT /users/me/channels/slack upserts slack channel', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .put('/api/v1/users/me/channels/slack')
      .set('Cookie', cookie)
      .send({ address: '#alerts' });
    expect(res.status).toBe(200);
    expect(res.body.kind).toBe('slack');
    expect(res.body.address).toBe('#alerts');
  });

  it('PUT /users/me/channels/email updates existing channel on re-upsert', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    await request(app)
      .put('/api/v1/users/me/channels/email')
      .set('Cookie', cookie)
      .send({ address: 'first@example.com' });
    const res = await request(app)
      .put('/api/v1/users/me/channels/email')
      .set('Cookie', cookie)
      .send({ address: 'updated@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.address).toBe('updated@example.com');
  });

  it('PUT /users/me/channels/:kind returns 400 for invalid kind', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .put('/api/v1/users/me/channels/fax')
      .set('Cookie', cookie)
      .send({ address: 'some-address' });
    expect(res.status).toBe(400);
  });

  it('PUT /users/me/channels/:kind returns 400 when address is missing', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .put('/api/v1/users/me/channels/email')
      .set('Cookie', cookie)
      .send({});
    expect(res.status).toBe(400);
  });
});
