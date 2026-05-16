import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import {
  LayoutDashboard, Inbox, AlertCircle, Bug, Activity, Database, Heart, Zap,
  Lock, Wrench, Package, Rocket, CheckCircle2, ShoppingCart, BookOpen,
  Store, BarChart3, Clock, Lightbulb, Settings, CircleDot,
  BookMarked, Sparkles, UserCircle, ShieldCheck,
} from 'lucide-react';

interface RouteEntry {
  path: string;
  label: string;
  icon: React.ReactNode;
  keywords?: string[];
}

const ROUTES: RouteEntry[] = [
  { path: '/',               label: 'Dashboard',           icon: <LayoutDashboard size={14} />, keywords: ['overview', 'pulse', 'home'] },
  { path: '/inbox',          label: 'Inbox',               icon: <Inbox size={14} /> },
  { path: '/incidents',      label: 'Incidents',           icon: <AlertCircle size={14} /> },
  { path: '/problems',       label: 'Problems',            icon: <Bug size={14} /> },
  { path: '/kedb',           label: 'Known Error DB',      icon: <BookMarked size={14} />, keywords: ['kedb', 'known error', 'workaround'] },
  { path: '/portal',         label: 'Self-Service Portal', icon: <Store size={14} /> },
  { path: '/requests',       label: 'Service Requests',    icon: <ShoppingCart size={14} /> },
  { path: '/kb',             label: 'Knowledge Base',      icon: <BookOpen size={14} /> },
  { path: '/changes',        label: 'Changes',             icon: <Wrench size={14} /> },
  { path: '/releases',       label: 'Releases',            icon: <Package size={14} /> },
  { path: '/deployments',    label: 'Deployments',         icon: <Rocket size={14} /> },
  { path: '/testing/plans',  label: 'Testing',             icon: <CheckCircle2 size={14} /> },
  { path: '/availability',   label: 'Availability',        icon: <Heart size={14} /> },
  { path: '/capacity',       label: 'Capacity',            icon: <Zap size={14} /> },
  { path: '/continuity/bia', label: 'Continuity',          icon: <Lock size={14} /> },
  { path: '/status',         label: 'Status Page',         icon: <CircleDot size={14} /> },
  { path: '/monitoring',     label: 'Monitoring',          icon: <Activity size={14} /> },
  { path: '/dashboards',     label: 'Measurement',         icon: <BarChart3 size={14} /> },
  { path: '/cmdb',           label: 'CMDB',                icon: <Database size={14} />, keywords: ['ci', 'configuration'] },
  { path: '/on-call',        label: 'On-Call',             icon: <Clock size={14} /> },
  { path: '/improvement',    label: 'Improvements',        icon: <Lightbulb size={14} /> },
  { path: '/ai',             label: 'AI Workspace',        icon: <Sparkles size={14} />, keywords: ['ai', 'assistant', 'chat'] },
  { path: '/profile',        label: 'Profile',             icon: <UserCircle size={14} /> },
  { path: '/admin',          label: 'Admin',               icon: <ShieldCheck size={14} />, keywords: ['rbac', 'users', 'roles', 'permissions'] },
  { path: '/settings',       label: 'Settings',            icon: <Settings size={14} /> },
];
// NOTE: keep this list in sync with src/routes/index.tsx when routes change.

interface CmdKPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CmdKPalette: React.FC<CmdKPaletteProps> = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROUTES;
    return ROUTES.filter(r => {
      const hay = (r.label + ' ' + r.path + ' ' + (r.keywords ?? []).join(' ')).toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (active >= results.length) setActive(Math.max(0, results.length - 1));
  }, [results.length, active]);

  if (!open) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[active];
      if (target) {
        navigate(target.path);
        onClose();
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30" aria-hidden />
      <div
        className="relative w-full max-w-[560px] rounded-[12px] bg-white shadow-[0_12px_40px_rgba(16,24,40,0.18)] overflow-hidden"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-ois-border">
          <span className="font-mono text-[11px] text-ois-text-subtle">⌘K</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search routes, jump to…"
            className="flex-1 bg-transparent outline-none text-[15px] text-ois-text placeholder:text-ois-text-subtle"
            aria-label="Search routes"
          />
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-1" role="listbox">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-center text-[13px] text-ois-text-muted">No matches</li>
          ) : (
            results.map((r, i) => (
              <li
                key={r.path}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => { navigate(r.path); onClose(); }}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-2 cursor-pointer text-[13px]',
                  i === active ? 'bg-[rgba(31,79,212,0.06)] text-ois-primary' : 'text-ois-text',
                )}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className={cn('shrink-0', i === active ? 'text-ois-primary' : 'text-ois-text-muted')}>
                    {r.icon}
                  </span>
                  <span className="truncate">Go to <strong>{r.label}</strong></span>
                </span>
                <span className="font-mono text-[10px] text-ois-text-subtle">{r.path}</span>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};
