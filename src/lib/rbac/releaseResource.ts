import type { Release } from '@/src/types/release';
import type { RbacResource } from '@/src/types/rbac';

// Release is scoped via ownerTeamId (with inheritance) — same pattern as Change.
export function releaseResource(release: Release): RbacResource {
  return { ownerTeamId: release.ownerTeamId };
}
