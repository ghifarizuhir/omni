import React, { useMemo, useState } from 'react';
import { Check, Copy, Link2, KeyRound, Globe, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { INTEGRATION_META } from './integrationMeta';
import { integrationsService } from '../../services';
import type { Integration, IntegrationDomain, IntegrationKind } from '../../types/integration';

type Step = 'pick' | 'configure' | 'review';

const DOMAINS: { id: IntegrationDomain; label: string; desc: string }[] = [
  { id: 'monitoring',   label: 'Monitoring',   desc: 'Surface alerts in the events stream and routing.' },
  { id: 'availability', label: 'Availability', desc: 'Feed uptime probes and outage data.' },
  { id: 'capacity',     label: 'Capacity',     desc: 'Feed resource utilization & saturation metrics.' },
];

const KIND_ORDER: IntegrationKind[] = ['dynatrace', 'kibana', 'grafana', 'datadog', 'prometheus', 'newrelic', 'cloudwatch', 'custom'];

const randomSlug = () => Math.random().toString(36).slice(2, 8);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (integration: Integration) => void;
}

export const AddIntegrationModal: React.FC<Props> = ({ isOpen, onClose, onCreate }) => {
  const [step, setStep] = useState<Step>('pick');
  const [kind, setKind] = useState<IntegrationKind>('kibana');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'webhook' | 'api'>('webhook');
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [domains, setDomains] = useState<IntegrationDomain[]>(['monitoring']);
  const [copied, setCopied] = useState<'url' | 'secret' | null>(null);

  // Stable per-session values so re-render of the modal doesn't shuffle them.
  const generated = useMemo(() => ({
    path: `/api/v1/hooks/in/${kind}-${randomSlug()}`,
    secret: `whk_${Array.from({ length: 32 }, () => Math.random().toString(36)[2] ?? 'a').join('')}_${randomSlug()}`,
  }), [kind, isOpen]);

  const meta = INTEGRATION_META[kind];

  const reset = () => {
    setStep('pick');
    setKind('kibana');
    setName('');
    setMode('webhook');
    setApiBaseUrl('');
    setApiToken('');
    setDomains(['monitoring']);
    setCopied(null);
  };

  const handleClose = () => { reset(); onClose(); };

  const pickKind = (k: IntegrationKind) => {
    setKind(k);
    setMode(INTEGRATION_META[k].defaultMode);
    setName(`${INTEGRATION_META[k].label} integration`);
    setStep('configure');
  };

  const toggleDomain = (d: IntegrationDomain) =>
    setDomains(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);

  const handleCopy = (text: string, which: 'url' | 'secret') => {
    void navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  const handleCreate = () => {
    const now = new Date().toISOString();
    const integration: Integration = {
      id: `intg-${Date.now()}`,
      name: name || `${meta.label} integration`,
      kind,
      mode,
      status: 'pending',
      domains: domains.length > 0 ? domains : ['monitoring'],
      enabled: true,
      eventCount24h: 0,
      createdAt: now.slice(0, 10),
      createdBy: 'sarah.chen',
      ...(mode === 'webhook'
        ? {
            webhookPath: generated.path,
            webhookSecret: generated.secret,
            payloadFormat: (kind === 'kibana' || kind === 'grafana' || kind === 'datadog')
              ? kind : 'generic',
          }
        : {
            apiBaseUrl,
            apiTokenMasked: apiToken ? `${apiToken.slice(0, 8)}····${apiToken.slice(-4)}` : 'dt0c01.····',
            pollIntervalSec: 60,
          }),
    };
    onCreate(integration);
    handleClose();
  };

  const fullWebhookUrl = integrationsService.webhookUrl(generated.path);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add integration" size="lg">
      {/* Stepper */}
      <div className="flex items-center gap-2 py-4 mb-2 border-b border-ois-border -mx-6 px-6">
        {(['pick', 'configure', 'review'] as Step[]).map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={cn(
                'flex items-center gap-2 text-xs font-medium',
                step === s ? 'text-ois-primary' :
                (['pick', 'configure', 'review'].indexOf(step) > i) ? 'text-ois-success' : 'text-ois-text-subtle'
              )}
            >
              <span
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full border tabular-nums text-[10px] font-bold',
                  step === s ? 'border-ois-primary bg-ois-primary-pale text-ois-primary' :
                  (['pick', 'configure', 'review'].indexOf(step) > i)
                    ? 'border-ois-success bg-ois-success-pale text-ois-success'
                    : 'border-ois-border text-ois-text-subtle'
                )}
              >
                {(['pick', 'configure', 'review'].indexOf(step) > i) ? <Check size={11} /> : i + 1}
              </span>
              {s === 'pick' ? 'Choose source' : s === 'configure' ? 'Configure' : 'Review & enable'}
            </div>
            {i < 2 && <div className="flex-1 h-px bg-ois-border" />}
          </React.Fragment>
        ))}
      </div>

      {/* Body */}
      <div className="py-4">
        {step === 'pick' && (
          <div>
            <p className="text-sm text-ois-text-muted mb-4">
              Pick the source system. <span className="font-medium text-ois-text">Dynatrace</span> connects via API; everything
              else uses a unique webhook URL OIS exposes for you.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {KIND_ORDER.map(k => {
                const m = INTEGRATION_META[k];
                return (
                  <button
                    key={k}
                    onClick={() => pickKind(k)}
                    className="group flex items-start gap-3 p-4 text-left border border-ois-border rounded-ois-card bg-ois-surface hover:border-ois-primary hover:shadow-ois-card transition"
                  >
                    <span className="text-2xl">{m.logo}</span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-ois-text">{m.label}</span>
                        <span
                          className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded-full border uppercase tracking-wider',
                            m.defaultMode === 'api'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-ois-primary-pale text-ois-primary border-ois-primary/20'
                          )}
                        >
                          {m.defaultMode === 'api' ? 'API' : 'Webhook'}
                        </span>
                      </span>
                      <span className="block text-xs text-ois-text-muted mt-0.5">{m.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 'configure' && (
          <div className="space-y-5">
            <div>
              <label className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Display name</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="mt-1.5 w-full px-3 py-2 text-sm border border-ois-border rounded-lg bg-ois-surface focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
                placeholder={`${meta.label} integration`}
              />
            </div>

            {kind === 'dynatrace' ? (
              <>
                <div className="border border-ois-border rounded-ois-card p-4 bg-ois-surface-muted/40 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-ois-text">
                    <KeyRound size={13} className="text-ois-primary" /> Dynatrace API connection
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Environment URL</label>
                    <input
                      value={apiBaseUrl}
                      onChange={e => setApiBaseUrl(e.target.value)}
                      placeholder="https://<tenant>.live.dynatrace.com"
                      className="mt-1.5 w-full px-3 py-2 text-sm font-mono border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">API token</label>
                    <input
                      value={apiToken}
                      onChange={e => setApiToken(e.target.value)}
                      placeholder="dt0c01.XXXX.YYYY"
                      type="password"
                      className="mt-1.5 w-full px-3 py-2 text-sm font-mono border border-ois-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary"
                    />
                    <p className="text-[11px] text-ois-text-muted mt-1.5">
                      Needs scopes: <span className="font-mono">entities.read</span>,
                      <span className="font-mono"> problems.read</span>,
                      <span className="font-mono"> metrics.read</span>.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="border border-ois-border rounded-ois-card p-4 bg-ois-surface-muted/40 space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-ois-text">
                  <Globe size={13} className="text-ois-primary" /> Webhook receiver
                </div>
                <p className="text-xs text-ois-text-muted">
                  OIS will generate a unique URL for this source. Configure your
                  <span className="font-medium text-ois-text"> {meta.label}</span> alerting to POST JSON to it. The full URL and signing
                  secret are shown on the next step.
                </p>
                <div className="flex items-center gap-2 text-[11px] font-mono px-3 py-2 bg-white border border-dashed border-ois-border rounded-lg text-ois-text-muted truncate">
                  <Link2 size={12} className="shrink-0 text-ois-text-subtle" />
                  {fullWebhookUrl}
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-2">Feed these OIS domains</p>
              <div className="grid grid-cols-3 gap-2">
                {DOMAINS.map(d => {
                  const on = domains.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleDomain(d.id)}
                      className={cn(
                        'text-left border rounded-ois-card p-3 transition',
                        on
                          ? 'border-ois-primary bg-ois-primary-pale'
                          : 'border-ois-border bg-ois-surface hover:bg-ois-surface-muted'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span
                          className={cn(
                            'w-3.5 h-3.5 rounded-[4px] border flex items-center justify-center',
                            on ? 'bg-ois-primary border-ois-primary' : 'border-ois-border'
                          )}
                        >
                          {on && <Check size={9} className="text-white" />}
                        </span>
                        <span className="text-xs font-semibold text-ois-text">{d.label}</span>
                      </div>
                      <span className="text-[11px] text-ois-text-muted block leading-snug">{d.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 border border-ois-border rounded-ois-card bg-ois-surface">
              <span className="text-2xl">{meta.logo}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ois-text">{name || `${meta.label} integration`}</p>
                <p className="text-xs text-ois-text-muted">
                  {meta.label} · {mode === 'api' ? 'API pull' : 'Webhook push'} · feeds {domains.join(', ') || 'monitoring'}
                </p>
              </div>
            </div>

            {mode === 'webhook' ? (
              <>
                <CopyField
                  label="Webhook URL"
                  value={fullWebhookUrl}
                  copied={copied === 'url'}
                  onCopy={() => handleCopy(fullWebhookUrl, 'url')}
                />
                <CopyField
                  label="Signing secret"
                  value={generated.secret}
                  copied={copied === 'secret'}
                  onCopy={() => handleCopy(generated.secret, 'secret')}
                  hint="Configure your source to send this as an HTTP header (X-OIS-Signature). Stored hashed — won't be shown again."
                />
              </>
            ) : (
              <div className="space-y-3">
                <CopyField label="Environment URL" value={apiBaseUrl || '—'} copied={false} onCopy={() => {}} />
                <div className="p-3 bg-ois-success-pale/30 border border-ois-success/20 rounded-ois-card text-xs text-ois-text">
                  <span className="font-semibold text-ois-success">Token verified.</span> OIS will poll every 60s for problems, host
                  metrics, and synthetic monitor results.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="-mx-6 px-6 pt-3 pb-4 border-t border-ois-border flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleClose}>Cancel</Button>
        <div className="flex gap-2">
          {step !== 'pick' && (
            <Button variant="outline" size="sm" onClick={() => setStep(step === 'review' ? 'configure' : 'pick')}>
              Back
            </Button>
          )}
          {step === 'configure' && (
            <Button variant="primary" size="sm" onClick={() => setStep('review')} className="gap-1.5">
              Continue <ArrowRight size={13} />
            </Button>
          )}
          {step === 'review' && (
            <Button variant="primary" size="sm" onClick={handleCreate}>
              Enable integration
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

const CopyField: React.FC<{
  label: string; value: string; copied: boolean; onCopy: () => void; hint?: string;
}> = ({ label, value, copied, onCopy, hint }) => (
  <div>
    <label className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</label>
    <div className="mt-1.5 flex items-center gap-2">
      <code className="flex-1 min-w-0 px-3 py-2 text-xs font-mono border border-ois-border rounded-lg bg-ois-surface-muted/40 text-ois-text truncate">
        {value}
      </code>
      <Button variant="outline" size="sm" onClick={onCopy} className="shrink-0 gap-1.5">
        {copied ? <><Check size={12} className="text-ois-success" /> Copied</> : <><Copy size={12} /> Copy</>}
      </Button>
    </div>
    {hint && <p className="text-[11px] text-ois-text-muted mt-1.5">{hint}</p>}
  </div>
);
