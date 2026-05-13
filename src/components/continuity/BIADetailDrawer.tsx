import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { BIAImpactLevelPill } from './BIAImpactLevelPill';
import { BIADependencyList } from './BIADependencyList';
import { BIARiskList } from './BIARiskList';
import { rtoClassMeta } from '@/src/lib/constants';
import { BIAEntry } from '@/src/types/continuity';
import { continuityService, useResource } from '@/src/services';
import { DRPlanStatusPill } from './DRPlanStatusPill';

interface Props {
  entry: BIAEntry | null;
  onClose: () => void;
  onOpenDRPlan: (planPublicId: string) => void;
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-5">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</p>
    {children}
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-start gap-2 py-1">
    <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
    <div className="text-sm text-gray-900 flex-1">{children}</div>
  </div>
);

export const BIADetailDrawer: React.FC<Props> = ({ entry, onClose, onOpenDRPlan }) => {
  const { data: plansData } = useResource(() => continuityService.drPlans(), []);
  const mockDRPlans = plansData ?? [];

  if (!entry) return null;

  const rtoMeta = rtoClassMeta[entry.rtoClass];
  const linkedPlan = mockDRPlans.find((p) => entry.linkedDRPlanIds.includes(p.id));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[500px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <span className="font-mono text-xs text-gray-400">{entry.publicId}</span>
            <h2 className="text-base font-bold text-gray-900">{entry.serviceName}</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <Section title="Impact Assessment">
            <Row label="Impact Level">
              <BIAImpactLevelPill level={entry.impactLevel} />
            </Row>
            <Row label="Impact Score">
              <span className="font-semibold">{entry.impactScore}</span>
              <span className="text-gray-400"> / 100</span>
            </Row>
            <Row label="Hourly Cost">
              <span className="font-semibold">${entry.estimatedHourlyCostUSD.toLocaleString()}</span>
              <span className="text-gray-400"> / hour</span>
            </Row>
            <Row label="Daily Cost">
              <span className="font-semibold">${entry.estimatedDailyCostUSD.toLocaleString()}</span>
              <span className="text-gray-400"> / day</span>
            </Row>
          </Section>

          <Section title="Recovery Objectives">
            <Row label="RTO">
              {entry.rto} minutes{' '}
              <span className="text-gray-400">({rtoMeta.label} class)</span>
            </Row>
            <Row label="RPO">{entry.rpoMinutes} minutes</Row>
          </Section>

          <Section title="Scope">
            <Row label="Customer-facing">
              <span className={entry.customerFacing ? 'text-green-700 font-medium' : 'text-gray-500'}>
                {entry.customerFacing ? 'Yes' : 'No'}
              </span>
            </Row>
            <Row label="User segments">
              <div className="flex flex-wrap gap-1">
                {entry.affectedUserSegments.map((seg) => (
                  <span
                    key={seg}
                    className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600"
                  >
                    {seg}
                  </span>
                ))}
              </div>
            </Row>
            <Row label="Peak traffic">{entry.peakTrafficTimes}</Row>
            <Row label="Compliance">
              <div className="flex flex-wrap gap-1">
                {entry.regulatoryCompliance.map((std) => (
                  <span
                    key={std}
                    className="px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    {std}
                  </span>
                ))}
              </div>
            </Row>
          </Section>

          <Section title="Critical Dependencies">
            <BIADependencyList dependencies={entry.criticalDependencies} />
          </Section>

          <Section title="Continuity Risks">
            <BIARiskList risks={entry.continuityRisks} />
          </Section>

          {linkedPlan && (
            <Section title="Linked DR Plan">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-gray-500">{linkedPlan.publicId}</span>
                  <DRPlanStatusPill status={linkedPlan.status} />
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {linkedPlan.name}{' '}
                  <span className="text-xs font-normal text-gray-400">({linkedPlan.version})</span>
                </p>
                {linkedPlan.lastTestedAt && (
                  <p className="text-xs text-gray-500">
                    Last tested: {formatDate(linkedPlan.lastTestedAt)}
                  </p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenDRPlan(linkedPlan.publicId)}
                  className="mt-1 gap-1"
                >
                  Open DR plan
                  <ExternalLink className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Section>
          )}

          <Section title="Review">
            <Row label="Reviewed">
              {formatDate(entry.lastReviewedAt)} by {entry.reviewedByName}
            </Row>
            {entry.approvedByName && (
              <Row label="Approved">
                by {entry.approvedByName}
              </Row>
            )}
            <Row label="Next review">{formatDate(entry.nextReviewAt)}</Row>
          </Section>
        </div>
      </div>
    </>
  );
};
