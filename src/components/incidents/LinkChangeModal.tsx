import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { mockChanges } from '@/src/mocks/changes';
import { ChangeStatusPill } from '@/src/components/changes/ChangeStatusPill';
import { RiskBadge } from '@/src/components/changes/RiskBadge';
import { cn } from '@/src/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentChangeIds: string[];
  onLink: (changeIds: string[]) => void;
}

export const LinkChangeModal: React.FC<Props> = ({ isOpen, onClose, currentChangeIds, onLink }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = mockChanges.filter(chg => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return chg.publicId.toLowerCase().includes(q) || chg.title.toLowerCase().includes(q);
  });

  const toggle = (id: string) => {
    if (currentChangeIds.includes(id)) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    onLink([...selected]);
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Link Change" size="md">
      <div className="py-4 space-y-4">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or ID…"
            className="w-full h-9 pl-8 pr-3 text-sm border border-ois-border rounded-lg bg-white text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
          />
        </div>

        <div className="border border-ois-border rounded-lg overflow-hidden max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-ois-text-subtle text-center py-8">No changes found</p>
          ) : (
            filtered.map(chg => {
              const linked = currentChangeIds.includes(chg.id);
              const checked = linked || selected.has(chg.id);
              return (
                <label
                  key={chg.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 border-b border-ois-border last:border-0',
                    linked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-ois-surface-muted cursor-pointer',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={linked}
                    onChange={() => toggle(chg.id)}
                    className="w-4 h-4 rounded text-ois-primary"
                  />
                  <span className="font-mono text-xs text-ois-primary shrink-0">{chg.publicId}</span>
                  <span className="text-sm text-ois-text flex-1 truncate">{chg.title}</span>
                  <ChangeStatusPill status={chg.status} size="sm" />
                  <RiskBadge risk={chg.risk} size="sm" />
                </label>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-ois-border mt-4">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={selected.size === 0}>
            Link {selected.size > 0 ? selected.size : ''} Change{selected.size !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
