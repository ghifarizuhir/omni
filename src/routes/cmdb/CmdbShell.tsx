import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { CMDBList } from './CMDBList';
import { CMDBGraph } from './CMDBGraph';

type View = 'list' | 'graph';

const VIEWS: { key: View; label: string }[] = [
  { key: 'list',  label: 'List'  },
  { key: 'graph', label: 'Graph' },
];

/**
 * Shell route for /cmdb that toggles between the list and graph views
 * via a ?view= query param. Replaces the previously separate
 * /cmdb (list) and /cmdb/graph routes.
 */
export const CmdbShell: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const raw = params.get('view');
  const active: View = raw === 'graph' ? 'graph' : 'list';

  const setActive = (next: View) => {
    setParams(prev => {
      const out = new URLSearchParams(prev);
      if (next === 'list') out.delete('view'); else out.set('view', next);
      return out;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-ois-border">
        <h1 className="text-[20px] font-semibold text-ois-text tracking-[-0.01em]">CMDB</h1>
        <div className="flex bg-ois-surface-muted border border-ois-border rounded-[8px] p-[3px] gap-0 text-[12px] font-semibold">
          {VIEWS.map(v => (
            <button
              key={v.key}
              type="button"
              onClick={() => setActive(v.key)}
              className={cn(
                'px-3 py-1 rounded-[6px] transition-colors',
                active === v.key
                  ? 'bg-white text-ois-text shadow-[0_1px_2px_rgba(16,24,40,0.04)] border border-ois-border'
                  : 'text-ois-text-muted hover:text-ois-text',
              )}
              aria-pressed={active === v.key}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {active === 'list'  && <CMDBList />}
        {active === 'graph' && <CMDBGraph />}
      </div>
    </div>
  );
};
