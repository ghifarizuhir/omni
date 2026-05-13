import React, { useState } from 'react';
import { Copy, Check, MoreHorizontal, Trash2, Power, RefreshCw, Eye, EyeOff, Link2, KeyRound } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { INTEGRATION_META } from './integrationMeta';
import { integrationsService } from '../../services';
import type { Integration } from '../../types/integration';

const STATUS_STYLES: Record<Integration['status'], { dot: string; label: string; pill: string }> = {
  healthy:  { dot: 'bg-ois-success',     label: 'Healthy',  pill: 'bg-ois-success-pale text-ois-success border-ois-success/20' },
  degraded: { dot: 'bg-ois-warning',     label: 'Degraded', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  error:    { dot: 'bg-ois-danger',      label: 'Error',    pill: 'bg-red-50 text-red-700 border-red-200' },
  pending:  { dot: 'bg-ois-text-subtle', label: 'Pending',  pill: 'bg-ois-surface-muted text-ois-text-muted border-ois-border' },
};

const relative = (iso?: string) => {
  if (!iso) return 'never';
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return 'just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
};

interface Props {
  integration: Integration;
  onToggle: () => void;
  onDelete: () => void;
  onRotate: () => void;
}

export const IntegrationRow: React.FC<Props> = ({ integration: i, onToggle, onDelete, onRotate }) => {
  const [expanded, setExpanded] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const meta = INTEGRATION_META[i.kind];
  const status = STATUS_STYLES[i.status];
  const url = i.webhookPath ? integrationsService.webhookUrl(i.webhookPath) : '';

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className={cn(
        'border border-ois-border rounded-ois-card bg-ois-surface overflow-hidden transition',
        !i.enabled && 'opacity-70',
        expanded && 'shadow-ois-card'
      )}
    >
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-ois-surface-muted/30 transition"
      >
        <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-ois-surface-muted border border-ois-border text-xl">
          {meta.logo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-ois-text">{i.name}</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border',
                status.pill
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
              {status.label}
            </span>
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded-full border uppercase tracking-wider',
                i.mode === 'api'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-ois-primary-pale text-ois-primary border-ois-primary/20'
              )}
            >
              {i.mode === 'api' ? <><KeyRound size={9} className="inline -mt-0.5 mr-0.5" />API</> : <><Link2 size={9} className="inline -mt-0.5 mr-0.5" />Webhook</>}
            </span>
            {i.domains.map(d => (
              <span key={d} className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border bg-ois-bg text-ois-text-muted border-ois-border">
                {d}
              </span>
            ))}
          </div>
          <p className="text-xs text-ois-text-muted mt-0.5 truncate">
            {i.mode === 'api'
              ? `${i.apiBaseUrl} · polled every ${i.pollIntervalSec ?? 60}s`
              : (i.webhookPath ?? '—')}
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end shrink-0 text-right">
          <span className="text-sm font-bold tabular-nums text-ois-text">{i.eventCount24h.toLocaleString()}</span>
          <span className="text-[10px] text-ois-text-subtle uppercase tracking-wider">events · 24h</span>
          <span className="text-[11px] text-ois-text-muted mt-1">last {relative(i.lastEventAt)}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 pt-1 border-t border-ois-border bg-ois-surface-muted/20 space-y-4">
          {i.errorMessage && (
            <div className="text-xs px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700">
              {i.errorMessage}
            </div>
          )}

          {i.mode === 'webhook' && i.webhookPath && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Webhook URL</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 min-w-0 px-3 py-2 text-xs font-mono border border-ois-border rounded-lg bg-white text-ois-text truncate">
                    {url}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => handleCopy(url)} className="shrink-0 gap-1.5">
                    {copied ? <><Check size={12} className="text-ois-success" /> Copied</> : <><Copy size={12} /> Copy</>}
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Signing secret</label>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 min-w-0 px-3 py-2 text-xs font-mono border border-ois-border rounded-lg bg-white text-ois-text truncate">
                    {showSecret ? (i.webhookSecret ?? '—') : '••••••••••••••••••••••••••'}
                  </code>
                  <Button variant="outline" size="sm" onClick={() => setShowSecret(s => !s)} className="shrink-0 gap-1.5">
                    {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={onRotate} className="shrink-0 gap-1.5">
                    <RefreshCw size={12} /> Rotate
                  </Button>
                </div>
                <p className="text-[11px] text-ois-text-muted mt-1.5">
                  Source: payload format <span className="font-mono text-ois-text">{i.payloadFormat}</span>.
                  Required header: <span className="font-mono text-ois-text">X-OIS-Signature</span> (HMAC-SHA256).
                </p>
              </div>
            </div>
          )}

          {i.mode === 'api' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <KV label="Environment" value={i.apiBaseUrl ?? '—'} mono />
              <KV label="API token" value={i.apiTokenMasked ?? '—'} mono />
              <KV label="Poll interval" value={`${i.pollIntervalSec ?? 60}s`} />
              <KV label="Created" value={`${i.createdAt} by ${i.createdBy}`} />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-ois-border">
            <div className="text-[11px] text-ois-text-muted">
              Created {i.createdAt} by {i.createdBy}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onToggle} className="gap-1.5">
                <Power size={12} /> {i.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} className="text-ois-danger hover:bg-red-50 gap-1.5">
                <Trash2 size={12} /> Remove
              </Button>
              <Button variant="ghost" size="sm" className="text-ois-text-muted">
                <MoreHorizontal size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KV: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</p>
    <p className={cn('text-xs text-ois-text mt-0.5 truncate', mono && 'font-mono')}>{value}</p>
  </div>
);
