import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);

beforeAll(async () => {
  cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  await prisma.$disconnect();
});

const validChangeBody = () => ({
  title: 'Vote test',
  type: 'normal' as const,
  plannedStart: new Date(Date.now() + 86400000).toISOString(),
  plannedEnd: new Date(Date.now() + 90000000).toISOString(),
  description: 'desc',
  justification: 'just',
  risk: 'medium' as const,
  impact: 'moderate' as const,
  implementationPlan: '',
  rollbackPlan: '',
  affectedCIIds: [] as string[],
});

async function createChangeInReview(): Promise<{ publicId: string; id: string }> {
  const chRes = await auth(request(app).post('/api/v1/changes')).send(validChangeBody());
  expect(chRes.status).toBe(201);
  const ch = chRes.body;
  // transition to in_review — both column and JSON data
  const row = await prisma.change.findUniqueOrThrow({ where: { id: ch.id } });
  const data = JSON.parse(row.data as string) as Record<string, unknown>;
  const updated = { ...data, status: 'in_review', approvals: [] as unknown[] };
  await prisma.change.update({
    where: { id: ch.id },
    data: { status: 'in_review', data: JSON.stringify(updated) },
  });
  return { publicId: ch.publicId, id: ch.id };
}

describe('POST /changes/:publicId/votes', () => {
  it('201 creates vote', async () => {
    const ch = await createChangeInReview();
    const voteRes = await auth(
      request(app).post(`/api/v1/changes/${ch.publicId}/votes`),
    ).send({ decision: 'approve' });
    expect(voteRes.status).toBe(201);
    expect(voteRes.body.approvals.some((a: any) => a.decision === 'approve')).toBe(true);
  });

  it('400 reject without rationale', async () => {
    const ch = await createChangeInReview();
    const res = await auth(
      request(app).post(`/api/v1/changes/${ch.publicId}/votes`),
    ).send({ decision: 'reject' });
    expect(res.status).toBe(400);
  });
});
