import React from 'react';
import { formatRelative } from '../../lib/format';
import { EnvironmentInfo } from '../../types/deployment';

interface EnvironmentComponentTableProps {
  components: EnvironmentInfo['runningComponents'];
}

export const EnvironmentComponentTable: React.FC<EnvironmentComponentTableProps> = ({ components }) => {
  if (components.length === 0) {
    return <p className="text-xs text-[#98A2B3] py-2">No components running.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-[#EAECF0]">
            <th className="text-left text-[#667085] font-medium py-2 pr-4">Component</th>
            <th className="text-left text-[#667085] font-medium py-2 pr-4">Version</th>
            <th className="text-left text-[#667085] font-medium py-2 pr-4">Deployed</th>
            <th className="text-left text-[#667085] font-medium py-2">CI</th>
          </tr>
        </thead>
        <tbody>
          {components.map((c) => (
            <tr key={c.componentName} className="border-b border-[#F2F4F7] hover:bg-[#F9FAFB]">
              <td className="py-2 pr-4 font-medium text-[#101828]">{c.componentName}</td>
              <td className="py-2 pr-4 font-mono text-[#475467]">{c.currentVersion}</td>
              <td className="py-2 pr-4 text-[#667085]">{formatRelative(c.deployedAt)}</td>
              <td className="py-2 text-[#667085]">{c.componentCIPublicId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
