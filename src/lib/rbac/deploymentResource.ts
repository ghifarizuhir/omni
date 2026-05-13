import type { Deployment } from '@/src/types/deployment';
import type { Release } from '@/src/types/release';
import type { RbacResource } from '@/src/types/rbac';
import { mockReleases } from '@/src/mocks/releases';

// Deployments aren't directly team-scoped; resolve ownerTeamId via linkedReleaseId.
// If the deployment has no linked release (rare), fall through to undefined — engine
// will fall back to "any team in user scope" for team_app rules.
export function deploymentResource(
  dep: Deployment,
  releases: Release[] = mockReleases,
): RbacResource {
  if (!dep.linkedReleaseId) return {};
  const release = releases.find(r => r.id === dep.linkedReleaseId);
  return { ownerTeamId: release?.ownerTeamId };
}
