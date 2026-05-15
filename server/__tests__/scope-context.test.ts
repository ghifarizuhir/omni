import { describe, expect, it, afterAll } from 'vitest';
import { ScopeViolationError } from '../scope/errors';
import { POLICY, type ModuleKey } from '../scope/policy';
import { resolveScopeContext, type ScopeContext } from '../scope/context';
import { prisma } from '../db';

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
