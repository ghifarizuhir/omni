import React, { useEffect, useState } from 'react';
import { cisService, incidentsService, useResource } from '@/src/services';
import { Dot } from '@/src/components/ui/Dot';
import { IDCell } from '@/src/components/ui/IDCell';
import { SparkLine } from '@/src/components/charts/SparkLine';
import { cn } from '@/src/lib/utils';

export type HoverEntityKind = 'incident' | 'problem' | 'change' | 'event' | 'ci';

interface EntityHoverCardProps {
  open: boolean;
  kind: HoverEntityKind;
  id: string;       // public identifier (e.g. CI-7710)
  anchor: DOMRect;  // bounding rect of the trigger
  onClose: () => void;
}

interface CardPayload {
  title: string;
  subtitle?: string;
  statusVariant: 'success' | 'warning' | 'danger' | 'muted';
  statusLabel: string;
  meta: { label: string; value: string }[];
  sparkline?: number[];
}

/**
 * 300×~140px popover anchored to an entity link. Loads payload lazily
 * the first time it opens for a given (kind, id). Position is computed
 * to stay on-screen — flips below the anchor if the top would go above
 * viewport, shifts left if it would exceed the right edge.
 */
export const EntityHoverCard: React.FC<EntityHoverCardProps> = ({
  open, kind, id, anchor, onClose,
}) => {
  const payload = useEntityPayload(open ? kind : null, open ? id : null);

  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) { setPos(null); return; }
    const W = 300;
    const H = 150;
    let top  = anchor.bottom + 6;
    let left = anchor.left;
    if (top + H > window.innerHeight - 8) top  = anchor.top - H - 6;
    if (left + W > window.innerWidth - 8) left = window.innerWidth - W - 8;
    if (left < 8) left = 8;
    setPos({ top, left });
  }, [open, anchor]);

  if (!open || !pos) return null;

  return (
    <div
      role="tooltip"
      onMouseEnter={() => { /* keep open */ }}
      onMouseLeave={onClose}
      className={cn(
        'fixed z-50 w-[300px] rounded-[10px] border border-ois-border bg-white p-3',
        'shadow-[0_12px_32px_rgba(16,24,40,0.12)] text-[12px]',
      )}
      style={{ left: pos.left, top: pos.top }}
    >
      {!payload && <div className="text-ois-text-subtle">Loading…</div>}
      {payload && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <IDCell value={id} className="font-semibold text-ois-text text-[12px]" />
            <Dot variant={payload.statusVariant} size="sm" />
            <span className={cn('text-[10px] font-semibold uppercase tracking-[0.06em]',
              payload.statusVariant === 'danger'  && 'text-ois-danger',
              payload.statusVariant === 'warning' && 'text-ois-warning',
              payload.statusVariant === 'success' && 'text-ois-success',
              payload.statusVariant === 'muted'   && 'text-ois-text-subtle',
            )}>
              {payload.statusLabel}
            </span>
            {payload.subtitle && (
              <span className="ml-auto text-[10px] text-ois-text-subtle">{payload.subtitle}</span>
            )}
          </div>
          <div className="text-ois-text mb-2 line-clamp-2">{payload.title}</div>
          <div className="grid grid-cols-2 gap-y-1 text-[11px] mb-2">
            {payload.meta.map((m, i) => (
              <React.Fragment key={i}>
                <div className="text-ois-text-subtle">{m.label}</div>
                <div className="text-ois-text">{m.value}</div>
              </React.Fragment>
            ))}
          </div>
          {payload.sparkline && payload.sparkline.length > 0 && (
            <SparkLine data={payload.sparkline} width={276} height={24} color="#F04438" />
          )}
        </>
      )}
    </div>
  );
};

function useEntityPayload(kind: HoverEntityKind | null, id: string | null): CardPayload | null {
  switch (kind) {
    case 'ci':       return useCiPayload(id);
    case 'incident': return useIncidentPayload(id);
    default:         return null;
  }
}

function useCiPayload(id: string | null): CardPayload | null {
  const { data } = useResource(
    () => (id ? cisService.get(id) : Promise.resolve(null)),
    [id],
  );
  if (!data) return null;
  return {
    title: data.name,
    subtitle: data.type,
    statusVariant: ciHealthToVariant(data.health),
    statusLabel: data.health.toUpperCase().replace(/_/g, ' '),
    meta: [
      { label: 'Owner',    value: data.ownerId ?? '—' },
      { label: 'Updated',  value: new Date(data.updatedAt).toLocaleString() },
    ],
  };
}

function useIncidentPayload(id: string | null): CardPayload | null {
  const { data } = useResource(
    () => (id ? incidentsService.get(id) : Promise.resolve(null)),
    [id],
  );
  if (!data) return null;
  return {
    title: data.title,
    subtitle: data.severity,
    statusVariant: incidentStatusToVariant(data.status),
    statusLabel: data.status.toUpperCase().replace(/_/g, ' '),
    meta: [
      { label: 'Opened', value: new Date(data.createdAt).toLocaleString() },
      { label: 'Lead',   value: data.assigneeName ?? data.assigneeId ?? '—' },
    ],
  };
}

function ciHealthToVariant(s: string | null | undefined): CardPayload['statusVariant'] {
  switch (s) {
    case 'operational': return 'success';
    case 'degraded':
    case 'maintenance': return 'warning';
    case 'partial_outage':
    case 'major_outage': return 'danger';
    default:             return 'muted';
  }
}

function incidentStatusToVariant(s: string): CardPayload['statusVariant'] {
  if (s === 'resolved' || s === 'closed')                                    return 'success';
  if (s === 'investigating' || s === 'in_progress' || s === 'acknowledged')  return 'warning';
  return 'danger';
}
