import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface PagerProps {
  page: number;
  pageSize: number;
  total?: number; // optional, if known
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export const Pager: React.FC<PagerProps> = ({ page, pageSize, total, onPageChange, onPageSizeChange, className }) => {
  const totalPages = total ? Math.max(1, Math.ceil(total / pageSize)) : undefined;
  return (
    <div className={cn('flex items-center justify-between py-3 text-xs', className)}>
      <span className="text-ois-text-muted">Page {page} {totalPages ? `of ${totalPages}` : ''} · {pageSize} / page</span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}><ChevronLeft size={14} /></Button>
        <span className="px-2 text-ois-text font-medium">{page}</span>
        <Button variant="outline" size="sm" disabled={totalPages !== undefined ? page >= totalPages : false} onClick={() => onPageChange(page + 1)}><ChevronRight size={14} /></Button>
        {onPageSizeChange && (
          <select value={pageSize} onChange={e => onPageSizeChange(Number(e.target.value))} className="ml-2 border border-ois-border rounded px-1 py-1 bg-white text-ois-text">
            {[10,20,50,100].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        )}
      </div>
    </div>
  );
};
