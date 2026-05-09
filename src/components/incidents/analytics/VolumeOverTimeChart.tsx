import React, { useRef, useState, useEffect } from 'react';
import { Incident, IncidentPriority } from '@/src/types/incident';
import { eachDayOfInterval, format, parseISO, subDays } from 'date-fns';

interface VolumeOverTimeChartProps {
  incidents: Incident[];
  rangeDays: number;
  referenceDate?: Date;
}

const PRIORITY_META: Record<IncidentPriority, { color: string; label: string; lighter: string }> = {
  P1: { color: '#B42318', label: 'P1 Critical',  lighter: '#FEE2E2' },
  P2: { color: '#DC6803', label: 'P2 High',       lighter: '#FEF3C7' },
  P3: { color: '#F79009', label: 'P3 Medium',     lighter: '#FFF7ED' },
  P4: { color: '#12B76A', label: 'P4 Low',        lighter: '#DCFCE7' },
};

const PRIORITIES: IncidentPriority[] = ['P1', 'P2', 'P3', 'P4'];

// SVG path for a rect with only top corners rounded
function roundedTopRect(x: number, y: number, w: number, h: number, r: number): string {
  const safeR = Math.min(r, w / 2, h);
  return [
    `M ${x + safeR} ${y}`,
    `H ${x + w - safeR}`,
    `Q ${x + w} ${y} ${x + w} ${y + safeR}`,
    `V ${y + h}`,
    `H ${x}`,
    `V ${y + safeR}`,
    `Q ${x} ${y} ${x + safeR} ${y}`,
    'Z',
  ].join(' ');
}

interface TooltipState {
  svgX: number;  // bar center x in SVG coordinates
  day: string;
  counts: Record<IncidentPriority, number>;
  total: number;
  barTop: number; // y top of bar in SVG coordinates
}

export const VolumeOverTimeChart: React.FC<VolumeOverTimeChartProps> = ({
  incidents,
  rangeDays,
  referenceDate = new Date('2026-05-08'),
}) => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const days = eachDayOfInterval({
    start: subDays(referenceDate, rangeDays - 1),
    end: referenceDate,
  });

  // dayMap: yyyy-MM-dd → priority counts
  const dayMap: Record<string, Record<IncidentPriority, number>> = {};
  for (const d of days) {
    dayMap[format(d, 'yyyy-MM-dd')] = { P1: 0, P2: 0, P3: 0, P4: 0 };
  }
  for (const inc of incidents) {
    const key = format(parseISO(inc.createdAt), 'yyyy-MM-dd');
    if (dayMap[key]) dayMap[key][inc.priority]++;
  }

  const dayEntries = days.map(d => ({
    key: format(d, 'yyyy-MM-dd'),
    label: format(d, rangeDays <= 7 ? 'EEE d' : 'MMM d'),
    counts: dayMap[format(d, 'yyyy-MM-dd')],
    total: Object.values(dayMap[format(d, 'yyyy-MM-dd')]).reduce((s, v) => s + v, 0),
  }));

  const maxTotal = Math.max(...dayEntries.map(d => d.total), 1);

  // Layout constants (in SVG user units — viewBox maps these to actual pixels)
  const VB_W = 900;
  const VB_H = 180;
  const Y_AXIS_W = 28;   // width reserved for y-axis labels
  const X_AXIS_H = 20;   // height reserved for x-axis labels
  const CHART_W = VB_W - Y_AXIS_W;
  const CHART_H = VB_H - X_AXIS_H;

  const GAP = rangeDays >= 60 ? 2 : rangeDays >= 30 ? 4 : 8;
  const BAR_W = Math.max(4, (CHART_W - (days.length - 1) * GAP) / days.length);

  // Y-axis: nice round ticks
  const yTickCount = 4;
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
    const val = Math.round((maxTotal / yTickCount) * i);
    return { val, y: CHART_H - (val / maxTotal) * CHART_H };
  });

  // Which x-axis labels to show (5 max)
  const labelStep = Math.max(1, Math.floor(days.length / 5));
  const showLabelAt = new Set(
    days.map((_, i) => i).filter(i => i % labelStep === 0 || i === days.length - 1)
  );

  const handleBarHover = (idx: number, day: typeof dayEntries[0]) => {
    setHoveredIdx(idx);
    const x = Y_AXIS_W + idx * (BAR_W + GAP) + BAR_W / 2;
    const barTop = day.total > 0 ? CHART_H - (day.total / maxTotal) * CHART_H : CHART_H;
    setTooltip({ svgX: x, day: day.label, counts: day.counts, total: day.total, barTop });
  };

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex items-center gap-5 flex-wrap">
        {PRIORITIES.map(p => (
          <div key={p} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm shadow-sm"
              style={{ backgroundColor: PRIORITY_META[p].color }}
            />
            <span className="text-xs text-ois-text-muted font-medium">{PRIORITY_META[p].label}</span>
          </div>
        ))}
        <div className="ml-auto text-xs text-ois-text-subtle">
          {dayEntries.filter(d => d.total > 0).length} of {days.length} days with incidents
        </div>
      </div>

      {/* Chart */}
      <div className="relative w-full" onMouseLeave={() => { setTooltip(null); setHoveredIdx(null); }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          width="100%"
          preserveAspectRatio="none"
          className="overflow-visible"
          style={{ height: 160 }}
        >
          {/* Y-axis guide lines + labels */}
          {yTicks.map(tick => tick.val > 0 && (
            <g key={tick.val}>
              <line
                x1={Y_AXIS_W}
                y1={tick.y}
                x2={VB_W}
                y2={tick.y}
                stroke="#E4E7EC"
                strokeWidth={0.8}
                strokeDasharray="4,4"
              />
              <text
                x={Y_AXIS_W - 4}
                y={tick.y + 3.5}
                textAnchor="end"
                fontSize={9}
                fill="#98A2B3"
                fontFamily="monospace"
              >
                {tick.val}
              </text>
            </g>
          ))}

          {/* Base line */}
          <line
            x1={Y_AXIS_W}
            y1={CHART_H}
            x2={VB_W}
            y2={CHART_H}
            stroke="#D0D5DD"
            strokeWidth={1}
          />

          {/* Bars */}
          {dayEntries.map((day, idx) => {
            const x = Y_AXIS_W + idx * (BAR_W + GAP);
            const isHovered = hoveredIdx === idx;
            let yOffset = CHART_H;

            // Find the topmost priority for this day (first non-zero in P1→P4 order)
            const topPriority = PRIORITIES.find(p => day.counts[p] > 0) ?? null;

            return (
              <g key={day.key}>
                {/* Hover hit zone + highlight background */}
                {isHovered && day.total > 0 && (
                  <rect
                    x={x - GAP / 2}
                    y={0}
                    width={BAR_W + GAP}
                    height={CHART_H}
                    fill="#F2F4F7"
                    rx={2}
                  />
                )}
                <rect
                  x={x - GAP / 2}
                  y={0}
                  width={BAR_W + GAP}
                  height={CHART_H}
                  fill="transparent"
                  onMouseEnter={() => handleBarHover(idx, day)}
                />

                {/* Stacked segments — draw from bottom (P4) to top (P1) */}
                {PRIORITIES.slice().reverse().map(p => {
                  const count = day.counts[p];
                  if (count === 0) return null;
                  const barH = Math.max((count / maxTotal) * CHART_H, 2);
                  yOffset -= barH;

                  const isTop = p === topPriority;
                  const fillColor = isHovered ? PRIORITY_META[p].color : PRIORITY_META[p].color;

                  return isTop ? (
                    <path
                      key={p}
                      d={roundedTopRect(x, yOffset, BAR_W, barH, 3)}
                      fill={fillColor}
                      opacity={isHovered ? 1 : 0.88}
                    />
                  ) : (
                    <rect
                      key={p}
                      x={x}
                      y={yOffset}
                      width={BAR_W}
                      height={barH}
                      fill={fillColor}
                      opacity={isHovered ? 1 : 0.88}
                    />
                  );
                })}

                {/* X-axis label */}
                {showLabelAt.has(idx) && (
                  <text
                    x={x + BAR_W / 2}
                    y={CHART_H + 14}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#98A2B3"
                  >
                    {day.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Tooltip — positioned relative to the SVG container */}
        {tooltip && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              // svgX is in viewBox units (0-900). Convert to % of container.
              left: `${(tooltip.svgX / VB_W) * 100}%`,
              // barTop is in viewBox units (0-160). The SVG height is 160px.
              top: `${(tooltip.barTop / VB_H) * 160}px`,
              transform: 'translate(-50%, -100%) translateY(-6px)',
            }}
          >
            <div className="bg-ois-text text-white text-xs rounded-xl px-3.5 py-2.5 shadow-2xl whitespace-nowrap">
              <p className="font-bold mb-1.5 text-white/90">{tooltip.day}</p>
              <div className="space-y-1">
                {PRIORITIES.map(p => tooltip.counts[p] > 0 && (
                  <div key={p} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: PRIORITY_META[p].color }}
                      />
                      <span className="text-white/70">{p}</span>
                    </div>
                    <span className="font-mono font-semibold">{tooltip.counts[p]}</span>
                  </div>
                ))}
              </div>
              {tooltip.total > 0 && (
                <div className="border-t border-white/20 mt-2 pt-1.5 flex justify-between">
                  <span className="text-white/60">Total</span>
                  <span className="font-bold">{tooltip.total}</span>
                </div>
              )}
              {tooltip.total === 0 && (
                <p className="text-white/50 italic">No incidents</p>
              )}
            </div>
            {/* Arrow */}
            <div
              className="w-2.5 h-2.5 bg-ois-text rotate-45 mx-auto -mt-1.5 rounded-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};
