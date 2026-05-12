import { StatusPageEntry } from '@/src/types/platform';

interface OverallStatus {
  label: string;
  accentColor: string;
  textColor: string;
  bg: string;
  borderColor: string;
}

export function deriveOverallStatus(entries: StatusPageEntry[]): OverallStatus {
  if (entries.some(e => e.status === 'major_outage')) {
    return { label: 'Major Outage', accentColor: '#B42318', textColor: '#B42318', bg: '#FEF3F2', borderColor: '#FECDCA' };
  }
  if (entries.some(e => e.status === 'partial_outage' || e.status === 'degraded')) {
    return { label: 'Partial Service Disruption', accentColor: '#DC6803', textColor: '#B54708', bg: '#FFFAEB', borderColor: '#FEDF89' };
  }
  if (entries.some(e => e.status === 'maintenance')) {
    return { label: 'Scheduled Maintenance', accentColor: '#0BA5EC', textColor: '#026AA2', bg: '#F0F9FF', borderColor: '#B9E6FE' };
  }
  return { label: 'All Systems Operational', accentColor: '#12B76A', textColor: '#027A48', bg: '#ECFDF3', borderColor: '#A9EFC5' };
}

interface StatusHeroProps {
  entries: StatusPageEntry[];
}

export function StatusHero({ entries }: StatusHeroProps) {
  const overall = deriveOverallStatus(entries);
  const affectedCount = entries.filter(e => e.status !== 'operational' && e.status !== 'maintenance').length;
  const mostRecent = [...entries].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())[0];
  const lastUpdatedBy = mostRecent?.lastUpdatedByName ?? 'System';
  const lastUpdatedAt = mostRecent
    ? new Date(mostRecent.lastUpdatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' })
    : '—';

  return (
    <div className="rounded-xl border px-8 py-7" style={{ backgroundColor: overall.bg, borderColor: overall.borderColor }}>
      <p className="text-2xl font-bold tracking-wide" style={{ color: overall.textColor }}>{overall.label}</p>
      {affectedCount > 0 && (
        <p className="mt-1 text-sm font-medium" style={{ color: overall.textColor }}>
          {affectedCount} service{affectedCount !== 1 ? 's' : ''} affected
        </p>
      )}
      <p className="mt-3 text-xs" style={{ color: `${overall.textColor}99` }}>
        Last updated at {lastUpdatedAt} by {lastUpdatedBy}
      </p>
    </div>
  );
}
