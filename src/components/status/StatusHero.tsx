import { StatusPageEntry } from '@/src/types/platform';

interface StatusHeroProps {
  entries: StatusPageEntry[];
}

function deriveOverallStatus(entries: StatusPageEntry[]) {
  if (entries.some(e => e.status === 'major_outage')) {
    return {
      label: '🔴 MAJOR OUTAGE',
      bg: '#FEF3F2',
      textColor: '#B42318',
      borderColor: '#FECDCA',
    };
  }
  if (entries.some(e => e.status === 'partial_outage' || e.status === 'degraded')) {
    return {
      label: '⚠ PARTIAL SERVICE DISRUPTION',
      bg: '#FFFAEB',
      textColor: '#B54708',
      borderColor: '#FEDF89',
    };
  }
  if (entries.some(e => e.status === 'maintenance')) {
    return {
      label: 'SCHEDULED MAINTENANCE IN PROGRESS',
      bg: '#F0F9FF',
      textColor: '#026AA2',
      borderColor: '#B9E6FE',
    };
  }
  return {
    label: 'ALL SYSTEMS OPERATIONAL',
    bg: '#ECFDF3',
    textColor: '#027A48',
    borderColor: '#A9EFC5',
  };
}

export function StatusHero({ entries }: StatusHeroProps) {
  const overall = deriveOverallStatus(entries);

  const affectedCount = entries.filter(
    e => e.status !== 'operational' && e.status !== 'maintenance'
  ).length;

  const mostRecent = [...entries].sort(
    (a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
  )[0];

  const lastUpdatedBy = mostRecent?.lastUpdatedByName ?? 'System';
  const lastUpdatedAt = mostRecent
    ? new Date(mostRecent.lastUpdatedAt).toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      })
    : '—';

  return (
    <div
      className="rounded-xl border px-8 py-7"
      style={{
        backgroundColor: overall.bg,
        borderColor: overall.borderColor,
      }}
    >
      <p
        className="text-2xl font-bold tracking-wide"
        style={{ color: overall.textColor }}
      >
        {overall.label}
      </p>
      {affectedCount > 0 && (
        <p className="mt-1 text-sm font-medium" style={{ color: overall.textColor }}>
          {affectedCount} service{affectedCount !== 1 ? 's' : ''} affected
        </p>
      )}
      <p className="mt-3 text-xs text-gray-500">
        Last updated at {lastUpdatedAt} by {lastUpdatedBy}
      </p>
    </div>
  );
}
