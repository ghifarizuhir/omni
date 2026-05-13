import React, { useEffect, useState } from 'react';
import { ArrowLeft, MoreVertical, Siren, Clock, Users, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/src/components/ui/Button';
import { Incident } from '@/src/types/incident';
import { usersService, useResource } from '@/src/services';
import { formatRelative } from '@/src/lib/format';
import { differenceInSeconds, differenceInMinutes } from 'date-fns';

interface WarRoomHeroProps {
  incident: Incident;
  onStandDown: () => void;
  onResolve: () => void;
}

function formatCountdown(totalSeconds: number): string {
  const abs = Math.abs(totalSeconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const sign = totalSeconds < 0 ? '-' : '';
  if (h > 0) return `${sign}${h}h ${m.toString().padStart(2, '0')}m`;
  return `${sign}${m}m ${s.toString().padStart(2, '0')}s`;
}

export const WarRoomHero: React.FC<WarRoomHeroProps> = ({ incident, onStandDown, onResolve }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const { data: usersData } = useResource(() => usersService.list(), []);
  const mockUsers = usersData ?? [];
  const ic = incident.incidentCommander ? mockUsers.find(u => u.id === incident.incidentCommander) : null;
  const assignee = incident.assigneeId ? mockUsers.find(u => u.id === incident.assigneeId) : null;

  const startMs = new Date(incident.createdAt).getTime();
  const majorDeclaredMs = incident.majorDeclaredAt ? new Date(incident.majorDeclaredAt).getTime() : startMs;
  const resolveTargetMs = startMs + incident.slaResolveTarget * 60_000;
  const slaRemainingSeconds = Math.floor((resolveTargetMs - now) / 1000);
  const slaBreached = slaRemainingSeconds < 0;

  const startedAgo = differenceInMinutes(now, startMs);
  const majorDeclaredAgo = differenceInMinutes(now, majorDeclaredMs);

  const getUserInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div
      className="relative overflow-hidden shrink-0"
      style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 30%, #dc2626 70%, #ef4444 100%)' }}
    >
      {/* Noise texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Pulsing alert bars */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/20 animate-pulse" />

      <div className="relative px-6 py-4">
        {/* Top row: back + badge + actions */}
        <div className="flex items-center justify-between mb-3">
          <Link
            to="/incidents"
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back to incidents</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Pulsing MAJOR badge */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1">
              <Siren size={13} className="text-white animate-pulse" />
              <span className="text-white text-xs font-bold tracking-widest uppercase">Major Incident</span>
              <span className="text-white/60 text-xs">·</span>
              <span className="text-white text-xs font-semibold capitalize">{incident.status.replace('_', ' ')}</span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={onStandDown}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
            >
              Stand down
            </Button>

            <button className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
              <MoreVertical size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Incident ID + title */}
        <div className="mb-4">
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-sm text-white/50 font-semibold tracking-wider">{incident.publicId}</span>
            <span className="bg-white/15 text-white text-xs font-bold px-2 py-0.5 rounded border border-white/20">
              {incident.priority}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5 leading-tight">
            {incident.title}
          </h1>
        </div>

        {/* 4-column status grid */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-1">Status</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-white text-sm font-semibold capitalize">{incident.status.replace('_', ' ')}</span>
            </div>
            <p className="text-white/50 text-xs mt-0.5">Started {startedAgo}m ago</p>
          </div>

          <div
            className="backdrop-blur-sm rounded-lg p-3 border"
            style={slaBreached
              ? { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(251,191,36,0.5)' }
              : { background: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.10)' }
            }
          >
            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-1 flex items-center gap-1">
              <Clock size={10} />
              Resolve SLA
            </p>
            <p
              className="text-xl font-bold font-mono tabular-nums"
              style={{ color: slaBreached ? '#fbbf24' : '#ffffff' }}
            >
              {slaBreached ? '+' : ''}{formatCountdown(slaRemainingSeconds)}
            </p>
            <p className="text-white/50 text-xs mt-0.5">
              {slaBreached ? 'SLA breached' : `of ${incident.slaResolveTarget}m target`}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-1 flex items-center gap-1">
              <AlertTriangle size={10} />
              Customer Impact
            </p>
            <p className="text-white text-xs font-medium leading-snug line-clamp-2">
              {incident.customerImpact ?? 'No impact statement'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
            <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-1">Affected</p>
            <div className="space-y-0.5">
              {incident.affectedCIPublicIds.slice(0, 2).map(ci => (
                <p key={ci} className="text-white text-xs font-mono">{ci}</p>
              ))}
              {incident.affectedCIPublicIds.length > 2 && (
                <p className="text-white/50 text-xs">+{incident.affectedCIPublicIds.length - 2} more</p>
              )}
            </div>
          </div>
        </div>

        {/* Roles row */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5 text-white/60 text-xs">
            <Users size={12} />
            <span className="font-semibold uppercase tracking-wider">Roles</span>
          </div>

          {[
            { label: 'IC', user: ic, empty: 'Unassigned' },
            { label: 'Ops Lead', user: assignee, empty: 'Unassigned' },
            { label: 'Comms Lead', user: ic ? mockUsers.find(u => u.id === 'u-006') : null, empty: 'Unassigned' },
            { label: 'Scribe', user: null, empty: 'None' },
          ].map(({ label, user, empty }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-white/40 text-[11px] font-semibold uppercase tracking-wider">{label}</span>
              {user ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                    {getUserInitials(user.name)}
                  </div>
                  <span className="text-white text-xs font-medium">{user.name.split(' ')[0]} {user.name.split(' ')[1]?.[0]}.</span>
                </div>
              ) : (
                <span className="text-white/30 text-xs italic">{empty}</span>
              )}
            </div>
          ))}

          <div className="ml-auto flex items-center gap-3 text-white/40 text-xs">
            <span>Major declared {majorDeclaredAgo}m ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};
