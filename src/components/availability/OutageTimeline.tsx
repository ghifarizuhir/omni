import { cn } from '../../lib/utils';
import { outageTypeMeta } from '../../lib/constants';
import { Outage } from '../../types';

interface OutageTimelineProps {
  outages: Outage[];
  maxDays?: number;
  onOutageClick?: (id: string) => void;
}

function formatRelativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks}w ago`;
}

function formatDuration(minutes?: number): string {
  if (!minutes) return 'Ongoing';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function OutageTimeline({ outages, maxDays = 30, onOutageClick }: OutageTimelineProps) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);

  const filtered = outages
    .filter((o) => new Date(o.startedAt) >= cutoff)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-400">
        No outages in the last {maxDays} days
      </div>
    );
  }

  const maxDuration = Math.max(...filtered.map((o) => o.durationMinutes ?? 60), 1);

  return (
    <div className="space-y-2">
      {filtered.map((outage) => {
        const meta = outageTypeMeta[outage.type];
        const isOngoing = !outage.endedAt;
        const barWidthPct = Math.max(
          ((outage.durationMinutes ?? 60) / maxDuration) * 100,
          2,
        );

        return (
          <div
            key={outage.id}
            className={cn(
              'flex items-center gap-3 rounded-md p-2',
              onOutageClick && 'cursor-pointer hover:bg-gray-50',
            )}
            onClick={() => onOutageClick?.(outage.id)}
          >
            {/* Relative time */}
            <span className="w-16 shrink-0 text-right text-xs text-gray-400">
              {formatRelativeDate(outage.startedAt)}
            </span>

            {/* Bar */}
            <div className="flex-1 h-4 relative rounded overflow-hidden bg-gray-100">
              <div
                className={cn('h-full rounded', isOngoing && 'animate-pulse')}
                style={{
                  width: `max(4px, ${barWidthPct}%)`,
                  backgroundColor: meta.color,
                }}
              />
            </div>

            {/* Right: service + duration */}
            <div className="flex w-44 shrink-0 flex-col items-end">
              <span className="text-xs font-medium text-gray-700 truncate max-w-full">
                {outage.serviceName}
              </span>
              <span className="text-xs text-gray-400">
                {formatDuration(outage.durationMinutes)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
