import React from 'react';
import { Link } from 'react-router-dom';
import { Rocket, ArrowRight } from 'lucide-react';
import { formatRelative } from '../../lib/format';
import { Deployment } from '../../types/deployment';

interface ActiveDeploymentBannerProps {
  deployments: Deployment[];
}

export const ActiveDeploymentBanner: React.FC<ActiveDeploymentBannerProps> = ({ deployments }) => {
  if (deployments.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#1F4FD4]/20 bg-[#EEF2FF] px-5 py-4 mb-5">
      <div className="flex items-center gap-2 mb-3">
        <Rocket size={16} className="text-[#1F4FD4]" />
        <span className="text-sm font-bold text-[#1F4FD4]">
          {deployments.length === 1
            ? '1 deployment in progress'
            : `${deployments.length} deployments in progress`}
        </span>
      </div>
      <div className="flex flex-col gap-3">
        {deployments.map((dep) => {
          const version = dep.artifactRef.includes(':')
            ? dep.artifactRef.split(':').pop()
            : dep.artifactRef;
          const currentStage = dep.stages[dep.currentStageIndex];
          const progress = currentStage?.progressPercent ?? 0;
          const elapsed = dep.startedAt ? formatRelative(dep.startedAt) : '—';

          return (
            <div key={dep.id} className="bg-white/70 rounded-lg px-4 py-3 border border-[#1F4FD4]/10">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs font-bold text-[#1F4FD4]">{dep.publicId}</span>
                  <span className="text-[#475467] text-xs">/</span>
                  <span className="text-xs font-semibold text-[#101828] truncate">{dep.componentName}</span>
                  <span className="font-mono text-[10px] bg-[#F1F3F7] text-[#475467] rounded px-1.5 py-0.5">
                    {version}
                  </span>
                  <ArrowRight size={12} className="text-[#98A2B3]" />
                  <span className="text-xs font-semibold text-[#475467] uppercase tracking-wider">
                    {dep.environment}
                  </span>
                </div>
                <Link
                  to={`/deployments/${dep.publicId}`}
                  className="text-xs font-semibold text-[#1F4FD4] hover:underline flex items-center gap-1 shrink-0"
                >
                  View live <ArrowRight size={12} />
                </Link>
              </div>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#475467]">
                    {currentStage ? currentStage.name : 'Initializing…'}
                    {currentStage?.progressLabel ? ` — ${currentStage.progressLabel}` : ''}
                  </span>
                  <span className="text-[11px] text-[#475467]">
                    {progress}% · started {elapsed}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-[#1F4FD4]/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1F4FD4] transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
