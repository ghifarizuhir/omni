import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardBody } from '../ui/Card';
import { DeploymentStatusPill } from './DeploymentStatusPill';
import { EnvironmentComponentTable } from './EnvironmentComponentTable';
import { EnvironmentInfo, Deployment } from '../../types/deployment';

interface EnvironmentCardProps {
  env: EnvironmentInfo;
  deployments: Deployment[];
}

const healthDot: Record<EnvironmentInfo['health'], { color: string; label: string }> = {
  healthy:  { color: '#12B76A', label: 'Healthy'  },
  degraded: { color: '#F79009', label: 'Degraded' },
  down:     { color: '#F04438', label: 'Down'     },
};

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[#EAECF0] pt-3 mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full text-left group"
      >
        <span className="text-xs font-semibold text-[#344054] uppercase tracking-wider">{title}</span>
        {open ? (
          <ChevronUp size={14} className="text-[#98A2B3]" />
        ) : (
          <ChevronDown size={14} className="text-[#98A2B3]" />
        )}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

export const EnvironmentCard: React.FC<EnvironmentCardProps> = ({ env, deployments }) => {
  const health = healthDot[env.health];
  const activeDeployments = deployments.filter(
    (d) => env.activeDeploymentIds.includes(d.id),
  );
  const [showComponents, setShowComponents] = useState(false);

  return (
    <Card>
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[#101828]">{env.displayName}</h3>
            {env.description && (
              <p className="text-xs text-[#667085] mt-0.5">{env.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: health.color }}
            />
            <span className="text-xs font-semibold" style={{ color: health.color }}>
              {health.label}
            </span>
            <span className="text-xs text-[#98A2B3]">·</span>
            <span className="text-xs text-[#667085]">{env.uptime30d.toFixed(2)}% uptime</span>
          </div>
        </div>
      </div>

      <CardBody className="pt-0">
        <Section title="Active Deployments">
          {activeDeployments.length === 0 ? (
            <p className="text-xs text-[#98A2B3]">None active</p>
          ) : (
            <div className="flex flex-col gap-2">
              {activeDeployments.map((d) => {
                const version = d.artifactRef.includes(':')
                  ? d.artifactRef.split(':').pop()
                  : d.artifactRef;
                return (
                  <div key={d.id} className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-[#1F4FD4] font-bold">{d.publicId}</span>
                    <span className="text-xs text-[#475467]">{d.componentName}</span>
                    <span className="font-mono text-[10px] bg-[#F1F3F7] text-[#475467] rounded px-1.5 py-0.5">
                      {version}
                    </span>
                    <DeploymentStatusPill status={d.status} size="sm" />
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        <Section title="Last 7 Days">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-lg font-bold text-[#101828]">{env.recentDeploymentCount7d}</div>
              <div className="text-[11px] text-[#667085]">Deployments</div>
            </div>
            <div>
              <div className={cn('text-lg font-bold', env.failureRate7d > 10 ? 'text-[#B42318]' : 'text-[#101828]')}>
                {(env.failureRate7d * 100).toFixed(1)}%
              </div>
              <div className="text-[11px] text-[#667085]">Failure rate</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#101828]">—</div>
              <div className="text-[11px] text-[#667085]">Avg duration</div>
            </div>
          </div>
        </Section>

        <Section title="Components Running">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-[#101828]">{env.ciCount} CIs tracked</span>
            <button
              onClick={() => setShowComponents((v) => !v)}
              className="text-[11px] text-[#1F4FD4] hover:underline"
            >
              {showComponents ? 'Hide' : `Show ${env.runningComponents.length} components`}
            </button>
          </div>
          {showComponents && <EnvironmentComponentTable components={env.runningComponents} />}
        </Section>

        <Section title="Settings">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#475467]">Approval required:</span>
              <span
                className={cn(
                  'text-[10px] font-semibold rounded px-1.5 py-0.5',
                  env.approvalRequired
                    ? 'bg-[#FFFAEB] text-[#DC6803]'
                    : 'bg-[#ECFDF3] text-[#067647]',
                )}
              >
                {env.approvalRequired ? 'Yes' : 'No'}
              </span>
            </div>
            {env.freezeWindowActive ? (
              <div className="flex items-start gap-2 rounded-lg bg-[#FFFAEB] border border-[#F79009]/20 px-3 py-2">
                <Lock size={13} className="text-[#DC6803] mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-semibold text-[#DC6803]">Freeze window active</span>
                  {env.freezeWindowReason && (
                    <p className="text-[11px] text-[#DC6803] mt-0.5">{env.freezeWindowReason}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#475467]">Freeze window:</span>
                <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-[#ECFDF3] text-[#067647]">
                  Not active
                </span>
              </div>
            )}
          </div>
        </Section>
      </CardBody>
    </Card>
  );
};
