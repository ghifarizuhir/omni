import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { Button } from '@/src/components/ui/Button';
import { problemsService, useResource } from '@/src/services';
import { problemStatusMeta } from '@/src/lib/constants';
import { cn } from '@/src/lib/utils';
import { ProblemStatus } from '@/src/types/problem';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentProblemId?: string;
  onLink: (problemId: string, problemPublicId: string) => void;
}

export const LinkProblemModal: React.FC<Props> = ({ isOpen, onClose, currentProblemId, onLink }) => {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedPublicId, setSelectedPublicId] = useState<string | null>(null);
  const { data: problems } = useResource(() => problemsService.list(), []);

  const filtered = (problems ?? []).filter(prb => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return prb.publicId.toLowerCase().includes(q) || prb.title.toLowerCase().includes(q);
  });

  const handleSelect = (id: string, publicId: string) => {
    if (id === currentProblemId) return;
    setSelectedId(id);
    setSelectedPublicId(publicId);
  };

  const handleConfirm = () => {
    if (!selectedId || !selectedPublicId) return;
    onLink(selectedId, selectedPublicId);
    setSelectedId(null);
    setSelectedPublicId(null);
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSelectedId(null);
    setSelectedPublicId(null);
    setSearch('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Link Problem" size="sm">
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
            <p className="text-xs text-ois-text-subtle text-center py-8">No problems found</p>
          ) : (
            filtered.map(prb => {
              const isLinked = prb.id === currentProblemId;
              const isSelected = prb.id === selectedId;
              const meta = problemStatusMeta[prb.status as ProblemStatus];
              return (
                <div
                  key={prb.id}
                  onClick={() => handleSelect(prb.id, prb.publicId)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 border-b border-ois-border last:border-0',
                    isLinked
                      ? 'opacity-60 cursor-not-allowed bg-ois-primary/5 border-l-2 border-l-ois-primary'
                      : isSelected
                      ? 'bg-ois-primary/5 border-l-2 border-l-ois-primary cursor-pointer'
                      : 'hover:bg-ois-surface-muted cursor-pointer',
                  )}
                >
                  <span className="font-mono text-xs text-ois-primary shrink-0">{prb.publicId}</span>
                  <span className="text-sm text-ois-text flex-1 truncate">{prb.title}</span>
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: meta.color, background: meta.bg }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.dot }} />
                    {meta.label}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-ois-border mt-4">
          <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!selectedId}>
            Link Problem
          </Button>
        </div>
      </div>
    </Modal>
  );
};
