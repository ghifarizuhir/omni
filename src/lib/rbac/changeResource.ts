import type { Change } from '@/src/types/change';
import type { RbacResource } from '@/src/types/rbac';

// Map a Change to the RbacResource shape so the scope check works against it.
// Change is scoped by its ownerTeamId; engine resolves team inheritance.
export function changeResource(change: Change): RbacResource {
  return { ownerTeamId: change.ownerTeamId };
}
