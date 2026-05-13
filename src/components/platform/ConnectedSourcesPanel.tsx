import React from 'react';
import { ArrowRight, Plug, KeyRound, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { INTEGRATION_META } from './integrationMeta';
import { integrationsService, useResource } from '../../services';
import type { IntegrationDomain } from '../../types/integration';

const DOT: Record<string, string> = {
  healthy: 'bg-ois-success',
  degraded: 'bg-ois-warning',
  error: 'bg-ois-danger',
  pending: 'bg-ois-text-subtle',
};

const relative = (iso?: string) => {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return `${Math.floor(ms / 86_400_000)}d`;
};

interface Props {
  domain: IntegrationDomain;
  variant?: 'rail' | 'card';
  className?: string;
}

export const ConnectedSourcesPanel: React.FC<Props> = ({ domain, variant = 'card', className }) => {
  const { data, loading } = useResource(() => integrationsService.listByDomain(domain), [domain]);
  const items = data ?? [];

  if (loading && !data) {
    return (
      <div className={cn('border border-ois-border rounded-ois-card bg-ois-surface p-4 animate-pulse', className)}>
        <div className="h-3 w-32 bg-ois-surface-muted rounded mb-3" />
        <div className="space-y-2">
          <div className="h-8 bg-ois-surface-muted rounded" />
          <div className="h-8 bg-ois-surface-muted rounded" />
        </div>
      </div>
    );
  }

  if (variant === 'rail') {
    return (
      <div className={cn('border border-ois-border rounded-ois-card overflow-hidden bg-ois-surface', className)}>
        <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted flex items-center justify-between">
          <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Connected Sources</p>
          <Plug size={12} className="text-ois-text-subtle" />
        </div>
        <div className="p-3 space-y-2">
          {items.length === 0 ? (
            <p className="text-xs text-ois-text-muted py-2 text-center">No sources feeding this domain.</p>
          ) : items.map(i => {
            const meta = INTEGRATION_META[i.kind];
            return (
              <div key={i.id} className="flex items-center gap-2.5 text-xs">
                <span className="shrink-0 text-base leading-none">{meta.logo}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT[i.status])} />
                    <span className="font-medium text-ois-text truncate">{meta.label}</span>
                  </div>
                  <p className="text-[10px] text-ois-text-subtle truncate">
                    {i.mode === 'api' ? 'API' : 'Webhook'} · {i.eventCount24h.toLocaleString()} · {relative(i.lastEventAt)}
                  </p>
                </div>
              </div>
            );
          })}
          <Link
            to="/settings"
            className="flex items-center gap-1 text-xs font-medium text-ois-primary hover:underline mt-1 pt-2 border-t border-ois-border"
          >
            Manage integrations <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('border border-ois-border rounded-ois-card bg-ois-surface overflow-hidden', className)}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-ois-border">
        <div>
          <h3 className="text-sm font-semibold text-ois-text flex items-center gap-2">
            <Plug size={14} className="text-ois-primary" />
            Connected sources
          </h3>
          <p className="text-xs text-ois-text-muted mt-0.5">
            External systems supplying data to this dashboard.
          </p>
        </div>
        <Link
          to="/settings"
          className="text-xs font-medium text-ois-primary hover:underline inline-flex items-center gap-1"
        >
          Manage <ArrowRight size={11} />
        </Link>
      </div>
      {items.length === 0 ? (
        <div className="p-6 text-center text-sm text-ois-text-muted">
          No integrations feed this domain yet.{' '}
          <Link to="/settings" className="text-ois-primary font-medium hover:underline">Add one →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y divide-ois-border [&>*]:border-0">
          {items.map(i => {
            const meta = INTEGRATION_META[i.kind];
            return (
              <div key={i.id} className="flex items-start gap-3 px-4 py-3.5 border-b border-r border-ois-border">
                <span className="text-xl shrink-0">{meta.logo}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-ois-text truncate">{i.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('w-1.5 h-1.5 rounded-full', DOT[i.status])} />
                    <span className="text-[11px] text-ois-text-muted capitalize">{i.status}</span>
                    <span className="text-[11px] text-ois-text-subtle">·</span>
                    <span className="text-[11px] text-ois-text-muted inline-flex items-center gap-1">
                      {i.mode === 'api' ? <KeyRound size={9} /> : <Link2 size={9} />}
                      {i.mode === 'api' ? 'API' : 'Webhook'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ois-text-subtle mt-1.5">
                    <span className="font-semibold tabular-nums text-ois-text">{i.eventCount24h.toLocaleString()}</span> events / 24h
                    <span className="mx-1">·</span>
                    last {relative(i.lastEventAt)} ago
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
