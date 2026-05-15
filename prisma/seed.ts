// Seeds the dev DB. Idempotent: clears the pilot domains first so re-running gives a clean state.

import { PrismaClient } from '@prisma/client';
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
