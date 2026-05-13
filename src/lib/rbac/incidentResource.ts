import type { Incident } from '@/src/types/incident';
import type { RbacResource } from '@/src/types/rbac';

// Map an Incident to RbacResource. Incidents are scoped via assigneeTeamId.
// Unassigned incidents (no team yet) are intentionally NOT in any APS team scope —
// IFM still sees them via 'all' scope; APS sees them once they're assigned.
export function incidentResource(incident: Incident): RbacResource {
  return { ownerTeamId: incident.assigneeTeamId };
}
