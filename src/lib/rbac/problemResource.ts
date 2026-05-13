import type { Problem } from '@/src/types/problem';
import type { RbacResource } from '@/src/types/rbac';

// Problem is scoped via its ownerTeamId. IFM sees all; APS sees problems owned by their teams.
export function problemResource(problem: Problem): RbacResource {
  return { ownerTeamId: problem.ownerTeamId };
}
