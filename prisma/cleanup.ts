// One-off cleanup: wipes all operational data and non-superadmin users,
// leaving only the admin@omni.local auth user + its rbac-user document,
// the tenant, the RBAC permission catalog, and system roles.
// Run with: npx tsx prisma/cleanup.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TENANT_ID = 'tenant-demo';
const KEEP_USER_EMAIL = 'admin@omni.local';
const KEEP_RBAC_DOC_KEY = 'u-super';

async function main() {
  // 1. Operational tables — no dependencies between them (safe to batch)
  console.log('[cleanup] clearing operational data…');
  await prisma.$transaction([
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
  ]);

  // 2. All documents except u-super rbac-user
  console.log('[cleanup] clearing documents (keeping u-super)…');
  await prisma.document.deleteMany({
    where: {
      tenantId: TENANT_ID,
      NOT: { kind: 'rbac-user', key: KEEP_RBAC_DOC_KEY },
    },
  });

  // 3. Non-admin auth users (sessions → memberships → users)
  console.log('[cleanup] removing non-admin auth users…');
  const adminUser = await prisma.user.findUnique({ where: { email: KEEP_USER_EMAIL } });
  if (!adminUser) {
    console.warn(`[cleanup] WARNING: ${KEEP_USER_EMAIL} not found — skipping user cleanup`);
  } else {
    // Delete sessions for other users
    await prisma.session.deleteMany({ where: { userId: { not: adminUser.id } } });
    // Delete membership-roles for other memberships
    const otherMemberships = await prisma.tenantMembership.findMany({
      where: { tenantId: TENANT_ID, userId: { not: adminUser.id } },
      select: { id: true },
    });
    const otherMembershipIds = otherMemberships.map(m => m.id);
    if (otherMembershipIds.length) {
      await prisma.membershipRole.deleteMany({ where: { membershipId: { in: otherMembershipIds } } });
      await prisma.tenantMembership.deleteMany({ where: { id: { in: otherMembershipIds } } });
    }
    // Delete other user records
    await prisma.user.deleteMany({ where: { id: { not: adminUser.id } } });
    console.log(`[cleanup] kept: ${KEEP_USER_EMAIL} (id: ${adminUser.id})`);
  }

  const remaining = await prisma.document.count({ where: { tenantId: TENANT_ID } });
  const userCount = await prisma.user.count();
  console.log(`[cleanup] done — ${remaining} document(s) remaining, ${userCount} auth user(s) remaining`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('[cleanup] failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
