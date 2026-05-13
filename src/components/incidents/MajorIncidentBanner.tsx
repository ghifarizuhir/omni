import React from 'react';
import { Siren } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { Incident } from '@/src/types/incident';
import { usersService, useResource } from '@/src/services';

interface Props {
  incident: Incident;
  className?: string;
}

export const MajorIncidentBanner: React.FC<Props> = ({ incident, className }) => {
  const navigate = useNavigate();
  const { data: users } = useResource(() => usersService.list(), []);
  const commander = incident.incidentCommander
    ? (users ?? []).find(u => u.id === incident.incidentCommander)?.name ?? 'Unknown'
    : 'Unassigned';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3 rounded-lg border',
        'bg-red-50 border-red-300',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Pulsing icon */}
        <span className="relative flex h-5 w-5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <Siren size={20} className="relative text-red-600" />
        </span>
        <div>
          <div className="text-xs font-bold text-red-700 uppercase tracking-wide mb-0.5">
            Major Incident in Progress
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-xs text-red-800 font-semibold">{incident.publicId}</span>
            <span className="text-red-900 font-medium">{incident.title}</span>
          </div>
          <div className="text-xs text-red-700 mt-0.5">
            IC: {commander} · Started {formatRelative(incident.createdAt)} · Resolve SLA target: {incident.slaResolveTarget}m
          </div>
        </div>
      </div>
      <button
        onClick={() => navigate(`/incidents/major/${incident.publicId}`)}
        className="shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
      >
        Open war room →
      </button>
    </div>
  );
};
