import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /measurement/reports', () => {
  it('creates a report and returns 201 with id', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post('/api/v1/measurement/reports')
      .set('Cookie', cookie)
      .send({ name: 'Test', definition: {} });
    expect(res.status).toBe(201);
    expect(typeof res.body.id).toBe('string');
    expect(res.body.name).toBe('Test');
  });

  it('returns 400 when name is missing', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app)
      .post('/api/v1/measurement/reports')
      .set('Cookie', cookie)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/v1/measurement/reports')
      .send({ name: 'Test' });
    expect(res.status).toBe(401);
  });
});
