// Audit log emitter. Each domain repository calls `audit(req, …)` after a
// successful write. Centralized here so the columns and serialization rules
// stay consistent.

import type { Request } from 'express';
import { prisma } from './db';
import type { ScopeMode } from './scope/scopedDb';

export interface AuditEvent {
  action: string;
  resourceKind: string;
  resourceId: string;
  before?: unknown;
  after?: unknown;
  scopeMode?: ScopeMode;
}

export const audit = async (req: Request, ev: AuditEvent) => {
  await prisma.auditLog.create({
    data: {
      tenantId: req.tenantId,
      actorId: req.session?.userId ?? null,
      action: ev.action,
      resourceKind: ev.resourceKind,
      resourceId: ev.resourceId,
      before: ev.before != null ? JSON.stringify(ev.before) : null,
      after: ev.after != null ? JSON.stringify(ev.after) : null,
      ip: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      scopeMode: ev.scopeMode ?? null,
    },
  });
};
