import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Pin, PinOff, Search, Layers } from 'lucide-react';
import { useScope, type MyApp } from '@/src/lib/scope/ScopeContext';
import { useScopeUiEnabled } from '@/src/lib/scope/featureFlag';
import { cn } from '@/src/lib/utils';

const CRITICALITY_CLASSES: Record<string, string> = {
  P1: 'bg-red-50 text-red-700 border-red-200',
  P2: 'bg-amber-50 text-amber-700 border-amber-200',
  P3: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  P4: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// ─── AppRow ──────────────────────────────────────────────────────────────────

interface AppRowProps {
  app: MyApp;
  active: boolean;
  pinned: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
}

const AppRow: React.FC<AppRowProps> = ({ app, active, pinned, onSelect, onTogglePin }) => (
  <div
    className={cn(
      'flex items-center justify-between px-3 py-1.5 text-xs hover:bg-ois-bg',
      active && 'bg-ois-bg font-medium',
    )}
  >
    <button onClick={onSelect} className="text-left flex-1 truncate min-w-0 pr-1">
      {app.name}
    </button>
    <button
      onClick={onTogglePin}
      title={pinned ? 'Unpin' : 'Pin'}
      className="text-ois-text-subtle hover:text-ois-text px-1 flex-shrink-0"
    >
      {pinned ? <Pin size={12} className="fill-current" /> : <PinOff size={12} />}
    </button>
  </div>
);

// ─── AppScopeSwitcher ─────────────────────────────────────────────────────────

export const AppScopeSwitcher: React.FC = () => {
  const enabled = useScopeUiEnabled();
  const { scope, setScope, myApps, pinned, togglePin, loading } = useScope();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // All hooks above this line so the call order is stable regardless of `enabled`.
  const filtered = useMemo(() => {
    if (!query) return myApps;
    const q = query.toLowerCase();
    return myApps.filter(
      (a) => a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q),
    );
  }, [query, myApps]);

  // Feature flag guard — early return AFTER all hooks (Rules of Hooks).
  if (!enabled) return null;

  const active =
    scope === 'all'
      ? { label: 'All my apps', criticality: null as string | null }
      : (() => {
          const a = myApps.find((x) => x.id === (scope as { kind: 'app'; appId: string }).appId);
          return a ? { label: a.name, criticality: a.criticality } : { label: '…', criticality: null };
        })();

  const pinnedApps = filtered.filter((a) => pinned.includes(a.id));
  const otherApps = filtered.filter((a) => !pinned.includes(a.id));

  const chipClass =
    active.criticality
      ? (CRITICALITY_CLASSES[active.criticality] ?? 'bg-ois-surface-muted text-ois-text border-ois-border')
      : 'bg-ois-surface-muted text-ois-text border-ois-border';

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 h-9 px-3 rounded-md border text-xs font-medium hover:bg-ois-bg transition-colors',
          chipClass,
        )}
      >
        <Layers size={14} />
        <span>Scope: {active.label}</span>
        <ChevronDown
          size={14}
          className={cn('transition-transform duration-150', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white rounded-lg shadow-lg border border-ois-border z-50">
          {/* Search — only shown when user has >10 apps */}
          {myApps.length > 10 && (
            <div className="p-2 border-b border-ois-border">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-ois-text-subtle"
                />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search apps…"
                  className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-ois-border focus:border-ois-primary focus:ring-1 focus:ring-ois-primary outline-none"
                />
              </div>
            </div>
          )}

          {/* All my apps entry */}
          <button
            onClick={() => {
              setScope('all');
              setOpen(false);
            }}
            className={cn(
              'w-full text-left px-3 py-2 text-xs hover:bg-ois-bg flex items-center gap-2 border-b border-ois-border',
              scope === 'all' && 'bg-ois-bg font-medium',
            )}
          >
            <Layers size={14} />
            All my apps
          </button>

          <div className="max-h-72 overflow-y-auto">
            {/* Pinned section */}
            {pinnedApps.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-ois-text-subtle">
                  Pinned
                </div>
                {pinnedApps.map((a) => (
                  <AppRow
                    key={a.id}
                    app={a}
                    active={scope !== 'all' && (scope as { kind: 'app'; appId: string }).appId === a.id}
                    pinned
                    onSelect={() => {
                      setScope({ kind: 'app', appId: a.id });
                      setOpen(false);
                    }}
                    onTogglePin={() => togglePin(a.id)}
                  />
                ))}
              </>
            )}

            {/* All apps section */}
            {otherApps.length > 0 && (
              <>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-ois-text-subtle">
                  All apps
                </div>
                {otherApps.map((a) => (
                  <AppRow
                    key={a.id}
                    app={a}
                    active={scope !== 'all' && (scope as { kind: 'app'; appId: string }).appId === a.id}
                    pinned={false}
                    onSelect={() => {
                      setScope({ kind: 'app', appId: a.id });
                      setOpen(false);
                    }}
                    onTogglePin={() => togglePin(a.id)}
                  />
                ))}
              </>
            )}

            {/* Empty state */}
            {!loading && myApps.length === 0 && (
              <div className="p-3 text-xs text-ois-text-muted">
                You're not a member of any application.{' '}
                <a href="/applications/catalog" className="text-ois-primary hover:underline">
                  Browse catalog
                </a>
                .
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
