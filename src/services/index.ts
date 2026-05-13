// Service-layer barrel. Routes/components should import from here, not from
// '../mocks/...'. Each service exposes async methods that wrap the in-memory
// mock store today and will call the real HTTP backend once VITE_API_MODE=live
// — no consumer changes needed at that point.

export * from './apiMode';
export * from './core';

export { integrationsService } from './integrationsService';
export type { IntegrationStats } from './integrationsService';

export { eventsService } from './eventsService';
export type { EventDashboardStats, EventListFilters } from './eventsService';

export { monitoringRulesService, alertRoutesService } from './monitoringService';

export { incidentsService } from './incidentsService';

export {
  problemsService,
  changesService,
  releasesService,
  deploymentsService,
  requestsService,
  improvementsService,
} from './itsmServices';

export { cisService, servicesService } from './cmdbService';

export { availabilityService } from './availabilityService';

export { capacityService } from './capacityService';

export {
  usersService,
  teamsService,
  notificationsService,
  inboxService,
  onCallService,
  knowledgeService,
  testingService,
  statusPageService,
  aiService,
  rbacService,
  continuityService,
  measurementService,
} from './platformServices';
