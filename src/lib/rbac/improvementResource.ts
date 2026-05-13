import type { ImprovementInitiative } from '@/src/types/improvement';
import type { RbacResource } from '@/src/types/rbac';

// Improvement initiative is scoped via ownerTeamId (with inheritance) + ownerUserId for own.
export function improvementResource(init: ImprovementInitiative): RbacResource {
  return {
    ownerTeamId: init.ownerTeamId,
    ownerUserId: init.ownerId,
  };
}
