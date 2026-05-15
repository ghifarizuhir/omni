// Production seed: provisions ONLY a root tenant + admin user + privileged
// membership. Sourced from env. Idempotent — safe to re-run.
//
// Required env:
//   ADMIN_EMAIL       — root admin's email
//   ADMIN_NAME        — root admin's display name
//   ADMIN_PASSWORD    — initial password (will be argon2-hashed before storing)
//
// Optional env:
//   ROOT_TENANT_SLUG  — slug for the root tenant (default: "default")
//   ROOT_TENANT_NAME  — display name (default: "Default Tenant")
//
// This script intentionally does NOT seed any demo data (CIs, incidents,
// changes, events, monitoring rules, etc.). The companion `prisma/seed.ts`
// is the rich dev/staging seed.

import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { seedRbac } from './seedRbac';

const prisma = new PrismaClient();

// Same argon2 params as server/auth/session.ts (hashPassword) — keep in sync.
const ARGON_OPTS = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

// The built-in system "admin" role grants every permission in the catalog.
// Its id matches `prisma/seedRbac.ts`; we delegate role + permission seeding
// to seedRbac() so the role row has its full permission set before we link it.
const SYSTEM_ADMIN_ROLE_ID = 'role-system-admin';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    console.error(
      `[seed.prod] FATAL: required env var ${name} is missing or empty.\n` +
        `             Set ADMIN_EMAIL, ADMIN_NAME, and ADMIN_PASSWORD before running this seed.`,
    );
    process.exit(1);
  }
  return v;
}

async function main() {
  const adminEmail = requireEnv('ADMIN_EMAIL').toLowerCase();
  const adminName = requireEnv('ADMIN_NAME');
  const adminPassword = requireEnv('ADMIN_PASSWORD');
  const tenantSlug = (process.env.ROOT_TENANT_SLUG ?? 'default').trim();
  const tenantName = (process.env.ROOT_TENANT_NAME ?? 'Default Tenant').trim();

  // 1. Tenant — look up by slug, create if missing.
  let tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (tenant) {
    console.log(`[seed.prod] tenant '${tenantSlug}' already exists — skipping create.`);
  } else {
    tenant = await prisma.tenant.create({
      data: { slug: tenantSlug, name: tenantName },
    });
    console.log(`[seed.prod] tenant created: ${tenant.slug} (id ${tenant.id}).`);
  }

  // 2. Admin user — look up by email, create if missing.
  let user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (user) {
    console.log(`[seed.prod] user '${adminEmail}' already exists — skipping create (password not touched).`);
  } else {
    const passwordHash = await hash(adminPassword, ARGON_OPTS);
    user = await prisma.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
      },
    });
    console.log(`[seed.prod] admin user created: ${user.email} (id ${user.id}).`);
  }

  // 3. TenantMembership — unique on (tenantId, userId).
  let membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
  });
  if (membership) {
    console.log(`[seed.prod] membership ${user.id} <-> ${tenant.id} already exists — skipping create.`);
  } else {
    membership = await prisma.tenantMembership.create({
      data: { tenantId: tenant.id, userId: user.id },
    });
    console.log(`[seed.prod] membership created: ${user.id} <-> ${tenant.id}.`);
  }

  // 4. RBAC catalog — seed permission catalog + system roles (with permission
  //    attachments) BEFORE linking the admin role to the membership, so that
  //    once the link is created the admin role actually carries permissions.
  //    Idempotent: seedRbac uses upserts and is safe to re-run.
  console.log('[seed.prod] seeding RBAC permission catalog…');
  const rbacResult = await seedRbac(prisma);
  console.log(
    `[seed.prod] RBAC catalog seeded (${rbacResult.permissions} permissions, ${rbacResult.roles} system roles)`,
  );

  // 4b. Functional roles — tenant-scoped bypass roles for app scope enforcement.
  //     See docs/superpowers/specs/2026-05-15-rbac-app-scope-design.md §5.2.
  const {
    FUNCTIONAL_ROLE_CODES,
    FUNCTIONAL_ROLE_DEFINITIONS,
  } = await import('../server/constants/functionalRoles');

  for (const code of FUNCTIONAL_ROLE_CODES) {
    const def = FUNCTIONAL_ROLE_DEFINITIONS[code];
    await prisma.functionalRole.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code } },
      update: { name: def.name, description: def.description },
      create: {
        id: `frole-${tenant.id}-${code.toLowerCase()}`,
        tenantId: tenant.id,
        code,
        name: def.name,
        description: def.description,
      },
    });
  }
  console.log(
    `[seed.prod] functional roles upserted (${FUNCTIONAL_ROLE_CODES.length}): ${FUNCTIONAL_ROLE_CODES.join(', ')}`,
  );

  // 5. MembershipRole — ensure the admin role is attached. After step 4 the
  //    role row exists with its full permission set already attached.
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { id: SYSTEM_ADMIN_ROLE_ID },
  });
  const existingRoleLink = await prisma.membershipRole.findUnique({
    where: { membershipId_roleId: { membershipId: membership.id, roleId: adminRole.id } },
  });
  if (existingRoleLink) {
    console.log(`[seed.prod] membership already has role '${adminRole.name}' — skipping.`);
  } else {
    await prisma.membershipRole.create({
      data: { membershipId: membership.id, roleId: adminRole.id },
    });
    console.log(`[seed.prod] attached role '${adminRole.name}' to membership ${membership.id}.`);
  }

  console.log('');
  console.log(`[seed.prod] tenant: ${tenant.slug} (id ${tenant.id})`);
  console.log(`[seed.prod] admin: ${user.email} (id ${user.id})`);
  console.log(`[seed.prod] membership: ${user.id} <-> ${tenant.id} @ role=${adminRole.name}`);
  console.log('[seed.prod] done.');
}

main()
  .catch((err) => {
    console.error('[seed.prod] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
