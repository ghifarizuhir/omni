export type ScopeAction = 'read' | 'create' | 'update' | 'delete';

export interface ScopeViolation {
  module: string;
  action: ScopeAction;
  applicationId?: string;
}

export class ScopeViolationError extends Error {
  readonly module: string;
  readonly action: ScopeAction;
  readonly applicationId?: string;

  constructor(v: ScopeViolation) {
    super(`scope_violation: ${v.module}.${v.action}${v.applicationId ? ` (app ${v.applicationId})` : ''}`);
    this.name = 'ScopeViolationError';
    this.module = v.module;
    this.action = v.action;
    this.applicationId = v.applicationId;
  }

  toJSON() {
    return {
      error: 'scope_violation' as const,
      module: this.module,
      action: this.action,
      applicationId: this.applicationId,
    };
  }
}
