import React, { useEffect, useState } from 'react';
import { cn } from '@/src/lib/utils';

interface IncidentClockProps {
  startedAt: string;          // ISO timestamp of incident open
  resolvedAt?: string | null; // when set, clock freezes
  slaDeadline?: string | null;// ISO; if present, render countdown below
  className?: string;
}

/**
 * Top-right header element on the incident detail page.
 * - Elapsed time renders as `+MM:SS` (under 1h) or `+HH:MM:SS` (over 1h),
 *   in Geist Mono 28px 700.
 * - Color drifts blue (0–10m) → orange (10–30m) → red (30m+) via two
 *   `background-clip: text` gradients, swapping at 10m and 30m boundaries.
 * - SLA countdown appears below in 10px, red when within 5 minutes of
 *   breach, otherwise muted.
 */
export const IncidentClock: React.FC<IncidentClockProps> = ({
  startedAt,
  resolvedAt,
  slaDeadline,
  className,
}) => {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (resolvedAt) return; // frozen
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [resolvedAt]);

  const startMs = new Date(startedAt).getTime();
  const endMs   = resolvedAt ? new Date(resolvedAt).getTime() : now;
  const elapsedMs = Math.max(0, endMs - startMs);
  const elapsedSec = Math.floor(elapsedMs / 1000);

  // pick gradient based on elapsed minutes
  const mins = elapsedSec / 60;
  const gradient =
    mins < 10  ? 'linear-gradient(90deg, #1F4FD4 0%, #1F4FD4 100%)' :
    mins < 30  ? 'linear-gradient(90deg, #1F4FD4 0%, #F79009 100%)' :
                 'linear-gradient(90deg, #F79009 0%, #F04438 100%)';

  const slaMs = slaDeadline ? new Date(slaDeadline).getTime() : null;
  const slaRemaining = slaMs ? slaMs - now : null;
  const slaInsideBreach = slaRemaining !== null && slaRemaining < 5 * 60 * 1000;

  return (
    <div className={cn('text-right font-mono leading-none', className)} aria-live="polite">
      <div className="text-[10px] tracking-[0.12em] text-ois-text-subtle mb-1 uppercase">Elapsed</div>
      <div
        className="text-[28px] font-bold"
        style={{
          background: gradient,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {formatElapsed(elapsedSec)}
      </div>
      {slaRemaining !== null && slaRemaining > 0 && (
        <div className={cn('text-[10px] mt-1', slaInsideBreach ? 'text-ois-danger' : 'text-ois-text-subtle')}>
          SLA in {formatElapsed(Math.floor(slaRemaining / 1000))}
        </div>
      )}
      {slaRemaining !== null && slaRemaining <= 0 && (
        <div className="text-[10px] mt-1 text-ois-danger font-semibold">SLA BREACHED</div>
      )}
    </div>
  );
};

function formatElapsed(totalSec: number): string {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) return `+${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `+${pad(minutes)}:${pad(seconds)}`;
}
