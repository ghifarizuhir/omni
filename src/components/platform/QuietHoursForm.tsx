import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/Button';
import { QuietHoursConfig } from '@/src/types/platform';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuietHoursFormProps {
  initial: QuietHoursConfig;
  onSave: (config: QuietHoursConfig) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'UTC',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Hardcoded: Saturday May 10, 2026 is day 6 (Saturday)
const CURRENT_DAY_OF_WEEK = 6; // Saturday
const CURRENT_HOUR = 14; // 2 PM for demonstration

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

function isCurrentlyInQuietHours(config: QuietHoursConfig): boolean {
  if (!config.enabled) return false;
  if (!config.daysOfWeek.includes(CURRENT_DAY_OF_WEEK)) return false;
  const { fromHour, toHour } = config;
  if (fromHour < toHour) {
    // e.g. 09:00–17:00
    return CURRENT_HOUR >= fromHour && CURRENT_HOUR < toHour;
  } else {
    // overnight e.g. 22:00–07:00
    return CURRENT_HOUR >= fromHour || CURRENT_HOUR < toHour;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function QuietHoursForm({ initial, onSave }: QuietHoursFormProps) {
  const [config, setConfig] = useState<QuietHoursConfig>(initial);

  const inQuietHours = isCurrentlyInQuietHours(config);

  function toggle(field: keyof Pick<QuietHoursConfig, 'enabled'>) {
    setConfig(prev => ({ ...prev, [field]: !prev[field] }));
  }

  function setNumber(field: keyof Pick<QuietHoursConfig, 'fromHour' | 'toHour'>, value: number) {
    setConfig(prev => ({ ...prev, [field]: value }));
  }

  function toggleDay(day: number) {
    setConfig(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day].sort(),
    }));
  }

  return (
    <div className="space-y-5">
      {/* Enable toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={() => toggle('enabled')}
          className="h-4 w-4 rounded border-ois-border text-ois-primary accent-[var(--color-primary)]"
        />
        <span className="text-sm font-medium text-ois-text">Enable quiet hours</span>
      </label>

      <div className={cn('space-y-5', !config.enabled && 'opacity-40 pointer-events-none')}>
        {/* Timezone */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-ois-text-muted uppercase tracking-wide">
            Timezone
          </label>
          <select
            value={config.timezone}
            onChange={e => setConfig(prev => ({ ...prev, timezone: e.target.value }))}
            className="block w-full max-w-xs rounded-lg border border-ois-border bg-ois-surface px-3 py-2 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/40"
          >
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        {/* From / To hours */}
        <div className="flex items-center gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ois-text-muted uppercase tracking-wide">
              From
            </label>
            <select
              value={config.fromHour}
              onChange={e => setNumber('fromHour', Number(e.target.value))}
              className="block rounded-lg border border-ois-border bg-ois-surface px-3 py-2 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/40"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{formatHour(i)}</option>
              ))}
            </select>
          </div>
          <span className="mt-5 text-ois-text-muted text-sm">to</span>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-ois-text-muted uppercase tracking-wide">
              To
            </label>
            <select
              value={config.toHour}
              onChange={e => setNumber('toHour', Number(e.target.value))}
              className="block rounded-lg border border-ois-border bg-ois-surface px-3 py-2 text-sm text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/40"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{formatHour(i)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Days of week */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-ois-text-muted uppercase tracking-wide">
            Days
          </label>
          <div className="flex gap-2 flex-wrap">
            {DAY_LABELS.map((label, idx) => {
              const active = config.daysOfWeek.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => toggleDay(idx)}
                  className={cn(
                    'h-9 w-11 rounded-lg text-xs font-semibold border transition-colors',
                    active
                      ? 'bg-ois-primary text-white border-ois-primary'
                      : 'bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary/50',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status indicator */}
        {config.enabled && (
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
              inQuietHours
                ? 'bg-[#FFFAEB] text-[#DC6803]'
                : 'bg-[#F1F3F7] text-[#475467]',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                inQuietHours ? 'bg-[#F79009]' : 'bg-[#98A2B3]',
              )}
            />
            {inQuietHours ? 'Currently in quiet hours' : 'Not in quiet hours'}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="pt-1">
        <Button size="sm" onClick={() => onSave(config)}>
          Save quiet hours
        </Button>
      </div>
    </div>
  );
}
