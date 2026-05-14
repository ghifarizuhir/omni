// M6.8 — contract tests. For each domain, hit the GET endpoint and assert the
// response shape matches a Zod schema that mirrors the public TS contract in
// `src/types/*`. The schemas are intentionally minimal — they pin down the
// fields the frontend relies on, not every nullable detail. A failure here
// means the server response has drifted from the type the frontend imports.
//
// Pattern for adding a domain:
//   1. Sketch a Zod schema with the must-have fields (publicId, status, etc.).
//   2. Loosen with `.passthrough()` so extra server-side fields don't break.
//   3. Either GET-list and `.array(schema)` it, or GET-one and parse direct.
//
// Run as part of `npm test`. Treats Zod parse errors as test failures —
// vitest's diff output already shows the offending field.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { z } from 'zod';
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../db';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login } from './helpers';

const app = createApp();
let cookie: string;
const auth = (r: request.Test) => r.set('Cookie', cookie);

beforeAll(async () => { cookie = await login(app, ADMIN_EMAIL, ADMIN_PASSWORD); });
afterAll(async () => { await prisma.$disconnect(); });

// ── Domain schemas (minimum contract) ────────────────────────────────────────

const ciSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
}).passthrough();

const incidentSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  title: z.string(),
  status: z.string(),
  priority: z.string(),
  severity: z.string(),
}).passthrough();

const eventSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  type: z.string(),
  status: z.string(),
  severity: z.string(),
  title: z.string(),
}).passthrough();

const monitoringRuleSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  name: z.string(),
  type: z.string(),
  enabled: z.boolean(),
}).passthrough();

const changeSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  title: z.string(),
  status: z.string(),
  type: z.string(),
  risk: z.string(),
}).passthrough();

const requestSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  title: z.string(),
  status: z.string(),
  workflow: z.object({
    steps: z.array(z.object({ id: z.string(), status: z.string() }).passthrough()),
  }).passthrough(),
}).passthrough();

const releaseSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  name: z.string(),
  status: z.string(),
}).passthrough();

const deploymentSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  status: z.string(),
}).passthrough();

const problemSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  status: z.string(),
}).passthrough();

const kbArticleSchema = z.object({
  id: z.string(),
  publicId: z.string(),
  title: z.string(),
  status: z.string(),
}).passthrough();

const integrationSchema = z.object({
  id: z.string(),
  enabled: z.boolean(),
  status: z.string(),
}).passthrough();

const meSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }).passthrough(),
  tenantId: z.string(),
  roles: z.array(z.object({ id: z.string(), name: z.string() })),
  permissions: z.array(z.string()),
}).passthrough();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function expectListShape(path: string, schema: z.ZodTypeAny): Promise<void> {
  const res = await auth(request(app).get(path));
  expect(res.status, `GET ${path}`).toBe(200);
  expect(Array.isArray(res.body), `${path} returns an array`).toBe(true);
  expect(res.body.length, `${path} has at least one item to check`).toBeGreaterThan(0);
  const parsed = z.array(schema).safeParse(res.body);
  if (!parsed.success) {
    throw new Error(`${path} response failed contract: ${JSON.stringify(parsed.error.issues, null, 2)}`);
  }
}

async function expectObjectShape(path: string, schema: z.ZodTypeAny): Promise<void> {
  const res = await auth(request(app).get(path));
  expect(res.status, `GET ${path}`).toBe(200);
  const parsed = schema.safeParse(res.body);
  if (!parsed.success) {
    throw new Error(`${path} response failed contract: ${JSON.stringify(parsed.error.issues, null, 2)}`);
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('REST contract — list endpoints', () => {
  it('GET /cis', () => expectListShape('/api/v1/cis', ciSchema));
  it('GET /incidents', () => expectListShape('/api/v1/incidents', incidentSchema));
  it('GET /events', () => expectListShape('/api/v1/events', eventSchema));
  it('GET /monitoring/rules', () => expectListShape('/api/v1/monitoring/rules', monitoringRuleSchema));
  it('GET /changes', () => expectListShape('/api/v1/changes', changeSchema));
  it('GET /requests', () => expectListShape('/api/v1/requests', requestSchema));
  it('GET /releases', () => expectListShape('/api/v1/releases', releaseSchema));
  it('GET /deployments', () => expectListShape('/api/v1/deployments', deploymentSchema));
  it('GET /problems', () => expectListShape('/api/v1/problems', problemSchema));
  it('GET /kb/articles', () => expectListShape('/api/v1/kb/articles', kbArticleSchema));
  it('GET /integrations', () => expectListShape('/api/v1/integrations', integrationSchema));
});

describe('REST contract — singleton endpoints', () => {
  it('GET /auth/me', () => expectObjectShape('/api/v1/auth/me', meSchema));
});
