// Seed the dev DB from existing src/mocks/*.ts files.
// Idempotent: clears the pilot domains first so re-running gives a clean state.

import { PrismaClient } from '@prisma/client';
import { mockCIs } from '../src/mocks/cis';
import { mockCIRelationships } from '../src/mocks/ciRelationships';
import { mockCIAuditEntries } from '../src/mocks/ciAudit';
import { mockEvents } from '../src/mocks/events';
import { mockMonitoringRules } from '../src/mocks/monitoringRules';
import { mockAlertRoutes } from '../src/mocks/alertRoutes';
import { mockIncidents } from '../src/mocks/incidents';
import { mockIncidentComments } from '../src/mocks/incidentComments';
import { mockIncidentTimelines } from '../src/mocks/incidentTimelines';
import { mockUsers } from '../src/mocks/users';
import { mockServices } from '../src/mocks/services';
import { mockProblems } from '../src/mocks/problems';
import { mockChanges } from '../src/mocks/changes';
import { mockReleases } from '../src/mocks/releases';
import { mockDeployments } from '../src/mocks/deployments';
import { mockDeploymentLogs } from '../src/mocks/deploymentLogs';
import { mockServiceRequests } from '../src/mocks/serviceRequests';
import { mockCatalogItems } from '../src/mocks/catalogItems';
import { mockIntegrations } from '../src/mocks/integrations';
import { mockKBArticles } from '../src/mocks/kbArticles';
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

  console.log(`[seed] users (${mockUsers.length})…`);
  const passwordHash = await hash(DEMO_PASSWORD, { memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  await prisma.user.createMany({
    data: mockUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl ?? null,
      passwordHash,
    })),
  });

  console.log(`[seed] memberships…`);
  await prisma.tenantMembership.createMany({
    data: mockUsers.map(u => ({
      id: `mem-${u.id}`,
      tenantId: TENANT.id,
      userId: u.id,
    })),
  });

  console.log(`[seed] membership roles…`);
  await prisma.membershipRole.createMany({
    data: mockUsers.map((u, idx) => ({
      membershipId: `mem-${u.id}`,
      roleId: systemRoleId(idx === 0 ? 'admin' : 'operator'),
    })),
  });

  console.log(`[seed] CIs (${mockCIs.length})…`);
  await prisma.configurationItem.createMany({
    data: mockCIs.map(ci => ({
      id: ci.id,
      publicId: ci.publicId,
      tenantId: TENANT.id,
      name: ci.name,
      type: ci.type,
      status: ci.status,
      environment: ci.environment,
      criticality: ci.criticality,
      ownerId: ci.ownerId ?? null,
      ownerTeamId: ci.ownerTeamId,
      serviceId: ci.serviceId ?? null,
      health: ci.health,
      attributes: JSON.stringify(ci.attributes),
      tags: JSON.stringify(ci.tags),
      createdAt: new Date(ci.createdAt),
      updatedAt: new Date(ci.updatedAt),
      lastDiscoveredAt: ci.lastDiscoveredAt ? new Date(ci.lastDiscoveredAt) : null,
      openIncidentCount: ci.openIncidentCount,
      recentChangeCount: ci.recentChangeCount,
      monitoringRuleCount: ci.monitoringRuleCount,
    })),
  });

  console.log(`[seed] CI relationships (${mockCIRelationships.length})…`);
  await prisma.cIRelationship.createMany({
    data: mockCIRelationships.map(r => ({
      id: r.id,
      tenantId: TENANT.id,
      fromCiId: r.fromCiId,
      toCiId: r.toCiId,
      type: r.type,
      description: r.description ?? null,
      createdAt: new Date(r.createdAt),
    })),
  });

  console.log(`[seed] CI audit entries (${mockCIAuditEntries.length})…`);
  await prisma.cIAuditEntry.createMany({
    data: mockCIAuditEntries.map(a => ({
      id: a.id,
      tenantId: TENANT.id,
      ciId: a.ciId,
      ciPublicId: a.ciPublicId,
      ciName: a.ciName,
      action: a.action,
      actorId: a.actorId,
      actorName: a.actorName,
      actorType: a.actorType,
      field: a.field ?? null,
      beforeValue: a.before != null ? JSON.stringify(a.before) : null,
      afterValue: a.after != null ? JSON.stringify(a.after) : null,
      source: a.source,
      description: a.description ?? null,
      timestamp: new Date(a.timestamp),
    })),
  });

  console.log(`[seed] events (${mockEvents.length})…`);
  await prisma.event.createMany({
    data: mockEvents.map(e => ({
      id: e.id,
      publicId: e.publicId,
      tenantId: TENANT.id,
      type: e.type,
      status: e.status,
      severity: e.severity,
      title: e.title,
      message: e.message,
      source: e.source,
      ruleId: e.ruleId ?? null,
      rulePublicId: e.rulePublicId ?? null,
      ruleName: e.ruleName ?? null,
      affectedCIIds: JSON.stringify(e.affectedCIIds),
      affectedCIPublicIds: JSON.stringify(e.affectedCIPublicIds),
      correlationKey: e.correlationKey,
      groupCount: e.groupCount,
      firedAt: new Date(e.firedAt),
      lastSeenAt: new Date(e.lastSeenAt),
      acknowledgedAt: e.acknowledgedAt ? new Date(e.acknowledgedAt) : null,
      acknowledgedBy: e.acknowledgedBy ?? null,
      resolvedAt: e.resolvedAt ? new Date(e.resolvedAt) : null,
      resolvedBy: e.resolvedBy ?? null,
      linkedIncidentId: e.linkedIncidentId ?? null,
      payload: JSON.stringify(e.payload),
      tags: JSON.stringify(e.tags),
    })),
  });

  console.log(`[seed] monitoring rules (${mockMonitoringRules.length})…`);
  await prisma.monitoringRule.createMany({
    data: mockMonitoringRules.map(r => ({
      id: r.id,
      publicId: r.publicId,
      tenantId: TENANT.id,
      data: JSON.stringify(r),
      enabled: r.enabled,
      lastTriggeredAt: r.lastTriggeredAt ? new Date(r.lastTriggeredAt) : null,
    })),
  });

  console.log(`[seed] alert routes (${mockAlertRoutes.length})…`);
  await prisma.alertRoute.createMany({
    data: mockAlertRoutes.map(r => ({
      id: r.id,
      publicId: r.publicId,
      tenantId: TENANT.id,
      data: JSON.stringify(r),
    })),
  });

  console.log(`[seed] incidents (${mockIncidents.length})…`);
  await prisma.incident.createMany({
    data: mockIncidents.map(i => ({
      id: i.id,
      publicId: i.publicId,
      tenantId: TENANT.id,
      data: JSON.stringify(i),
      status: i.status,
      priority: i.priority,
      severity: i.severity,
      isMajor: i.isMajor,
      linkedProblemPublicId: i.linkedProblemPublicId ?? null,
      affectedCIIds: JSON.stringify(i.affectedCIIds),
      affectedCIPublicIds: JSON.stringify(i.affectedCIPublicIds),
      createdAt: new Date(i.createdAt),
      updatedAt: new Date(i.updatedAt),
    })),
  });

  console.log(`[seed] incident comments (${mockIncidentComments.length})…`);
  await prisma.incidentComment.createMany({
    data: mockIncidentComments.map(c => ({
      id: c.id,
      tenantId: TENANT.id,
      incidentId: c.incidentId,
      data: JSON.stringify(c),
      createdAt: new Date(c.createdAt ?? Date.now()),
    })),
  });

  console.log(`[seed] timeline events (${mockIncidentTimelines.length})…`);
  await prisma.incidentTimelineEvent.createMany({
    data: mockIncidentTimelines.map(t => ({
      id: t.id,
      tenantId: TENANT.id,
      incidentId: t.incidentId,
      kind: t.kind,
      timestamp: new Date(t.timestamp),
      data: JSON.stringify(t),
    })),
  });

  // ── M3 domains ─────────────────────────────────────────────────────────────
  console.log(`[seed] services (${mockServices.length})…`);
  await prisma.service.createMany({
    data: mockServices.map(s => ({ id: s.id, tenantId: TENANT.id, data: JSON.stringify(s) })),
  });

  console.log(`[seed] problems (${mockProblems.length})…`);
  await prisma.problem.createMany({
    data: mockProblems.map(p => ({
      id: p.id, publicId: p.publicId, tenantId: TENANT.id,
      status: p.status, data: JSON.stringify(p),
    })),
  });

  console.log(`[seed] changes (${mockChanges.length})…`);
  await prisma.change.createMany({
    data: mockChanges.map(c => ({
      id: c.id, publicId: c.publicId, tenantId: TENANT.id,
      status: c.status,
      riskLevel: (c as { riskLevel?: string }).riskLevel ?? null,
      scheduledStart: (c as unknown as { scheduledStart?: string }).scheduledStart
        ? new Date((c as unknown as { scheduledStart: string }).scheduledStart) : null,
      data: JSON.stringify(c),
    })),
  });

  console.log(`[seed] releases (${mockReleases.length})…`);
  await prisma.release.createMany({
    data: mockReleases.map(r => ({
      id: r.id, publicId: r.publicId, tenantId: TENANT.id,
      status: r.status, data: JSON.stringify(r),
    })),
  });

  console.log(`[seed] deployments (${mockDeployments.length})…`);
  await prisma.deployment.createMany({
    data: mockDeployments.map(d => ({
      id: d.id, publicId: d.publicId, tenantId: TENANT.id,
      status: d.status,
      environment: (d as { environment?: string }).environment ?? 'production',
      startedAt: (d as { startedAt?: string }).startedAt ? new Date((d as { startedAt: string }).startedAt) : null,
      data: JSON.stringify(d),
    })),
  });

  console.log(`[seed] deployment logs (${mockDeploymentLogs.length})…`);
  await prisma.deploymentLog.createMany({
    data: mockDeploymentLogs.map(l => ({
      id: l.id, tenantId: TENANT.id, deploymentId: l.deploymentId,
      data: JSON.stringify(l),
    })),
  });

  console.log(`[seed] service requests (${mockServiceRequests.length})…`);
  await prisma.serviceRequest.createMany({
    data: mockServiceRequests.map(r => ({
      id: r.id, publicId: r.publicId, tenantId: TENANT.id,
      status: r.status, data: JSON.stringify(r),
    })),
  });

  console.log(`[seed] catalog items (${mockCatalogItems.length})…`);
  await prisma.catalogItem.createMany({
    data: mockCatalogItems.map(c => ({ id: c.id, tenantId: TENANT.id, data: JSON.stringify(c) })),
  });

  console.log(`[seed] integrations (${mockIntegrations.length})…`);
  await prisma.integration.createMany({
    data: mockIntegrations.map(i => ({
      id: i.id, tenantId: TENANT.id, enabled: i.enabled,
      status: i.status, data: JSON.stringify(i),
    })),
  });

  console.log(`[seed] KB articles (${mockKBArticles.length})…`);
  await prisma.kBArticle.createMany({
    data: mockKBArticles.map(a => ({
      id: a.id, publicId: a.publicId, tenantId: TENANT.id,
      status: a.status, data: JSON.stringify(a),
    })),
  });

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
