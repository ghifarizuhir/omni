// Service-layer barrel. Routes/components should import from here. Every
// service calls the real HTTP backend via apiFetch; there is no mock fallback.

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
  apiTokensService,
  userChannelsService,
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
export type {
  ApiTokenSummary,
  ApiTokenCreated,
  NotificationChannelRow,
} from './platformServices';
