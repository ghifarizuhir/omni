// Seed the dev DB.
//
// NOTE: As of 2026-05-15, seed.ts has been deprecated. The mock files used for
// dev seeding have been removed as part of the mocks/ cleanup. Use seed.prod.ts
// for production seeding instead. To restore dev seeding, restore this file's
// implementation from git history (commit: cd3f0d5 and prior).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('[seed] WARNING: seed.ts deprecated (mocks removed in cleanup). Use seed.prod.ts.');
  console.log('[seed] done.');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
