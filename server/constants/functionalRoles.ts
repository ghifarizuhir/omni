/**
 * Tenant-scoped bypass roles used by the app-scope enforcement layer.
 * Codes match the `FunctionalRole.code` column and are seeded per tenant
 * in prisma/seed.prod.ts. See docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md.
 */

export const PLATFORM_ADMIN = 'PLATFORM_ADMIN' as const;
export const NOC_OPERATOR  = 'NOC_OPERATOR'  as const;
export const AUDITOR       = 'AUDITOR'       as const;

export const FUNCTIONAL_ROLE_CODES = [
  PLATFORM_ADMIN,
  NOC_OPERATOR,
  AUDITOR,
] as const;

export type FunctionalRoleCode = typeof FUNCTIONAL_ROLE_CODES[number];

export const FUNCTIONAL_ROLE_DEFINITIONS: Record<
  FunctionalRoleCode,
  { name: string; description: string }
> = {
  PLATFORM_ADMIN: {
    name: 'Platform Administrator',
    description: 'Tenant-wide bypass: full read and write on every application.',
  },
  NOC_OPERATOR: {
    name: 'NOC / Service Desk Operator',
    description:
      'Cross-application read; may create and triage Incidents and Service Requests for any application.',
  },
  AUDITOR: {
    name: 'Auditor',
    description: 'Tenant-wide read of every module (including normally scoped data). No write access.',
  },
};
