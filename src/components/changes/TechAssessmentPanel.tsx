import React from 'react';
import {
  CheckCircle2, AlertTriangle, Clock, ShieldCheck, Activity,
  GitBranch, ListChecks, Eye, FileText, User,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatDate } from '../../lib/format';
import {
  TechnicalAssessment,
  TechAssessmentStatus,
  TechnicalRisk,
  TechRiskImpact,
  TechRiskLikelihood,
} from '../../types/change';

const STATUS_META: Record<TechAssessmentStatus, { label: string; color: string; bg: string }> = {
  not_started:     { label: 'Not started',     color: '#475467', bg: '#F1F3F7' },
  in_progress:     { label: 'In progress',     color: '#0BA5EC', bg: '#E0F2FE' },
  submitted:       { label: 'Submitted',       color: '#7E22CE', bg: '#F3E8FF' },
  approved:        { label: 'Approved',        color: '#067647', bg: '#DCFAE6' },
  rework_required: { label: 'Rework required', color: '#B42318', bg: '#FEE4E2' },
};

const LIKELIHOOD_SCORE: Record<TechRiskLikelihood, number> = {
  rare: 1, unlikely: 2, possible: 3, likely: 4, almost_certain: 5,
};
const IMPACT_SCORE: Record<TechRiskImpact, number> = {
  negligible: 1, minor: 2, moderate: 3, major: 4, severe: 5,
};

const riskColor = (score: number): { color: string; bg: string; label: string } => {
  if (score >= 15) return { color: '#B42318', bg: '#FEE4E2', label: 'Critical' };
  if (score >= 9)  return { color: '#DC6803', bg: '#FEF0C7', label: 'High' };
  if (score >= 5)  return { color: '#F79009', bg: '#FFF7E6', label: 'Medium' };
  return { color: '#067647', bg: '#DCFAE6', label: 'Low' };
};

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const RiskRow: React.FC<{ risk: TechnicalRisk; index: number }> = ({ risk, index }) => {
  const score = LIKELIHOOD_SCORE[risk.likelihood] * IMPACT_SCORE[risk.impact];
  const tone = riskColor(score);
  return (
    <div className="border border-ois-border rounded-lg overflow-hidden">
      <div className="flex items-start gap-3 px-4 py-3 bg-ois-surface-muted border-b border-ois-border">
        <span className="font-mono text-[10px] font-bold text-ois-text-subtle mt-0.5">
          R{String(index + 1).padStart(2, '0')}
        </span>
        <p className="flex-1 text-sm text-ois-text font-medium leading-snug">{risk.description}</p>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
          style={{ color: tone.color, background: tone.bg }}
          title={`Likelihood × Impact = ${score}`}
        >
          {tone.label} · {score}
        </span>
      </div>
      <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ois-text-subtle font-semibold mb-0.5">
            Likelihood
          </p>
          <p className="text-ois-text">{titleCase(risk.likelihood)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-ois-text-subtle font-semibold mb-0.5">
            Impact
          </p>
          <p className="text-ois-text">{titleCase(risk.impact)}</p>
        </div>
        <div className="col-span-2">
          <p className="text-[10px] uppercase tracking-wider text-ois-text-subtle font-semibold mb-0.5">
            Mitigation
          </p>
          <p className="text-ois-text leading-relaxed">{risk.mitigation}</p>
        </div>
        {risk.owner && (
          <div className="col-span-2 flex items-center gap-1.5 text-ois-text-muted">
            <User size={11} /> Owner: <span className="text-ois-text font-medium">{risk.owner}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<{
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  children: React.ReactNode;
}> = ({ icon: Icon, label, children }) => (
  <div className="border border-ois-border rounded-lg bg-white p-4">
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon size={13} className="text-ois-text-subtle" />
      <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
        {label}
      </p>
    </div>
    <div className="text-sm text-ois-text leading-relaxed">{children}</div>
  </div>
);

const BulletList: React.FC<{ items: string[] }> = ({ items }) =>
  items.length === 0 ? (
    <span className="text-ois-text-subtle italic text-xs">None</span>
  ) : (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-ois-text flex items-start gap-1.5">
          <span className="text-ois-text-subtle mt-0.5">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );

interface TechAssessmentPanelProps {
  assessment?: TechnicalAssessment;
  onStart?: () => void;
}

export const TechAssessmentPanel: React.FC<TechAssessmentPanelProps> = ({ assessment, onStart }) => {
  if (!assessment) {
    return (
      <div className="border border-dashed border-ois-border rounded-lg bg-ois-surface p-10 text-center">
        <FileText size={32} className="mx-auto text-ois-text-subtle mb-3" />
        <p className="text-sm font-bold text-ois-text">Technical assessment not started</p>
        <p className="text-xs text-ois-text-muted mt-1 max-w-md mx-auto">
          A technical assessment — objective and technical risk analysis — is required before this
          change can be tabled at CAB.
        </p>
        {onStart && (
          <button
            onClick={onStart}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ois-primary text-white text-xs font-medium hover:bg-ois-primary-hover transition-colors"
          >
            Start technical assessment
          </button>
        )}
      </div>
    );
  }

  const meta = STATUS_META[assessment.status];
  const highestScore = assessment.risks.reduce(
    (max, r) => Math.max(max, LIKELIHOOD_SCORE[r.likelihood] * IMPACT_SCORE[r.impact]),
    0,
  );
  const highestTone = riskColor(highestScore);
  const isReady = assessment.status === 'approved';

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div
        className={cn(
          'border rounded-lg p-4 flex items-start gap-3',
          isReady
            ? 'border-emerald-200 bg-emerald-50'
            : assessment.status === 'rework_required'
              ? 'border-red-200 bg-red-50'
              : 'border-ois-border bg-ois-surface-muted',
        )}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: meta.bg }}
        >
          {isReady ? (
            <CheckCircle2 size={18} style={{ color: meta.color }} />
          ) : assessment.status === 'rework_required' ? (
            <AlertTriangle size={18} style={{ color: meta.color }} />
          ) : (
            <Clock size={18} style={{ color: meta.color }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ color: meta.color, background: meta.bg }}
            >
              {meta.label.toUpperCase()}
            </span>
            <p className="text-sm font-bold text-ois-text">
              {isReady
                ? 'Ready for CAB'
                : assessment.status === 'submitted'
                  ? 'Awaiting technical reviewer sign-off'
                  : assessment.status === 'rework_required'
                    ? 'Reviewer requested changes — not ready for CAB'
                    : 'Assessment in progress — not ready for CAB'}
            </p>
          </div>
          <p className="text-xs text-ois-text-muted">
            {isReady && assessment.reviewerName && assessment.reviewedAt
              ? `Signed off by ${assessment.reviewerName} (${assessment.reviewerRole}) on ${formatDate(assessment.reviewedAt, 'MMM d, HH:mm')} UTC`
              : assessment.submittedAt
                ? `Submitted by ${assessment.submittedBy ?? 'requester'} on ${formatDate(assessment.submittedAt, 'MMM d, HH:mm')} UTC`
                : 'Complete the sections below, then submit for technical review.'}
          </p>
          {isReady && assessment.signOffNote && (
            <p className="text-xs text-ois-text mt-2 italic border-l-2 border-emerald-300 pl-2">
              "{assessment.signOffNote}"
            </p>
          )}
        </div>
        <div className="text-right shrink-0 hidden md:block">
          <p className="text-[10px] uppercase tracking-wider text-ois-text-subtle font-semibold">
            Highest technical risk
          </p>
          {assessment.risks.length > 0 ? (
            <span
              className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-md"
              style={{ color: highestTone.color, background: highestTone.bg }}
            >
              {highestTone.label} · {highestScore}
            </span>
          ) : (
            <p className="text-xs text-ois-text-subtle mt-1">No risks logged</p>
          )}
        </div>
      </div>

      {/* Objective */}
      <Field icon={FileText} label="Technical Objective">
        {assessment.objective}
      </Field>

      {/* Scope */}
      <Field icon={GitBranch} label="Technical Scope">
        {assessment.technicalScope}
      </Field>

      {/* Two columns: prereqs / dependencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field icon={ListChecks} label="Prerequisites">
          <BulletList items={assessment.prerequisites} />
        </Field>
        <Field icon={GitBranch} label="Dependencies">
          <BulletList items={assessment.dependencies} />
        </Field>
      </div>

      {/* Impact considerations */}
      {(assessment.performanceImpact || assessment.securityConsiderations || assessment.observabilityNotes) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {assessment.performanceImpact && (
            <Field icon={Activity} label="Performance">
              {assessment.performanceImpact}
            </Field>
          )}
          {assessment.securityConsiderations && (
            <Field icon={ShieldCheck} label="Security">
              {assessment.securityConsiderations}
            </Field>
          )}
          {assessment.observabilityNotes && (
            <Field icon={Eye} label="Observability">
              {assessment.observabilityNotes}
            </Field>
          )}
        </div>
      )}

      {/* Risks */}
      <div className="border border-ois-border rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center justify-between">
          <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
            Technical Risks ({assessment.risks.length})
          </p>
          <p className="text-[10px] text-ois-text-subtle">
            Score = Likelihood × Impact (1–5 each)
          </p>
        </div>
        <div className="p-4 space-y-3">
          {assessment.risks.length === 0 ? (
            <p className="text-xs text-ois-text-subtle italic">No technical risks logged.</p>
          ) : (
            assessment.risks.map((r, i) => <RiskRow key={r.id} risk={r} index={i} />)
          )}
        </div>
      </div>
    </div>
  );
};
