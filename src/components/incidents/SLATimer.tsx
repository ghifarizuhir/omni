import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Pause, Clock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { SLAStatus } from '@/src/types/incident';
import { slaStatusMeta } from '@/src/lib/constants';

interface SLATimerProps {
  label: string;
  status: SLAStatus;
  targetMinutes: number;
  createdAt: string;
  resolvedAt?: string;
  className?: string;
}

function formatMinutes(minutes: number): string {
  const abs = Math.abs(minutes);
  if (abs < 60) return `${Math.round(abs)}m`;
  const h = Math.floor(abs / 60);
  const m = Math.round(abs % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export const SLATimer: React.FC<SLATimerProps> = ({
  label, status, targetMinutes, createdAt, resolvedAt, className,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status === 'met' || status === 'breached' || status === 'paused') return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [status]);

  const meta = slaStatusMeta[status];
  const startMs = new Date(createdAt).getTime();
  const targetMs = targetMinutes * 60_000;

  if (resolvedAt) {
    const elapsedMin = (new Date(resolvedAt).getTime() - startMs) / 60_000;
    return (
      <div className={cn('space-y-1', className)}>
        <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-1.5 text-sm text-ois-success">
          <CheckCircle2 size={13} />
          <span>Met in {formatMinutes(elapsedMin)} <span className="text-ois-text-subtle">(target {formatMinutes(targetMinutes)})</span></span>
        </div>
      </div>
    );
  }

  if (status === 'met') {
    return (
      <div className={cn('space-y-1', className)}>
        <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-1.5 text-sm text-ois-success">
          <CheckCircle2 size={13} />
          <span>Met <span className="text-ois-text-subtle">(target {formatMinutes(targetMinutes)})</span></span>
        </div>
      </div>
    );
  }

  if (status === 'paused') {
    return (
      <div className={cn('space-y-1', className)}>
        <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-1.5 text-sm text-ois-text-subtle">
          <Pause size={13} />
          <span>Paused <span className="opacity-70">(target {formatMinutes(targetMinutes)})</span></span>
        </div>
      </div>
    );
  }

  if (status === 'breached') {
    const overByMin = (now - (startMs + targetMs)) / 60_000;
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-1.5 text-sm text-ois-danger">
          <XCircle size={13} />
          <span>Breached by {formatMinutes(overByMin)}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-ois-border overflow-hidden">
          <div className="h-full w-full rounded-full bg-ois-danger" />
        </div>
      </div>
    );
  }

  // Active: healthy or warning
  const elapsedMin = (now - startMs) / 60_000;
  const remainingMin = Math.max(0, targetMinutes - elapsedMin);
  const pct = Math.min(elapsedMin / targetMinutes, 1) * 100;
  const barColor = status === 'warning' ? '#F79009' : '#12B76A';

  return (
    <div className={cn('space-y-1.5', className)}>
      <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</p>
      <div className="flex items-center gap-1.5 text-sm" style={{ color: meta.color }}>
        <Clock size={13} />
        <span>{formatMinutes(remainingMin)} remaining</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-ois-border overflow-hidden">
        <div
          className="h-full rounded-full transition-[width]"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="text-[11px] text-ois-text-subtle">Target: {formatMinutes(targetMinutes)}</p>
    </div>
  );
};
