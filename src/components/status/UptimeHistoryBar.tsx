import { useState } from 'react';

interface UptimeHistoryBarProps {
  uptime90d: number;
  serviceId: string;
}

// Deterministic pseudo-random based on serviceId + day index
function seededColor(serviceId: string, dayIndex: number, uptime: number): string {
  const seed = serviceId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const val = (seed * 31 + dayIndex * 17) % 100;

  // For very high uptime (>99.9%), only a couple of amber days
  if (uptime > 99.9) {
    if (val < 2) return '#F79009'; // amber ~2%
    return '#12B76A'; // green
  }

  // For high uptime (99.5–99.9%)
  if (uptime > 99.5) {
    if (val < 4) return '#F79009';
    return '#12B76A';
  }

  // For moderate uptime (99–99.5%)
  if (uptime > 99.0) {
    if (val < 8) return '#F79009';
    if (val < 10) return '#F04438';
    return '#12B76A';
  }

  // For degraded uptime (<99%)
  if (val < 15) return '#F79009';
  if (val < 20) return '#F04438';
  return '#12B76A';
}

export function UptimeHistoryBar({ uptime90d, serviceId }: UptimeHistoryBarProps) {
  const [tooltip, setTooltip] = useState<number | null>(null);

  const days = Array.from({ length: 90 }, (_, i) => i);

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex flex-1 gap-px">
        {days.map(i => {
          const color = seededColor(serviceId, i, uptime90d);
          return (
            <div
              key={i}
              className="relative h-6 flex-1 cursor-default rounded-sm transition-opacity hover:opacity-80"
              style={{ backgroundColor: color, minWidth: 2 }}
              onMouseEnter={() => setTooltip(i)}
              onMouseLeave={() => setTooltip(null)}
            >
              {tooltip === i && (
                <div className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-ois-text px-2 py-1 text-xs text-white shadow-md pointer-events-none">
                  Day {90 - i}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <span className="w-14 shrink-0 text-right text-xs font-medium text-ois-text-muted tabular-nums">
        {uptime90d.toFixed(2)}%
      </span>
    </div>
  );
}
