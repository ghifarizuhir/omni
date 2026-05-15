import { describe, expect, it } from 'vitest';
import { ScopeViolationError } from '../scope/errors';
import { POLICY, type ModuleKey } from '../scope/policy';

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
