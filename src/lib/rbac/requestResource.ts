import type { ServiceRequest, CatalogItem } from '@/src/types/request';
import type { RbacResource } from '@/src/types/rbac';
import { mockCatalogItems } from '@/src/mocks/catalogItems';

// Map a ServiceRequest to RbacResource.
// - ownerUserId from requesterId → enables 'own' scope for requesters.
// - ownerTeamId derived from the catalog item's owner team → enables 'team_app' scope
//   for the fulfilling APS/IFM team.
export function requestResource(
  req: ServiceRequest,
  items: CatalogItem[] = mockCatalogItems,
): RbacResource {
  const item = items.find(c => c.id === req.catalogItemId);
  return {
    ownerUserId: req.requesterId,
    ownerTeamId: item?.ownerTeamId,
  };
}
