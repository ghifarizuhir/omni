import { X, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { Outage } from '../../types';
import { OutageTypeChip } from './OutageTypeChip';

interface OutageDetailDrawerProps {
  outage: Outage | null;
  onClose: () => void;
  isOpen: boolean;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatDuration(minutes?: number): string {
  if (!minutes) return 'Ongoing';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function publicIdToRoute(publicId: string): string {
  return publicId.toLowerCase();
}

const DUMMY_TIMELINE = [
  { label: 'Outage detected', time: '08:14' },
  { label: 'On-call engineer notified', time: '08:15' },
  { label: 'Incident created', time: '08:17' },
  { label: 'Root cause identified', time: '08:45' },
];

const severityColor: Record<string, string> = {
  P1: '#B42318',
  P2: '#DC6803',
  P3: '#B45309',
  P4: '#027A48',
};

export function OutageDetailDrawer({ outage, onClose, isOpen }: OutageDetailDrawerProps) {
  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/30 transition-opacity',
          isOpen && outage ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-[450px] overflow-y-auto bg-white shadow-2xl transition-transform duration-300',
          isOpen && outage ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {outage && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-5">
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-mono text-gray-400">{outage.publicId}</p>
                <h2 className="text-base font-semibold text-gray-900">{outage.serviceName}</h2>
                <div className="flex flex-wrap gap-2">
                  <OutageTypeChip type={outage.type} size="sm" />
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ color: severityColor[outage.severity] ?? '#475467', backgroundColor: '#FEF3F2' }}
                  >
                    {outage.severity}
                  </span>
                  {outage.customerFacing && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      Customer-facing
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 space-y-5 p-5 text-sm">
              {/* Times */}
              <section className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Started</p>
                  <p className="text-gray-800">{formatDateTime(outage.startedAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Resolved</p>
                  <p className="text-gray-800">{outage.endedAt ? formatDateTime(outage.endedAt) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Duration</p>
                  <p className="text-gray-800">{formatDuration(outage.durationMinutes)}</p>
                </div>
                {outage.affectedUsersEstimate !== undefined && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Affected Users</p>
                    <p className="text-gray-800">{outage.affectedUsersEstimate.toLocaleString()}</p>
                  </div>
                )}
              </section>

              {/* Root cause */}
              {(outage.rootCauseSummary || outage.rootCauseProblemPublicId) && (
                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Root Cause</p>
                  {outage.rootCauseSummary && (
                    <p className="text-gray-700">{outage.rootCauseSummary}</p>
                  )}
                  {outage.rootCauseProblemPublicId && (
                    <Link
                      to={`/problems/${publicIdToRoute(outage.rootCauseProblemPublicId)}`}
                      className="mt-1 inline-block text-xs text-blue-600 hover:underline"
                    >
                      {outage.rootCauseProblemPublicId}
                    </Link>
                  )}
                </section>
              )}

              {/* Triggering incident */}
              {outage.triggeringIncidentPublicId && (
                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Triggering Incident</p>
                  <Link
                    to={`/incidents/${publicIdToRoute(outage.triggeringIncidentPublicId)}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {outage.triggeringIncidentPublicId}
                  </Link>
                </section>
              )}

              {/* Resolving change */}
              {outage.resolvingChangePublicId && (
                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Resolving Action</p>
                  <Link
                    to={`/changes/${publicIdToRoute(outage.resolvingChangePublicId)}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {outage.resolvingChangePublicId}
                  </Link>
                </section>
              )}

              {/* Preventive actions */}
              {outage.preventiveActions && outage.preventiveActions.length > 0 && (
                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Preventive Actions</p>
                  <ul className="space-y-1">
                    {outage.preventiveActions.map((action, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Affected CIs */}
              {outage.affectedCIPublicIds.length > 0 && (
                <section>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Affected CIs</p>
                  <div className="flex flex-wrap gap-1.5">
                    {outage.affectedCIPublicIds.map((ci) => (
                      <span key={ci} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                        {ci}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Timeline */}
              <section>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Timeline</p>
                <ol className="space-y-3">
                  {DUMMY_TIMELINE.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-700">{step.label}</p>
                        <p className="text-xs text-gray-400">{step.time}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
