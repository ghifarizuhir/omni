import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DeploymentStatusPill } from './DeploymentStatusPill';
import { EnvironmentChip } from './EnvironmentChip';
import { Deployment } from '../../types/deployment';
import { formatRelative } from '../../lib/format';

interface RecentDeploymentsTableProps {
  deployments: Deployment[];
}

export const RecentDeploymentsTable: React.FC<RecentDeploymentsTableProps> = ({ deployments }) => {
  const navigate = useNavigate();

  if (deployments.length === 0) {
    return <p className="text-sm text-[#98A2B3] py-6 text-center">No deployments found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#EAECF0]">
            <th className="text-left text-[#667085] font-medium py-2.5 pr-4">Env</th>
            <th className="text-left text-[#667085] font-medium py-2.5 pr-4">Component</th>
            <th className="text-left text-[#667085] font-medium py-2.5 pr-4">Version</th>
            <th className="text-left text-[#667085] font-medium py-2.5 pr-4">Status</th>
            <th className="text-left text-[#667085] font-medium py-2.5 pr-4">Started</th>
            <th className="text-left text-[#667085] font-medium py-2.5">Duration</th>
          </tr>
        </thead>
        <tbody>
          {deployments.map((dep) => {
            const version = dep.artifactRef.includes(':')
              ? dep.artifactRef.split(':').pop()
              : dep.artifactRef;
            const isRolledBack = dep.status === 'rolled_back';

            return (
              <tr
                key={dep.id}
                onClick={() => navigate(`/deployments/${dep.publicId}`)}
                className={cn(
                  'border-b border-[#F2F4F7] cursor-pointer hover:bg-[#F9FAFB] transition-colors',
                )}
              >
                <td className="py-2.5 pr-4">
                  <EnvironmentChip env={dep.environment} size="sm" />
                </td>
                <td className="py-2.5 pr-4">
                  <div className="flex items-center gap-1">
                    {isRolledBack && (
                      <CornerDownLeft size={11} className="text-[#DC6803] shrink-0" />
                    )}
                    <span className="font-medium text-[#101828]">{dep.componentName}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-4 font-mono text-[#475467]">{version}</td>
                <td className="py-2.5 pr-4">
                  <DeploymentStatusPill
                    status={dep.status}
                    size="sm"
                    hasIncident={dep.triggeredIncidentIds.length > 0}
                  />
                </td>
                <td className="py-2.5 pr-4 text-[#667085]">
                  {dep.startedAt ? formatRelative(dep.startedAt) : '—'}
                </td>
                <td className="py-2.5 text-[#667085]">
                  {dep.durationSec != null ? `${dep.durationSec}s` : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
