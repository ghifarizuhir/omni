import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, RotateCcw, Clock, Users } from 'lucide-react';
import { cn } from '../../lib/utils';
import { PIR } from '../../types/change';
import { formatDate, formatRelative } from '../../lib/format';

const outcomeConfig = {
  success: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Success' },
  partial_success: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Partial Success' },
  failed: { icon: XCircle, color: 'text-ois-danger', bg: 'bg-red-50', label: 'Failed' },
  rolled_back: { icon: RotateCcw, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Rolled Back' },
};

interface PIRPanelProps {
  pir: PIR;
}

export const PIRPanel: React.FC<PIRPanelProps> = ({ pir }) => {
  const cfg = outcomeConfig[pir.outcome];
  const Icon = cfg.icon;
  const overrun = pir.actualDurationMin - pir.plannedDurationMin;

  return (
    <div className="space-y-5">
      {/* Outcome */}
      <div className={cn('flex items-center gap-3 p-4 rounded-xl', cfg.bg)}>
        <Icon size={22} className={cfg.color} />
        <div>
          <p className={cn('text-sm font-bold', cfg.color)}>Outcome: {cfg.label}</p>
          {pir.customerImpact && (
            <p className="text-xs text-ois-text-muted mt-0.5">{pir.customerImpact}</p>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Planned', value: `${pir.plannedDurationMin} min` },
          { label: 'Actual', value: `${pir.actualDurationMin} min`, sub: overrun !== 0 ? `${overrun > 0 ? '+' : ''}${overrun} min` : undefined, subColor: overrun > 0 ? 'text-ois-warning' : 'text-ois-success' },
          { label: 'Unplanned downtime', value: `${pir.unplannedDowntimeMin} min`, sub: pir.unplannedDowntimeMin === 0 ? '✓ None' : undefined, subColor: 'text-ois-success' },
        ].map(({ label, value, sub, subColor }) => (
          <div key={label} className="bg-ois-bg rounded-xl p-3 text-center">
            <p className="text-xs text-ois-text-muted mb-1">{label}</p>
            <p className="text-lg font-bold text-ois-text">{value}</p>
            {sub && <p className={cn('text-[11px] font-semibold mt-0.5', subColor)}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Findings */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-600" />
            What went well
          </h4>
          <p className="text-sm text-ois-text leading-relaxed bg-emerald-50 rounded-lg p-3">{pir.whatWentWell}</p>
        </div>

        {pir.whatWentWrong && (
          <div>
            <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <XCircle size={12} className="text-ois-danger" />
              What went wrong
            </h4>
            <p className="text-sm text-ois-text leading-relaxed bg-red-50 rounded-lg p-3">{pir.whatWentWrong}</p>
          </div>
        )}

        <div>
          <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2">
            Lessons learned
          </h4>
          <p className="text-sm text-ois-text leading-relaxed">{pir.lessonsLearned}</p>
        </div>
      </div>

      {/* Triggered incidents */}
      <div>
        <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2">
          Triggered incidents
        </h4>
        {pir.triggeredIncidentIds.length === 0 ? (
          <p className="text-xs text-ois-success font-semibold">✓ None</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {pir.triggeredIncidentIds.map((id) => (
              <span key={id} className="font-mono text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded">{id}</span>
            ))}
          </div>
        )}
      </div>

      {/* Follow-up actions */}
      {pir.followUpActions.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-ois-text-muted uppercase tracking-wider mb-2">
            Follow-up actions
          </h4>
          <div className="space-y-2">
            {pir.followUpActions.map((fa, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-ois-bg border border-ois-border">
                <span className={cn(
                  'text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider mt-0.5',
                  fa.type === 'preventive' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700',
                )}>
                  {fa.type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-ois-text">{fa.description}</p>
                  <p className="text-[10px] text-ois-text-subtle mt-0.5">
                    Owner: {fa.owner} · Due {fa.targetDate} · <span className="capitalize">{fa.status.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign-off */}
      <div className="flex items-center justify-between pt-3 border-t border-ois-border text-xs text-ois-text-subtle">
        <span>Reviewed by {pir.reviewedBy} · {formatDate(pir.reviewedAt, 'MMM d, HH:mm')} UTC</span>
        {pir.signedOffAt && (
          <span>Signed off by {pir.signedOffBy} · {formatDate(pir.signedOffAt, 'MMM d')} UTC</span>
        )}
      </div>
    </div>
  );
};
