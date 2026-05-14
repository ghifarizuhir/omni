import type { ServiceRequest, CatalogItem } from '@/src/types/request';
import type { RbacResource } from '@/src/types/rbac';

// Catalog items are registered at app boot by CurrentUserProvider once they're
// fetched from /api/v1/catalog. Previously this helper imported the mock array
// directly, which coupled authorization to seed data.
let registry: CatalogItem[] = [];

export function registerCatalogItems(items: CatalogItem[]): void {
  registry = items;
}

// Map a ServiceRequest to RbacResource.
// - ownerUserId from requesterId → enables 'own' scope for requesters.
// - ownerTeamId derived from the catalog item's owner team → enables 'team_app' scope
//   for the fulfilling APS/IFM team.
export function requestResource(
  req: ServiceRequest,
  items: CatalogItem[] = registry,
): RbacResource {
  const item = items.find(c => c.id === req.catalogItemId);
  return {
    ownerUserId: req.requesterId,
    ownerTeamId: item?.ownerTeamId,
  };
}
