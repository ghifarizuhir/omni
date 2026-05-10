import React from 'react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/Button';
import { NotificationPreference, NotificationChannel } from '@/src/types/platform';
import { notificationTopicMeta } from '@/src/lib/constants';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PreferencesTableProps {
  preferences: NotificationPreference[];
  onChange: (updated: NotificationPreference[]) => void;
  onSave: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHANNELS: { id: NotificationChannel; label: string; icon: string }[] = [
  { id: 'in_app', label: 'In-app', icon: '📱' },
  { id: 'email',  label: 'Email',  icon: '✉️' },
  { id: 'sms',    label: 'SMS',    icon: '📱' },
  { id: 'slack',  label: 'Slack',  icon: '💬' },
];

const GROUP_ORDER = ['INCIDENTS', 'SLA', 'APPROVALS', 'OPERATIONS', 'KNOWLEDGE & REPORTING', 'ON-CALL'];

// ── Component ─────────────────────────────────────────────────────────────────

export function PreferencesTable({ preferences, onChange, onSave }: PreferencesTableProps) {
  // Build group → topic list map in declared order
  const grouped: Array<{ group: string; prefs: NotificationPreference[] }> = GROUP_ORDER
    .map(group => ({
      group,
      prefs: preferences.filter(p => notificationTopicMeta[p.topic]?.group === group),
    }))
    .filter(g => g.prefs.length > 0);

  function toggleChannel(pref: NotificationPreference, channel: NotificationChannel) {
    const hasChannel = pref.channels.includes(channel);
    const updated = preferences.map(p => {
      if (p.topic !== pref.topic) return p;
      return {
        ...p,
        channels: hasChannel
          ? p.channels.filter(c => c !== channel)
          : [...p.channels, channel],
      };
    });
    onChange(updated);
  }

  function toggleQuietHours(pref: NotificationPreference) {
    const updated = preferences.map(p => {
      if (p.topic !== pref.topic) return p;
      return { ...p, respectQuietHours: !p.respectQuietHours };
    });
    onChange(updated);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-ois-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ois-border bg-ois-surface-muted">
              <th className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-ois-text-muted uppercase tracking-wide w-56">
                Topic
              </th>
              {CHANNELS.map(ch => (
                <th
                  key={ch.id}
                  className="py-3 px-3 text-center text-xs font-semibold text-ois-text-muted uppercase tracking-wide w-20"
                >
                  <span className="inline-flex flex-col items-center gap-0.5">
                    <span>{ch.icon}</span>
                    <span>{ch.label}</span>
                  </span>
                </th>
              ))}
              <th className="py-3 pl-3 pr-4 text-center text-xs font-semibold text-ois-text-muted uppercase tracking-wide w-28">
                Quiet hours
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ois-border">
            {grouped.map(({ group, prefs }) => (
              <React.Fragment key={group}>
                {/* Group header row */}
                <tr className="bg-ois-surface-muted/50">
                  <td
                    colSpan={6}
                    className="py-2 pl-4 text-[11px] font-bold text-ois-text-muted uppercase tracking-widest"
                  >
                    {group}
                  </td>
                </tr>
                {prefs.map(pref => {
                  const meta = notificationTopicMeta[pref.topic];
                  return (
                    <tr key={pref.topic} className="hover:bg-ois-surface-muted/30 transition-colors">
                      {/* Topic label */}
                      <td className="py-3 pl-4 pr-2">
                        <div>
                          <p className="font-medium text-ois-text">{meta?.label ?? pref.topic}</p>
                          {meta?.description && (
                            <p className="text-[11px] text-ois-text-muted mt-0.5">{meta.description}</p>
                          )}
                        </div>
                      </td>

                      {/* Channel checkboxes */}
                      {CHANNELS.map(ch => (
                        <td key={ch.id} className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={pref.channels.includes(ch.id)}
                            onChange={() => toggleChannel(pref, ch.id)}
                            className="h-4 w-4 rounded border-ois-border accent-[var(--color-primary)] cursor-pointer"
                          />
                        </td>
                      ))}

                      {/* Quiet hours toggle */}
                      <td className="py-3 pl-3 pr-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleQuietHours(pref)}
                          className={cn(
                            'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
                            pref.respectQuietHours
                              ? 'bg-[#EEF2FF] text-[#1F4FD4] hover:bg-[#E0E7FF]'
                              : 'bg-[#FEF3F2] text-[#B42318] hover:bg-[#FEE4E2]',
                          )}
                        >
                          {pref.respectQuietHours ? 'Respect' : 'Ignore'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-1">
        <Button size="sm" onClick={onSave}>
          Save preferences
        </Button>
      </div>
    </div>
  );
}
