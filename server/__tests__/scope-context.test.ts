import { describe, expect, it } from 'vitest';
import { ScopeViolationError } from '../scope/errors';

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
