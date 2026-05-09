import React, { useState } from 'react';
import { Video, MessageSquare, BarChart2, Plus, ExternalLink, X } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface WarRoomLink {
  id: string;
  icon: React.ReactNode;
  label: string;
  url: string;
}

interface WarRoomLinksProps {
  incidentPublicId: string;
}

export const WarRoomLinks: React.FC<WarRoomLinksProps> = ({ incidentPublicId }) => {
  const channelSlug = `inc-${incidentPublicId.replace('INC-', '').replace('2026-', '')}`;

  const [links, setLinks] = useState<WarRoomLink[]>([
    { id: 'zoom', icon: <Video size={13} />, label: 'Bridge', url: 'https://zoom.us/j/...' },
    {
      id: 'slack',
      icon: <MessageSquare size={13} />,
      label: `Slack #${channelSlug}`,
      url: `slack://channel?id=${channelSlug}`,
    },
    { id: 'grafana', icon: <BarChart2 size={13} />, label: 'Dashboard', url: 'https://grafana.internal/...' },
  ]);

  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const addLink = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    setLinks(prev => [
      ...prev,
      { id: `custom-${Date.now()}`, icon: <ExternalLink size={13} />, label: newLabel, url: newUrl },
    ]);
    setNewLabel('');
    setNewUrl('');
    setAddOpen(false);
  };

  return (
    <div className="rounded-lg border border-ois-border bg-ois-bg overflow-hidden">
      <div className="px-3 py-2.5 border-b border-ois-border bg-ois-surface-muted/40 flex items-center justify-between">
        <span className="text-[11px] font-bold text-ois-text uppercase tracking-widest">War room links</span>
        <button
          onClick={() => setAddOpen(!addOpen)}
          className="flex items-center gap-1 text-[11px] text-ois-primary hover:underline"
        >
          <Plus size={11} />
          Add
        </button>
      </div>

      <div className="divide-y divide-ois-border">
        {links.map(link => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-ois-surface-muted transition-colors group"
          >
            <span className="text-ois-text-muted group-hover:text-ois-primary transition-colors">
              {link.icon}
            </span>
            <span className="text-xs text-ois-text flex-1 truncate">{link.label}</span>
            <ExternalLink size={11} className="text-ois-text-subtle opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        ))}
      </div>

      {addOpen && (
        <div className="px-3 py-3 border-t border-ois-border bg-ois-surface-muted/40 space-y-2">
          <input
            placeholder="Label"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="w-full border border-ois-border rounded px-2.5 py-1.5 text-xs text-ois-text bg-white focus:outline-none focus:ring-1 focus:ring-ois-primary/30 focus:border-ois-primary"
          />
          <input
            placeholder="URL"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            className="w-full border border-ois-border rounded px-2.5 py-1.5 text-xs text-ois-text bg-white focus:outline-none focus:ring-1 focus:ring-ois-primary/30 focus:border-ois-primary"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={addLink} className="text-xs">
              Add link
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
