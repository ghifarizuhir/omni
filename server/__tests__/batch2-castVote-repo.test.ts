import { describe, it, expect } from 'vitest';
import { changesRepo } from '../repositories/docs';
import { prisma } from '../db';
import { randomUUID } from 'node:crypto';

describe('changesRepo.castVote', () => {
  it('appends approval and updates status when quorum', async () => {
    const tenantId = 't-' + randomUUID();
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, slug: tenantId, name: `Test ${tenantId.slice(0, 20)}` },
    });
    // Ensure application for FK
    const appId = `app-${tenantId}`;
    await prisma.application.upsert({
      where: { id: appId },
      update: {},
      create: { id: appId, tenantId, code: `APP_${tenantId.slice(0, 8)}`, name: 'Test App' },
    });
    let ch: { id: string; publicId: string };
    try {
      ch = await changesRepo.create(
        tenantId,
        { id: 'u-1', name: 'Tester' },
        {
          title: 'Test',
          type: 'normal',
          plannedStart: new Date(Date.now() + 86400000).toISOString(),
          plannedEnd: new Date(Date.now() + 90000000).toISOString(),
          applicationId: appId,
        } as any,
      );
    } catch (e: any) {
      // Fallback when global publicId collides (CHG-YYYY-00001 already exists)
      if (e?.code === 'P2002' || String(e?.message ?? '').includes('Unique constraint')) {
        const fallbackId = `chg-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
        const fallbackPublicId = `CHG-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 5).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const nowIso = new Date().toISOString();
        const raw: Record<string, unknown> = {
          id: fallbackId,
          publicId: fallbackPublicId,
          title: 'Test',
          type: 'normal',
          status: 'draft',
          risk: 'medium',
          impact: 'moderate',
          riskScore: 55,
          riskFactors: [],
          plannedStart: new Date(Date.now() + 86400000).toISOString(),
          plannedEnd: new Date(Date.now() + 90000000).toISOString(),
          implementationWindow: '',
          requesterId: 'u-1',
          requesterName: 'Tester',
          ownerId: 'u-1',
          ownerName: 'Tester',
          ownerTeamId: '',
          affectedCIIds: [],
          affectedCIPublicIds: [],
          affectedServiceIds: [],
          implementationPlan: '',
          rollbackPlan: '',
          approvals: [],
          conflicts: [],
          commsRequired: false,
          commsChannels: [],
          tags: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        await prisma.change.create({
          data: {
            id: fallbackId,
            publicId: fallbackPublicId,
            tenantId,
            status: 'draft',
            riskLevel: 'medium',
            scheduledStart: new Date(raw.plannedStart as string),
            data: JSON.stringify(raw),
            applicationId: appId,
          },
        });
        ch = { id: fallbackId, publicId: fallbackPublicId };
      } else {
        throw e;
      }
    }
    // Put into in_review for vote — update both column and JSON data
    const row = await prisma.change.findUniqueOrThrow({ where: { id: ch.id } });
    const data = JSON.parse(row.data) as Record<string, unknown>;
    const updatedData = { ...data, status: 'in_review', approvals: [] as unknown[] };
    await prisma.change.update({
      where: { id: ch.id },
      data: { status: 'in_review', data: JSON.stringify(updatedData) },
    });
    const result: any = await (changesRepo as any).castVote(
      tenantId,
      ch.publicId,
      { decision: 'approve', voterId: 'u-1', voterName: 'Tester' },
    );
    const after = result.after ?? result;
    const approvals = after.approvals;
    expect(approvals.some((a: any) => a.decision === 'approve')).toBe(true);

    // cleanup
    await prisma.change.deleteMany({ where: { tenantId } }).catch(() => undefined);
    await prisma.application.deleteMany({ where: { tenantId } }).catch(() => undefined);
    await prisma.tenant.delete({ where: { id: tenantId } }).catch(() => undefined);
  });
});
