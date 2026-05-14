// Seed the dev DB from existing src/mocks/*.ts files.
// Idempotent: clears the pilot domains first so re-running gives a clean state.

import { PrismaClient } from '@prisma/client';
// Removed by mocks-cleanup: import { mockCIs } from '../src/mocks/cis';
// Removed by mocks-cleanup: import { mockCIRelationships } from '../src/mocks/ciRelationships';
// Removed by mocks-cleanup: import { mockCIAuditEntries } from '../src/mocks/ciAudit';
// Removed by mocks-cleanup: import { mockEvents } from '../src/mocks/events';
// Removed by mocks-cleanup: import { mockMonitoringRules } from '../src/mocks/monitoringRules';
// Removed by mocks-cleanup: import { mockAlertRoutes } from '../src/mocks/alertRoutes';
// Removed by mocks-cleanup: import { mockIncidents } from '../src/mocks/incidents';
// Removed by mocks-cleanup: import { mockIncidentComments } from '../src/mocks/incidentComments';
// Removed by mocks-cleanup: import { mockIncidentTimelines } from '../src/mocks/incidentTimelines';
// Removed by mocks-cleanup: import { mockUsers } from '../src/mocks/users';
// Removed by mocks-cleanup: import { mockServices } from '../src/mocks/services';
// Removed by mocks-cleanup: import { mockProblems } from '../src/mocks/problems';
// Removed by mocks-cleanup: import { mockChanges } from '../src/mocks/changes';
// Removed by mocks-cleanup: import { mockReleases } from '../src/mocks/releases';
// Removed by mocks-cleanup: import { mockDeployments } from '../src/mocks/deployments';
// Removed by mocks-cleanup: import { mockDeploymentLogs } from '../src/mocks/deploymentLogs';
// Removed by mocks-cleanup: import { mockServiceRequests } from '../src/mocks/serviceRequests';
// Removed by mocks-cleanup: import { mockCatalogItems } from '../src/mocks/catalogItems';
// Removed by mocks-cleanup: import { mockIntegrations } from '../src/mocks/integrations';
// Removed by mocks-cleanup: import { mockKBArticles } from '../src/mocks/kbArticles';
import { hash } from '@node-rs/argon2';
import { seedDocuments } from './seedDocuments';
import { seedRbac, systemRoleId } from './seedRbac';

const prisma = new PrismaClient();

// All seeded users share the same password for dev convenience. The first user
// gets the admin role; the rest are operators. Override via env at runtime.
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'demo';

const TENANT = { id: 'tenant-demo', slug: 'demo', name: 'Demo Organization' };

async function main() {
  console.log('[seed] resetting all domains…');
  await prisma.$transaction([
    prisma.document.deleteMany(),
    prisma.deploymentLog.deleteMany(),
    prisma.deployment.deleteMany(),
    prisma.release.deleteMany(),
    prisma.change.deleteMany(),
    prisma.problem.deleteMany(),
    prisma.serviceRequest.deleteMany(),
    prisma.catalogItem.deleteMany(),
    prisma.integration.deleteMany(),
    prisma.kBArticle.deleteMany(),
    prisma.service.deleteMany(),
    prisma.incidentTimelineEvent.deleteMany(),
    prisma.incidentComment.deleteMany(),
    prisma.incident.deleteMany(),
    prisma.event.deleteMany(),
    prisma.monitoringRule.deleteMany(),
    prisma.alertRoute.deleteMany(),
    prisma.cIAuditEntry.deleteMany(),
    prisma.cIRelationship.deleteMany(),
    prisma.configurationItem.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.membershipRole.deleteMany(),
    prisma.tenantMembership.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.session.deleteMany(),
    prisma.user.deleteMany(),
    prisma.tenant.deleteMany(),
  ]);

  console.log('[seed] tenant…');
  await prisma.tenant.create({ data: TENANT });

  console.log('[seed] rbac (permission catalog + system roles)…');
  await seedRbac(prisma);

  // Removed by mocks-cleanup: mockUsers was deleted
  // console.log(`[seed] users (${mockUsers.length})…`);
  // const passwordHash = await hash(DEMO_PASSWORD, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  // await prisma.user.createMany({...});

  // Removed by mocks-cleanup: memberships depend on mockUsers
  // console.log(`[seed] memberships…`);
  // await prisma.tenantMembership.createMany({...});

  // Removed by mocks-cleanup: membership roles depend on mockUsers
  // console.log(`[seed] membership roles…`);
  // await prisma.membershipRole.createMany({...});

  // Removed by mocks-cleanup: mockCIs was deleted
  // console.log(`[seed] CIs...`);
  // await prisma.configurationItem.createMany({...});

  // Removed by mocks-cleanup: mockCIRelationships was deleted
  // console.log(`[seed] CI relationships...`);
  // await prisma.cIRelationship.createMany({...});

  // Removed by mocks-cleanup: mockCIAuditEntries was deleted
  // console.log(`[seed] CI audit entries...`);
  // await prisma.cIAuditEntry.createMany({...});

  // Removed by mocks-cleanup: mockEvents was deleted
  // console.log(`[seed] events...`);
  // await prisma.event.createMany({...});

  // Removed by mocks-cleanup: mockMonitoringRules was deleted
  // console.log(`[seed] monitoring rules...`);
  // await prisma.monitoringRule.createMany({...});

  // Removed by mocks-cleanup: mockAlertRoutes was deleted
  // console.log(`[seed] alert routes...`);
  // await prisma.alertRoute.createMany({...});

  // Removed by mocks-cleanup: mockIncidents was deleted
  // console.log(`[seed] incidents...`);
  // await prisma.incident.createMany({...});

  // Removed by mocks-cleanup: mockIncidentComments was deleted
  // console.log(`[seed] incident comments...`);
  // await prisma.incidentComment.createMany({...});

  // Removed by mocks-cleanup: mockIncidentTimelines was deleted
  // console.log(`[seed] timeline events...`);
  // await prisma.incidentTimelineEvent.createMany({...});

  // ── M3 domains ─────────────────────────────────────────────────────────────
  // Removed by mocks-cleanup: mockServices was deleted
  // console.log(`[seed] services...`);
  // await prisma.service.createMany({...});

  // Removed by mocks-cleanup: mockProblems was deleted
  // console.log(`[seed] problems...`);
  // await prisma.problem.createMany({...});

  // Removed by mocks-cleanup: mockChanges was deleted
  // console.log(`[seed] changes...`);
  // await prisma.change.createMany({...});

  // Removed by mocks-cleanup: mockReleases was deleted
  // console.log(`[seed] releases...`);
  // await prisma.release.createMany({...});

  // Removed by mocks-cleanup: mockDeployments was deleted
  // console.log(`[seed] deployments...`);
  // await prisma.deployment.createMany({...});

  // Removed by mocks-cleanup: mockDeploymentLogs was deleted
  // console.log(`[seed] deployment logs...`);
  // await prisma.deploymentLog.createMany({...});

  // Removed by mocks-cleanup: mockServiceRequests was deleted
  // console.log(`[seed] service requests...`);
  // await prisma.serviceRequest.createMany({...});

  // Removed by mocks-cleanup: mockCatalogItems was deleted
  // console.log(`[seed] catalog items...`);
  // await prisma.catalogItem.createMany({...});

  // Removed by mocks-cleanup: mockIntegrations was deleted
  // console.log(`[seed] integrations...`);
  // await prisma.integration.createMany({...});

  // Removed by mocks-cleanup: mockKBArticles was deleted
  // console.log(`[seed] KB articles...`);
  // await prisma.kBArticle.createMany({...});

  console.log('[seed] documents (catalogs + snapshots)…');
  await seedDocuments(prisma, TENANT.id);

  console.log('[seed] done.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
