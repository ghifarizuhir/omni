// Seeds the dev DB. Idempotent: clears the pilot domains first so re-running gives a clean state.

import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import {
  seedDocuments,
  divisions as RBAC_DIVISIONS,
  departments as RBAC_DEPARTMENTS,
  rbacTeams as RBAC_TEAMS,
  applications as RBAC_APPLICATIONS,
  functionalRoles as RBAC_FUNCTIONAL_ROLES,
  rbacUsers as RBAC_USERS,
} from './seedDocuments';
import { seedRbac, systemRoleId } from './seedRbac';

async function seedRbacOrg(prisma: PrismaClient, tenantId: string) {
  console.log('[seed] rbac org tree…');

  for (const d of RBAC_DIVISIONS) {
    await prisma.division.upsert({
      where: { id: d.id },
      create: { id: d.id, tenantId, code: d.code, name: d.name },
      update: { code: d.code, name: d.name },
    });
  }
  for (const d of RBAC_DEPARTMENTS) {
    await prisma.department.upsert({
      where: { id: d.id },
      create: { id: d.id, tenantId, divisionId: d.divisionId, code: d.code, name: d.name },
      update: { divisionId: d.divisionId, code: d.code, name: d.name },
    });
  }
  for (const t of RBAC_TEAMS) {
    await prisma.team.upsert({
      where: { id: t.id },
      create: { id: t.id, tenantId, departmentId: t.departmentId, code: t.code, name: t.name },
      update: { departmentId: t.departmentId, code: t.code, name: t.name },
    });
  }
  for (const a of RBAC_APPLICATIONS) {
    await prisma.application.upsert({
      where: { id: a.id },
      create: { id: a.id, tenantId, code: a.code, name: a.name },
      update: { code: a.code, name: a.name },
    });
    if (a.ownerTeamId) {
      await prisma.applicationTeam.upsert({
        where: { applicationId_teamId: { applicationId: a.id, teamId: a.ownerTeamId } },
        create: { applicationId: a.id, teamId: a.ownerTeamId },
        update: {},
      });
    }
  }
  for (const r of RBAC_FUNCTIONAL_ROLES) {
    await prisma.functionalRole.upsert({
      where: { id: r.id },
      create: { id: r.id, tenantId, code: r.code, name: r.name, description: r.description ?? null },
      update: { code: r.code, name: r.name, description: r.description ?? null },
    });
  }
  for (const u of RBAC_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          isSuperadmin: u.isSuperadmin,
          level: u.level ?? null,
          divisionId: u.divisionId ?? null,
          departmentId: u.departmentId ?? null,
          teamId: u.teamId ?? null,
        },
      });
      await prisma.userFunctionalRole.deleteMany({ where: { userId: existing.id } });
      for (const code of u.functionalRoles) {
        const fr = await prisma.functionalRole.findFirst({ where: { tenantId, code } });
        if (fr) {
          await prisma.userFunctionalRole.create({ data: { userId: existing.id, functionalRoleId: fr.id } });
        }
      }
    } else {
      const created = await prisma.user.create({
        data: {
          id: u.id, email: u.email, name: u.name,
          isSuperadmin: u.isSuperadmin,
          level: u.level ?? null,
          divisionId: u.divisionId ?? null,
          departmentId: u.departmentId ?? null,
          teamId: u.teamId ?? null,
        },
      });
      for (const code of u.functionalRoles) {
        const fr = await prisma.functionalRole.findFirst({ where: { tenantId, code } });
        if (fr) {
          await prisma.userFunctionalRole.create({ data: { userId: created.id, functionalRoleId: fr.id } });
        }
      }
    }
  }
}

const ARGON_OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

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

  console.log('[seed] users…');
  const passwordHash = await hash(DEMO_PASSWORD, ARGON_OPTS);
  // Emails mirror the rbac-user documents so the persona switcher resolves correctly.
  const demoUsers: { email: string; name: string; role: string }[] = [
    { email: 'admin@omni.local',           name: 'Super Admin',      role: 'admin'    },
    { email: 'andi.wibowo@omni.local',     name: 'Andi Wibowo',      role: 'operator' },
    { email: 'fitri.handayani@omni.local', name: 'Fitri Handayani',  role: 'operator' },
    { email: 'hadi.wijaya@omni.local',     name: 'Hadi Wijaya',      role: 'operator' },
    { email: 'joko.susilo@omni.local',     name: 'Joko Susilo',      role: 'member'   },
  ];
  for (const u of demoUsers) {
    const user = await prisma.user.create({ data: { email: u.email, name: u.name, passwordHash } });
    const membership = await prisma.tenantMembership.create({ data: { tenantId: TENANT.id, userId: user.id } });
    await prisma.membershipRole.create({ data: { membershipId: membership.id, roleId: systemRoleId(u.role) } });
  }

  await seedRbacOrg(prisma, TENANT.id);

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
