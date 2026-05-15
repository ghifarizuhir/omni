import { describe, expect, it, afterAll } from 'vitest';
import { ScopeViolationError } from '../scope/errors';
import { POLICY, type ModuleKey } from '../scope/policy';
import { resolveScopeContext, type ScopeContext } from '../scope/context';
import { prisma } from '../db';
import type { Response } from 'express';
import { applyEnforcement, readEnforcementMode } from '../scope/enforcement';
import { buildScopedDb, type ScopedDb } from '../scope/scopedDb';

afterAll(async () => {
  await prisma.$disconnect();
});

describe('ScopeViolationError', () => {
  it('captures module, action, and optional applicationId', () => {
    const err = new ScopeViolationError({
      module: 'cmdb',
      action: 'update',
      applicationId: 'app-1',
    });
    expect(err.name).toBe('ScopeViolationError');
    expect(err.module).toBe('cmdb');
    expect(err.action).toBe('update');
    expect(err.applicationId).toBe('app-1');
    expect(err.message).toMatch(/cmdb\.update/);
  });

  it('serializes to a stable JSON shape for HTTP responses', () => {
    const err = new ScopeViolationError({ module: 'cmdb', action: 'create' });
    expect(err.toJSON()).toEqual({
      error: 'scope_violation',
      module: 'cmdb',
      action: 'create',
      applicationId: undefined,
    });
  });
});

describe('scope policy table', () => {
  it('declares CMDB as read=global, write=scoped', () => {
    expect(POLICY.cmdb.read).toBe('global');
    expect(POLICY.cmdb.write).toBe('scoped');
  });

  it('declares Event/Incident/ServiceRequest as read=scoped', () => {
    const scopedRead: ModuleKey[] = ['event', 'incident', 'service_request'];
    for (const m of scopedRead) {
      expect(POLICY[m].read).toBe('scoped');
    }
  });

  it('lists allowed write bypass roles per module', () => {
    expect(POLICY.cmdb.writeBypass).toEqual(['PLATFORM_ADMIN']);
    expect(POLICY.incident.writeBypass).toContain('NOC_OPERATOR');
    expect(POLICY.service_request.writeBypass).toContain('NOC_OPERATOR');
  });

  it('declares Problem/Change as global read, scoped write', () => {
    expect(POLICY.problem.read).toBe('global');
    expect(POLICY.problem.write).toBe('scoped');
    expect(POLICY.change.read).toBe('global');
    expect(POLICY.change.write).toBe('scoped');
  });

  it('declares Release/MonitoringRule/AlertRoute as admin-only write', () => {
    expect(POLICY.release.write).toBe('admin_only');
    expect(POLICY.monitoring_rule.write).toBe('admin_only');
    expect(POLICY.alert_route.write).toBe('admin_only');
  });
});

describe('resolveScopeContext', () => {
  it('returns membership + functional roles + tenant for a normal user', async () => {
    // Pick the seeded admin user from the demo tenant.
    const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: process.env.ROOT_TENANT_SLUG ?? 'default' } });
    const membership = await prisma.tenantMembership.findFirstOrThrow({ where: { tenantId: tenant.id } });
    const user = await prisma.user.findUniqueOrThrow({ where: { id: membership.userId } });
    const ctx: ScopeContext = await resolveScopeContext({
      userId: user.id,
      tenantId: tenant.id,
    });
    expect(ctx.userId).toBe(user.id);
    expect(ctx.tenantId).toBe(tenant.id);
    expect(Array.isArray(ctx.appMemberships)).toBe(true);
    expect(Array.isArray(ctx.functionalRoles)).toBe(true);
  });
});

function mockRes(): Response {
  const headers: Record<string, string> = {};
  return { setHeader: (k: string, v: string) => { headers[k] = v; }, locals: { headers } } as unknown as Response;
}

describe('enforcement mode', () => {
  it('defaults to off when env unset', () => {
    delete process.env.SCOPE_ENFORCEMENT_MODE;
    expect(readEnforcementMode()).toBe('off');
  });

  it('throws in enforce mode', () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'enforce';
    expect(() =>
      applyEnforcement(new ScopeViolationError({ module: 'cmdb', action: 'update', applicationId: 'a1' }), mockRes()),
    ).toThrow(ScopeViolationError);
  });

  it('returns silently in off mode', () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'off';
    expect(() =>
      applyEnforcement(new ScopeViolationError({ module: 'cmdb', action: 'update' }), mockRes()),
    ).not.toThrow();
  });

  it('sets X-Scope-Warning in warn mode and does not throw', () => {
    process.env.SCOPE_ENFORCEMENT_MODE = 'warn';
    const res = mockRes();
    expect(() =>
      applyEnforcement(new ScopeViolationError({ module: 'cmdb', action: 'update', applicationId: 'a1' }), res),
    ).not.toThrow();
    expect((res as unknown as { locals: { headers: Record<string, string> } }).locals.headers['X-Scope-Warning'])
      .toBe('cmdb.update:a1');
  });
});

describe('buildScopedDb resolvers', () => {
  it('cmdb.canWrite returns true when user is a CONTRIBUTOR of the target app', () => {
    const db: ScopedDb = buildScopedDb(prisma, {
      userId: 'u', tenantId: 't',
      appMemberships: [{ appId: 'app-a', role: 'CONTRIBUTOR' }],
      functionalRoles: [],
    });
    expect(db.cmdb.canWriteApp('app-a')).toBe(true);
    expect(db.cmdb.canWriteApp('app-b')).toBe(false);
  });

  it('cmdb.canWrite returns true for PLATFORM_ADMIN regardless of membership', () => {
    const db = buildScopedDb(prisma, {
      userId: 'u', tenantId: 't',
      appMemberships: [],
      functionalRoles: ['PLATFORM_ADMIN'],
    });
    expect(db.cmdb.canWriteApp('app-x')).toBe(true);
  });

  it('cmdb.canWrite returns true for NULL applicationId only for PLATFORM_ADMIN', () => {
    const member = buildScopedDb(prisma, {
      userId: 'u', tenantId: 't',
      appMemberships: [{ appId: 'app-a', role: 'CONTRIBUTOR' }],
      functionalRoles: [],
    });
    const admin = buildScopedDb(prisma, {
      userId: 'u', tenantId: 't',
      appMemberships: [],
      functionalRoles: ['PLATFORM_ADMIN'],
    });
    expect(member.cmdb.canWriteApp(null)).toBe(false);
    expect(admin.cmdb.canWriteApp(null)).toBe(true);
  });
});
