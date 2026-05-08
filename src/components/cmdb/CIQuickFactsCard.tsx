import React from 'react';
import { Card } from '../ui/Card';
import { ConfigurationItem } from '../../types/ci';
import { mockUsers, mockTeams } from '../../mocks';
import { formatRelative } from '../../lib/format';
import { User, Users, Clock, Tag as TagIcon, MapPin, Hash } from 'lucide-react';

interface CIQuickFactsCardProps {
  ci: ConfigurationItem;
}

export const CIQuickFactsCard: React.FC<CIQuickFactsCardProps> = ({ ci }) => {
  const owner = mockUsers.find(u => u.id === ci.ownerId);
  const team = mockTeams.find(t => t.id === ci.ownerTeamId);

  const facts = [
    { label: 'Asset ID', value: ci.publicId, icon: Hash },
    { label: 'Environment', value: ci.environment.toUpperCase(), icon: TagIcon },
    { label: 'Responsible', value: owner?.name || 'Unassigned', icon: User },
    { label: 'Support Team', value: team?.name || 'None', icon: Users },
    { label: 'Location', value: (ci.attributes as any).region || 'Global', icon: MapPin },
    { label: 'Last Update', value: formatRelative(ci.updatedAt), icon: Clock },
  ];

  return (
    <Card className="p-4 bg-white">
      <h3 className="text-sm font-bold text-ois-text mb-4 uppercase tracking-wider opacity-60">Quick Facts</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
        {facts.map((fact, idx) => (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-ois-text-subtle">
              <fact.icon size={10} /> {fact.label}
            </div>
            <div className="text-sm font-semibold text-ois-text truncate">{fact.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};
