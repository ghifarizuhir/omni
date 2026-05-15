// Minimal dev seed: tenant + superadmin account + RBAC permission catalog + system roles.
// Idempotent: clears all domain data first so re-running gives a clean state.

import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { seedRbac, systemRoleId } from './seedRbac';

const ARGON_OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

const prisma = new PrismaClient();

const ADMIN_PASSWORD = process.env.SEED_PASSWORD ?? 'demo';
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
    prisma.userFunctionalRole.deleteMany(),
    prisma.applicationTeam.deleteMany(),
    prisma.functionalRole.deleteMany(),
    prisma.application.deleteMany(),
    prisma.team.deleteMany(),
    prisma.department.deleteMany(),
    prisma.division.deleteMany(),
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

  console.log('[seed] superadmin user…');
  const passwordHash = await hash(ADMIN_PASSWORD, ARGON_OPTS);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@omni.local',
      name: 'Super Admin',
      passwordHash,
      isSuperadmin: true,
    },
  });
  const membership = await prisma.tenantMembership.create({
    data: { tenantId: TENANT.id, userId: admin.id },
  });
  await prisma.membershipRole.create({
    data: { membershipId: membership.id, roleId: systemRoleId('admin') },
  });

  console.log('[seed] done.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
