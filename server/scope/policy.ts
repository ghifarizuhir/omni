import type { FunctionalRoleCode } from '../constants/functionalRoles';

export type ModuleKey =
  | 'cmdb'
  | 'event'
  | 'incident'
  | 'service_request'
  | 'problem'
  | 'change'
  | 'release'
  | 'monitoring_rule'
  | 'alert_route';

export type ReadPolicy = 'global' | 'scoped';
export type WritePolicy = 'scoped' | 'admin_only';

export interface ModulePolicy {
  read: ReadPolicy;
  write: WritePolicy;
  /** Functional roles allowed to bypass read scope (in addition to membership). */
  readBypass: readonly FunctionalRoleCode[];
  /** Functional roles allowed to bypass write scope. */
  writeBypass: readonly FunctionalRoleCode[];
}

export const POLICY: Record<ModuleKey, ModulePolicy> = {
  cmdb:           { read: 'global', write: 'scoped',     readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
  change:         { read: 'global', write: 'scoped',     readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
  problem:        { read: 'global', write: 'scoped',     readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
  event:          { read: 'scoped', write: 'scoped',     readBypass: ['NOC_OPERATOR', 'AUDITOR', 'PLATFORM_ADMIN'], writeBypass: ['NOC_OPERATOR', 'PLATFORM_ADMIN'] },
  incident:       { read: 'scoped', write: 'scoped',     readBypass: ['NOC_OPERATOR', 'AUDITOR', 'PLATFORM_ADMIN'], writeBypass: ['NOC_OPERATOR', 'PLATFORM_ADMIN'] },
  service_request:{ read: 'scoped', write: 'scoped',     readBypass: ['AUDITOR', 'PLATFORM_ADMIN'],                  writeBypass: ['NOC_OPERATOR', 'PLATFORM_ADMIN'] },
  release:        { read: 'global', write: 'admin_only', readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
  monitoring_rule:{ read: 'global', write: 'admin_only', readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
  alert_route:    { read: 'global', write: 'admin_only', readBypass: [],                          writeBypass: ['PLATFORM_ADMIN'] },
};
