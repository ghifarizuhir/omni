import React from 'react';
import { Incident, IncidentPriority } from '@/src/types/incident';
import { Link } from 'react-router-dom';

interface SLAPerformancePanelProps {
  incidents: Incident[];
}

const PRIORITIES: IncidentPriority[] = ['P1', 'P2', 'P3', 'P4'];

const PRIORITY_COLORS: Record<IncidentPriority, string> = {
  P1: '#B42318',
  P2: '#DC6803',
  P3: '#F79009',
  P4: '#12B76A',
};

export const SLAPerformancePanel: React.FC<SLAPerformancePanelProps> = ({ incidents }) => {
  const stats: Record<IncidentPriority, { total: number; met: number; breachedIds: string[] }> = {
    P1: { total: 0, met: 0, breachedIds: [] },
    P2: { total: 0, met: 0, breachedIds: [] },
    P3: { total: 0, met: 0, breachedIds: [] },
    P4: { total: 0, met: 0, breachedIds: [] },
  };

  for (const inc of incidents) {
    const row = stats[inc.priority];
    row.total++;
    const compliant = inc.slaResolveStatus === 'met' || inc.slaResolveStatus === 'healthy';
    if (compliant) {
      row.met++;
    } else if (inc.slaResolveStatus === 'breached') {
      row.breachedIds.push(inc.publicId);
    }
  }

  return (
    <div className="space-y-3">
      {PRIORITIES.map(p => {
        const { total, met, breachedIds } = stats[p];
        if (total === 0) return null;
        const pct = Math.round((met / total) * 100);
        const color = PRIORITY_COLORS[p];

        return (
          <div key={p} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="font-mono font-bold px-1.5 py-0.5 rounded text-white text-[10px]"
                  style={{ backgroundColor: color }}
                >
                  {p}
                </span>
                <span className="text-ois-text-muted">
                  {met}/{total} met
                  {breachedIds.length > 0 && (
                    <span className="ml-1 text-ois-danger">
                      · {breachedIds.length} breach
                      {breachedIds.length > 1 ? 'es' : ''}
                      {breachedIds.slice(0, 1).map(id => (
                        <Link
                          key={id}
                          to={`/incidents/${id}`}
                          className="ml-1 font-mono hover:underline"
                        >
                          ({id})
                        </Link>
                      ))}
                    </span>
                  )}
                </span>
              </div>
              <span className="font-bold tabular-nums" style={{ color: pct >= 95 ? '#067647' : pct >= 80 ? '#DC6803' : '#B42318' }}>
                {pct}%
              </span>
            </div>
            <div className="h-2 bg-ois-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: pct >= 95 ? '#12B76A' : pct >= 80 ? '#F79009' : '#F04438',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
