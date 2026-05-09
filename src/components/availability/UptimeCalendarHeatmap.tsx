import React, { useState, useRef } from 'react';
import { dailyHealthColors } from '../../lib/constants';
import { DailyServiceHealth } from '../../types';
import { UptimeCalendarCell } from './UptimeCalendarCell';

interface UptimeCalendarHeatmapProps {
  data: DailyServiceHealth[];
  services: Array<{ id: string; name: string }>;
  compact?: boolean;
  onCellClick?: (serviceId: string, date: string) => void;
}

const LEGEND_ITEMS: Array<{ status: string; label: string }> = [
  { status: 'operational',    label: 'Operational' },
  { status: 'degraded',       label: 'Degraded' },
  { status: 'partial_outage', label: 'Partial' },
  { status: 'major_outage',   label: 'Major' },
  { status: 'maintenance',    label: 'Maintenance' },
];

function getDates(count = 90): string[] {
  const dates: string[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function getMonthLabels(dates: string[]): Array<{ label: string; index: number }> {
  const seen = new Set<string>();
  const labels: Array<{ label: string; index: number }> = [];
  dates.forEach((d, i) => {
    const month = d.slice(0, 7);
    if (!seen.has(month)) {
      seen.add(month);
      const date = new Date(d + 'T00:00:00Z');
      labels.push({
        label: date.toLocaleString('default', { month: 'short', timeZone: 'UTC' }),
        index: i,
      });
    }
  });
  return labels;
}

interface TooltipData {
  health: DailyServiceHealth;
  serviceName: string;
  x: number;
  y: number;
}

export function UptimeCalendarHeatmap({
  data,
  services,
  compact = false,
  onCellClick,
}: UptimeCalendarHeatmapProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const dates = getDates(90);
  const todayStr = new Date().toISOString().slice(0, 10);
  const monthLabels = getMonthLabels(dates);

  // Index data by serviceId → date
  const indexed: Record<string, Record<string, DailyServiceHealth>> = {};
  for (const row of data) {
    if (!indexed[row.serviceId]) indexed[row.serviceId] = {};
    indexed[row.serviceId][row.date] = row;
  }

  const cellSize = compact ? 'compact' : 'default';
  const cellW = compact ? 8 : 12;
  const cellGap = 2;

  function handleHover(health: DailyServiceHealth | null, serviceName: string, _e: React.MouseEvent<HTMLElement>) {
    if (!health) {
      setTooltip(null);
      return;
    }
    const rect = containerRef.current?.getBoundingClientRect();
    const eRect = (_e.target as HTMLElement).getBoundingClientRect();
    setTooltip({
      health,
      serviceName,
      x: eRect.left - (rect?.left ?? 0) + cellW / 2,
      y: eRect.top - (rect?.top ?? 0),
    });
  }

  return (
    <div ref={containerRef} className="relative w-full overflow-x-auto">
      {/* Month labels row */}
      <div className="flex pl-36 mb-1">
        {monthLabels.map((ml) => (
          <div
            key={ml.label + ml.index}
            className="text-xs text-gray-400 shrink-0"
            style={{ marginLeft: ml.index === 0 ? 0 : ml.index * (cellW + cellGap) - (monthLabels[monthLabels.indexOf(ml) - 1]?.index ?? 0) * (cellW + cellGap) }}
          >
            {ml.label}
          </div>
        ))}
      </div>

      {/* Service rows */}
      <div className="space-y-1">
        {services.map((svc) => (
          <div key={svc.id} className="flex items-center gap-2">
            <span className="w-32 shrink-0 text-right text-xs text-gray-600 truncate pr-2">
              {svc.name}
            </span>
            <div className="flex gap-0.5">
              {dates.map((date) => {
                const health = indexed[svc.id]?.[date];
                if (!health) {
                  return (
                    <div
                      key={date}
                      className="rounded-sm bg-gray-100"
                      style={{ width: cellW, height: compact ? 10 : 16, flexShrink: 0 }}
                    />
                  );
                }
                return (
                  <React.Fragment key={date}>
                    <UptimeCalendarCell
                      health={health}
                      isToday={date === todayStr}
                      size={cellSize}
                      onHover={(h) => { if (!h) setTooltip(null); }}
                      onClick={() => onCellClick?.(svc.id, date)}
                    />
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-50 rounded-md border border-gray-200 bg-white p-2 shadow-lg text-xs space-y-0.5"
          style={{ left: tooltip.x + 8, top: tooltip.y - 8 }}
        >
          <p className="font-semibold text-gray-900">{tooltip.serviceName}</p>
          <p className="text-gray-500">{tooltip.health.date}</p>
          <p className="text-gray-700">Uptime: {tooltip.health.uptimePercent.toFixed(3)}%</p>
          <p className="text-gray-700">Incidents: {tooltip.health.incidentCount}</p>
          <p className="text-gray-700">Outage: {tooltip.health.outageMinutes} min</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 pl-36">
        {LEGEND_ITEMS.map((item) => (
          <span key={item.status} className="flex items-center gap-1 text-xs text-gray-500">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: dailyHealthColors[item.status] ?? '#E5E7EB' }}
            />
            {item.label}
          </span>
        ))}
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="inline-block h-2.5 w-2.5 rounded-sm border border-gray-200 bg-gray-100" />
          No data
        </span>
      </div>
    </div>
  );
}
