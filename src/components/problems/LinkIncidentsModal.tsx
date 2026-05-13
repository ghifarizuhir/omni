import React, { useState } from 'react';
import { Search, X, Link2 } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { incidentsService, useResource } from '@/src/services';
import { IncidentStatusPill } from '@/src/components/incidents/IncidentStatusPill';
import { Problem } from '@/src/types/problem';
import { SeverityBadge } from '@/src/components/ui/StatusSeverityBadges';
import { formatRelative } from '@/src/lib/format';

interface Props {
  problem: Problem;
  isOpen: boolean;
  onClose: () => void;
  onLink: (incidentPublicIds: string[]) => void;
}

export const LinkIncidentsModal: React.FC<Props> = ({ problem, isOpen, onClose, onLink }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: incidents } = useResource(() => incidentsService.list(), []);
  const candidates = (incidents ?? []).filter(inc => {
    if (problem.relatedIncidentIds.includes(inc.publicId)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return inc.publicId.toLowerCase().includes(q) || inc.title.toLowerCase().includes(q);
  });

  const toggle = (publicId: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(publicId) ? next.delete(publicId) : next.add(publicId);
      return next;
    });
  };

  const handleLink = () => {
    onLink([...selected]);
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Link incidents to ${problem.publicId}`} size="lg">
      <div className="py-4 space-y-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search incident ID or title…"
            className="w-full h-9 pl-8 pr-3 text-sm border border-ois-border rounded-lg bg-white text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>

        <div className="border border-ois-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="text-xs text-ois-text-subtle text-center py-8">No incidents found</p>
          ) : (
            candidates.map(inc => (
              <label
                key={inc.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-ois-surface-muted cursor-pointer border-b border-ois-border last:border-0"
              >
                <input
                  type="checkbox"
                  checked={selected.has(inc.publicId)}
                  onChange={() => toggle(inc.publicId)}
                  className="w-4 h-4 rounded text-ois-primary"
                />
                <span className="font-mono text-xs font-semibold text-ois-primary w-32 shrink-0">{inc.publicId}</span>
                <span className="text-xs text-ois-text flex-1 truncate">{inc.title}</span>
                <SeverityBadge severity={inc.priority} />
                <IncidentStatusPill status={inc.status} />
                <span className="text-xs text-ois-text-subtle shrink-0">{formatRelative(inc.createdAt)}</span>
              </label>
            ))
          )}
        </div>

        {selected.size > 0 && (
          <p className="text-xs text-ois-text-muted">
            {selected.size} incident{selected.size > 1 ? 's' : ''} selected
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-ois-border">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleLink} disabled={selected.size === 0}>
            <Link2 size={14} className="mr-1.5" />
            Link {selected.size > 0 ? selected.size : ''} incident{selected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
