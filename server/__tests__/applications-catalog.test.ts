import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, createScopedAppFixture, type ScopedAppFixture } from './helpers';

const app = createApp();
let fx: ScopedAppFixture;

beforeAll(async () => { fx = await createScopedAppFixture('catalog'); });
afterAll(async () => { await fx.cleanup(); await prisma.$disconnect(); });

describe('GET /api/v1/applications/catalog', () => {
  it('returns the tenant catalog for admin', async () => {
    const cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const res = await request(app).get('/api/v1/applications/catalog').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect((res.body as Array<{ id: string }>).some((a) => a.id === fx.appId)).toBe(true);
  });

  it('flags isMember=true for a team contributor and false for an outsider', async () => {
    const memberCookie = await login(app, fx.emailOf('member-a'), fx.password);
    const r1 = await request(app).get('/api/v1/applications/catalog').set('Cookie', memberCookie);
    expect(r1.status).toBe(200);
    expect((r1.body as Array<{ id: string; isMember: boolean }>).find((a) => a.id === fx.appId)?.isMember).toBe(true);

    const outsiderCookie = await login(app, fx.emailOf('member-b'), fx.password);
    const r2 = await request(app).get('/api/v1/applications/catalog').set('Cookie', outsiderCookie);
    expect((r2.body as Array<{ id: string; isMember: boolean }>).find((a) => a.id === fx.appId)?.isMember).toBe(false);
  });
});

describe('Application Owner self-service via /api/v1/applications', () => {
  it('Application Owner (no system.admin) can add a team to their own app', async () => {
    // Promote memberA's team to OWNER for fx.appId.
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'OWNER' },
    });
    const cookie = await login(app, fx.emailOf('member-a'), fx.password);
    const res = await request(app)
      .post(`/api/v1/applications/${fx.appId}/teams`)
      .set('Cookie', cookie)
      .send({ teamId: fx.teamBId, role: 'VIEWER' });
    expect(res.status).toBe(201);
    await prisma.applicationTeam.delete({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamBId } },
    });
    // restore role for other tests
    await prisma.applicationTeam.update({
      where: { applicationId_teamId: { applicationId: fx.appId, teamId: fx.teamAId } },
      data: { role: 'CONTRIBUTOR' },
    });
  });
});
