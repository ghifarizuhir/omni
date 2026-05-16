import React, { useMemo } from 'react';
import { cisService, useResource } from '@/src/services';
import { cn } from '@/src/lib/utils';
import type { CIRelationship } from '@/src/types';

interface BlastRadiusBackdropProps {
  /** publicId or internal id of the primary impacted CI */
  impactedCiId: string;
  className?: string;
}

interface Edge { from: string; to: string }
interface Node { id: string; x: number; y: number; impacted: boolean }

/**
 * Faint CMDB topology rendered behind the incident timeline.
 * Pulls relationships from /api/v1/cmdb/cis/:id/relationships, lays them
 * out radially around the impacted CI, and renders at 10% opacity.
 * Hidden on viewports < 1280px wide.
 *
 * NOTE: cisService.relationships returns CIRelationship[] (flat array).
 * We derive neighbor nodes from fromCiId / toCiId fields.
 */
export const BlastRadiusBackdrop: React.FC<BlastRadiusBackdropProps> = ({
  impactedCiId,
  className,
}) => {
  const { data } = useResource(
    () => cisService.relationships(impactedCiId),
    [impactedCiId],
  );

  const { nodes, edges } = useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { nodes: [] as Node[], edges: [] as Edge[] };
    }

    const rels = data as CIRelationship[];

    // Collect unique neighbor ids (cap at 29 to keep render cheap).
    const neighborSet = new Set<string>();
    for (const rel of rels) {
      if (rel.fromCiId !== impactedCiId) neighborSet.add(rel.fromCiId);
      if (rel.toCiId  !== impactedCiId) neighborSet.add(rel.toCiId);
    }
    const neighbors = [...neighborSet].slice(0, 29);

    // Radial layout: impacted CI at center (300, 200), neighbors on a ring.
    const cx = 300, cy = 200, r = 140;
    const nodes: Node[] = [
      { id: impactedCiId, x: cx, y: cy, impacted: true },
      ...neighbors.map((id, i) => {
        const angle = (i / neighbors.length) * Math.PI * 2;
        return { id, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r, impacted: false };
      }),
    ];

    // Map relationships to simple from/to edges using internal CI ids.
    const ids = new Set(nodes.map(n => n.id));
    const edges: Edge[] = rels
      .filter(rel => ids.has(rel.fromCiId) && ids.has(rel.toCiId))
      .map(rel => ({ from: rel.fromCiId, to: rel.toCiId }));

    return { nodes, edges };
  }, [data, impactedCiId]);

  if (nodes.length === 0) return null;

  const nodeById = new Map<string, Node>(nodes.map(n => [n.id, n]));

  return (
    <svg
      aria-hidden
      viewBox="0 0 600 400"
      preserveAspectRatio="xMidYMid slice"
      className={cn(
        'pointer-events-none absolute inset-0 w-full h-full opacity-[0.10] hidden xl:block',
        className,
      )}
    >
      {edges.map((e, i) => {
        const a = nodeById.get(e.from);
        const b = nodeById.get(e.to);
        if (!a || !b) return null;
        const isImpactEdge = a.impacted || b.impacted;
        return (
          <line
            key={i}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={isImpactEdge ? '#B42318' : '#475467'}
            strokeWidth={isImpactEdge ? 1.5 : 1}
          />
        );
      })}
      {nodes.map(n => (
        <g key={n.id}>
          {n.impacted && (
            <circle cx={n.x} cy={n.y} r={22} fill="#B42318" opacity={0.25}>
              <animate attributeName="opacity" values="0.25;0.45;0.25" dur="1.4s" repeatCount="indefinite" />
            </circle>
          )}
          <circle
            cx={n.x} cy={n.y}
            r={n.impacted ? 12 : 7}
            fill={n.impacted ? '#B42318' : '#98A2B3'}
          />
        </g>
      ))}
    </svg>
  );
};
