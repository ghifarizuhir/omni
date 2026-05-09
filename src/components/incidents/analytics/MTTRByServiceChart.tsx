import React from 'react';
import { Incident } from '@/src/types/incident';

interface MTTRByServiceChartProps {
  incidents: Incident[];
  serviceMap: Record<string, string>; // svcId → name
}

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const MTTRByServiceChart: React.FC<MTTRByServiceChartProps> = ({ incidents, serviceMap }) => {
  // Compute MTTR per service
  const serviceData: Record<string, { total: number; count: number }> = {};

  for (const inc of incidents) {
    if (!inc.resolution?.resolvedAt) continue;
    const elapsed =
      (new Date(inc.resolution.resolvedAt).getTime() - new Date(inc.createdAt).getTime()) / 60_000;
    for (const svcId of inc.affectedServiceIds) {
      if (!serviceData[svcId]) serviceData[svcId] = { total: 0, count: 0 };
      serviceData[svcId].total += elapsed;
      serviceData[svcId].count += 1;
    }
  }

  const rows = Object.entries(serviceData)
    .map(([id, { total, count }]) => ({
      id,
      name: serviceMap[id] ?? id,
      mttr: total / count,
      count,
    }))
    .sort((a, b) => b.mttr - a.mttr);

  if (rows.length === 0) {
    return <p className="text-xs text-ois-text-subtle py-4 text-center">No resolved incidents in period.</p>;
  }

  const maxMttr = rows[0].mttr;

  return (
    <div className="space-y-3.5">
      {rows.map(row => {
        const pct = (row.mttr / maxMttr) * 100;
        const color = row.mttr > 180 ? '#B42318' : row.mttr > 90 ? '#DC6803' : '#1F4FD4';
        const bgColor = row.mttr > 180 ? '#FEE2E2' : row.mttr > 90 ? '#FEF3C7' : '#EFF4FF';
        return (
          <div key={row.id} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-ois-text font-medium truncate max-w-[55%]">{row.name}</span>
              <span
                className="font-mono font-bold shrink-0 ml-2 text-[11px] px-1.5 py-0.5 rounded"
                style={{ color, backgroundColor: bgColor }}
              >
                {formatMinutes(row.mttr)}
              </span>
            </div>
            <div className="h-2 bg-ois-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <p className="text-[10px] text-ois-text-subtle">{row.count} incident{row.count > 1 ? 's' : ''} resolved</p>
          </div>
        );
      })}
    </div>
  );
};
