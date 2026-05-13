// Job registry. Define a new job by importing `defineJob` and calling it at
// module load time; this file imports each job module so registration happens.

import { defineJob } from './queue';
import { prisma } from '../db';

// Example: SLA breach detector. Marks `slaResolveStatus: 'breached'` on any
// incident whose deadline has passed. Wired to fire every 60s in M4; replace
// with a richer rule set in M5.
defineJob({
  name: 'sla-breach-detector',
  intervalMs: 60_000,
  fn: async () => {
    const rows = await prisma.incident.findMany({
      where: { status: { notIn: ['resolved', 'closed'] } },
    });
    for (const row of rows) {
      try {
        const inc = JSON.parse(row.data) as {
          createdAt: string; slaResolveTarget?: number; slaResolveStatus?: string;
        };
        if (!inc.slaResolveTarget || inc.slaResolveStatus === 'breached') continue;
        const created = new Date(inc.createdAt).getTime();
        const breachAt = created + inc.slaResolveTarget * 60_000;
        if (Date.now() > breachAt) {
          const next = { ...inc, slaResolveStatus: 'breached' };
          await prisma.incident.update({
            where: { id: row.id },
            data: { data: JSON.stringify(next) },
          });
        }
      } catch {
        // skip malformed row
      }
    }
  },
});

export { startScheduler, stopScheduler } from './queue';
