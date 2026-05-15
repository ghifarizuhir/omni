import React, { useState } from 'react';
import { Camera, Plus, Trash2, AlertTriangle, Mail, Phone, MessageSquare, User, Bell, KeyRound, Palette, Plug, Webhook, Activity, ShieldCheck, AlertOctagon } from 'lucide-react';
import { AppearanceSettings } from '../../components/platform/AppearanceSettings';
import { AddIntegrationModal } from '../../components/platform/AddIntegrationModal';
import { IntegrationRow } from '../../components/platform/IntegrationRow';
import { integrationsService, notificationsService, usersService, apiTokensService, userChannelsService, useResource } from '../../services';
import type { ApiTokenSummary } from '../../services';
import type { Integration } from '../../types/integration';
import { ProfileForm } from '../../components/platform/ProfileForm';
import { APITokenRow } from '../../components/platform/APITokenRow';
import type { APIToken } from '../../components/platform/APITokenRow';
import { GenerateTokenModal } from '../../components/platform/GenerateTokenModal';
import { QuietHoursForm } from '../../components/platform/QuietHoursForm';
import { PreferencesTable } from '../../components/platform/PreferencesTable';
import type { NotificationPreference, QuietHoursConfig } from '../../types/platform';
import { Button } from '../../components/ui/Button';
import { cn } from '../../lib/utils';

// ── Types ─────────────────────────────────────────────────────────────────────

type PanelId = 'profile' | 'notifications' | 'api-tokens' | 'appearance' | 'integrations';

const NAV_SECTIONS: Array<{
  heading: string;
  items: Array<{ label: string; panel: PanelId; icon: React.ReactNode }>;
}> = [
  {
    heading: 'Account',
    items: [
      { label: 'Profile',       panel: 'profile',        icon: <User size={14} /> },
      { label: 'Notifications', panel: 'notifications',  icon: <Bell size={14} /> },
      { label: 'API tokens',    panel: 'api-tokens',     icon: <KeyRound size={14} /> },
    ],
  },
  {
    heading: 'Workspace',
    items: [
      { label: 'Appearance',   panel: 'appearance',    icon: <Palette size={14} /> },
      { label: 'Integrations', panel: 'integrations',  icon: <Plug size={14} /> },
    ],
  },
];

// ── Panel sub-components ──────────────────────────────────────────────────────

const PanelHeader: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="mb-8">
    <h2 className="text-base font-bold text-ois-text tracking-tight">{title}</h2>
    <p className="text-sm text-ois-text-muted mt-0.5">{description}</p>
  </div>
);

const SectionBlock: React.FC<{ title: string; description?: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title, description, children, action,
}) => (
  <div className="space-y-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
        {description && <p className="text-xs text-ois-text-muted mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

// ── Profile panel ─────────────────────────────────────────────────────────────

const ProfilePanel: React.FC = () => {
  const { data: user, refresh: refetchUser } = useResource(() => usersService.current(), []);
  const [dangerAlert, setDangerAlert] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '—';

  return (
    <div className="max-w-2xl space-y-10">
      <PanelHeader title="Profile" description="Manage your personal information and display preferences." />

      {/* Avatar + identity */}
      <SectionBlock title="Identity">
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            <div className="w-16 h-16 rounded-full bg-ois-primary flex items-center justify-center text-white text-xl font-bold select-none overflow-hidden">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                : initials}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-ois-text leading-tight">{user?.name ?? '—'}</p>
            <p className="text-sm text-ois-text-muted">
              {user?.title ?? '—'}{user?.team ? <> · {user.team}</> : null}
            </p>
            <p className="text-xs text-ois-text-muted mt-1">{user?.email ?? '—'}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 gap-1.5 text-xs -ml-2"
              disabled
              title="Photo upload is coming soon. Ask your administrator to update your avatar in the meantime."
            >
              <Camera size={12} /> Change photo
            </Button>
          </div>
        </div>
      </SectionBlock>

      {/* Profile form */}
      <SectionBlock title="Profile information" description="Update your display name, role, and contact preferences.">
        <ProfileForm
          key={user?.id ?? 'loading'}
          initialValues={{
            name:     user?.name ?? '',
            title:    user?.title ?? '',
            team:     user?.team ?? '',
            timezone: user?.timezone ?? '',
            language: user?.language ?? '',
            manager:  user?.manager?.name ?? '',
            bio:      user?.bio ?? '',
          }}
          onSaved={() => refetchUser()}
        />
      </SectionBlock>

      {/* Danger zone */}
      <div className="border border-red-200 rounded-ois-card p-5 bg-red-50/50">
        <p className="text-sm font-bold text-red-700 mb-1">Danger zone</p>
        <p className="text-xs text-red-600 mb-4">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        {dangerAlert && (
          <div className="flex items-start gap-2 p-3 mb-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            Account deletion is managed by your organization admin. Please contact your IT administrator.
          </div>
        )}
        <Button variant="destructive" size="sm" onClick={() => setDangerAlert(true)}>
          Delete my account
        </Button>
      </div>
    </div>
  );
};

// ── Notifications panel ───────────────────────────────────────────────────────

const NotificationsPanel: React.FC = () => {
  const { data: prefData } = useResource(() => notificationsService.preferences(), []);
  const { data: quietData } = useResource(() => notificationsService.quietHours(), []);
  const { data: channels, refresh: refetchChannels } = useResource(() => userChannelsService.list(), []);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [quietHours, setQuietHours] = useState<QuietHoursConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [emailAddr, setEmailAddr] = useState('');
  const [smsAddr, setSmsAddr] = useState('');
  const [slackAddr, setSlackAddr] = useState('');

  React.useEffect(() => { if (prefData) setPreferences(prefData); }, [prefData]);
  React.useEffect(() => { if (quietData) setQuietHours(quietData); }, [quietData]);
  React.useEffect(() => {
    if (channels) {
      setEmailAddr(channels.find(c => c.kind === 'email')?.address ?? '');
      setSmsAddr(channels.find(c => c.kind === 'sms')?.address ?? '');
      setSlackAddr(channels.find(c => c.kind === 'slack')?.address ?? '');
    }
  }, [channels]);

  const handleSavePrefs = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChannelBlur = async (kind: 'email' | 'sms' | 'slack', address: string) => {
    if (!address) return;
    await userChannelsService.upsert(kind, address);
    refetchChannels();
  };

  return (
    <div className="max-w-3xl space-y-10">
      <PanelHeader title="Notifications" description="Control how and when OIS notifies you." />

      <SectionBlock title="Quiet hours" description="Suppress non-urgent notifications during the hours you specify.">
        <div className="border border-ois-border rounded-ois-card p-5 bg-ois-surface">
          {quietHours && <QuietHoursForm initial={quietHours} onSave={setQuietHours} />}
        </div>
      </SectionBlock>

      <SectionBlock
        title="Topic notifications"
        description="Choose which channels to use for each notification type."
        action={saved ? <span className="text-xs text-ois-success font-medium">Saved</span> : undefined}
      >
        <PreferencesTable preferences={preferences} onChange={setPreferences} onSave={handleSavePrefs} />
      </SectionBlock>

      <SectionBlock title="Connected channels" description="Where OIS delivers your notifications.">
        <div className="border border-ois-border rounded-ois-card overflow-hidden bg-ois-surface">
          {([
            { Icon: Mail,          label: 'Email', kind: 'email' as const, value: emailAddr, setValue: setEmailAddr },
            { Icon: Phone,         label: 'SMS',   kind: 'sms'   as const, value: smsAddr,   setValue: setSmsAddr   },
            { Icon: MessageSquare, label: 'Slack', kind: 'slack' as const, value: slackAddr, setValue: setSlackAddr },
          ]).map(({ Icon, label, kind, value, setValue }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5 border-b border-ois-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-ois-surface-muted flex items-center justify-center text-ois-text-muted">
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</p>
                  <input
                    className="text-sm text-ois-text font-medium bg-transparent border-none outline-none focus:underline"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    onBlur={() => handleChannelBlur(kind, value)}
                    placeholder="Not set"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
};

// ── API Tokens panel ──────────────────────────────────────────────────────────

const APITokensPanel: React.FC = () => {
  const { data: tokenData, refresh: refetchTokens } = useResource(() => apiTokensService.list(), []);
  const [showGenModal, setShowGenModal] = useState(false);

  const tokens: APIToken[] = (tokenData ?? []).map((t: ApiTokenSummary) => ({
    id: t.id,
    name: t.name,
    createdAt: t.createdAt.split('T')[0],
    lastUsed: t.lastUsedAt ? new Date(t.lastUsedAt).toLocaleDateString() : 'Never',
    scope: t.prefix,
  }));

  const handleRevoke = async (id: string) => {
    await apiTokensService.revoke(id);
    refetchTokens();
  };
  const handleRevokeAll = async () => {
    for (const t of tokens) {
      await apiTokensService.revoke(t.id);
    }
    refetchTokens();
  };
  const handleGenerated = async (name: string, _scope: string) => {
    await apiTokensService.create(name);
    refetchTokens();
  };

  return (
    <div className="max-w-2xl space-y-8">
      <PanelHeader title="API Tokens" description="Tokens you've generated to access the OIS API." />

      <SectionBlock
        title="Active tokens"
        action={
          <div className="flex gap-2">
            {tokens.length > 0 && (
              <Button variant="ghost" size="sm" className="text-ois-danger hover:bg-red-50 gap-1.5" onClick={handleRevokeAll}>
                <Trash2 size={12} /> Revoke all
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowGenModal(true)}>
              <Plus size={13} /> Generate new token
            </Button>
          </div>
        }
      >
        {tokens.length === 0 ? (
          <div className="py-10 text-center text-sm text-ois-text-muted border border-dashed border-ois-border rounded-ois-card">
            No active tokens. Generate one to get started.
          </div>
        ) : (
          <div className="border border-ois-border rounded-ois-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-ois-surface-muted border-b border-ois-border">
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-ois-text-muted">Name</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-ois-text-muted">Created</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-ois-text-muted">Last used</th>
                  <th className="text-left py-2.5 px-4 text-xs font-semibold text-ois-text-muted">Scope</th>
                  <th className="py-2.5 px-4" />
                </tr>
              </thead>
              <tbody>
                {tokens.map(token => (
                  <APITokenRow key={token.id} token={token} onRevoke={() => handleRevoke(token.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionBlock>

      <GenerateTokenModal isOpen={showGenModal} onClose={() => setShowGenModal(false)} onGenerated={handleGenerated} />
    </div>
  );
};

// ── Integrations panel ────────────────────────────────────────────────────────

const IntegrationStat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode; tone?: string }> = ({
  icon, label, value, tone,
}) => (
  <div className="flex-1 min-w-[140px] flex items-start gap-3 px-4 py-3 border border-ois-border rounded-ois-card bg-ois-surface">
    <span className={cn('mt-0.5', tone ?? 'text-ois-text-subtle')}>{icon}</span>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</p>
      <p className={cn('text-lg font-bold tabular-nums leading-tight', tone ?? 'text-ois-text')}>{value}</p>
    </div>
  </div>
);

const IntegrationsPanel: React.FC = () => {
  const { data, loading, refresh } = useResource(() => integrationsService.list(), []);
  const [showAdd, setShowAdd] = useState(false);
  const integrations: Integration[] = data ?? [];

  const total = integrations.length;
  const healthy = integrations.filter(i => i.enabled && i.status === 'healthy').length;
  const issues = integrations.filter(i => i.enabled && (i.status === 'error' || i.status === 'degraded')).length;
  const events24h = integrations.reduce((sum, i) => sum + (i.enabled ? i.eventCount24h : 0), 0);
  const webhooks = integrations.filter(i => i.mode === 'webhook').length;
  const apis = integrations.filter(i => i.mode === 'api').length;

  const handleCreate = async (i: Integration) => {
    await integrationsService.create(i);
    refresh();
  };
  const handleToggle = async (id: string) => {
    await integrationsService.toggle(id);
    refresh();
  };
  const handleDelete = async (id: string) => {
    await integrationsService.remove(id);
    refresh();
  };
  const handleRotate = async (id: string) => {
    await integrationsService.rotateSecret(id);
    refresh();
  };

  return (
    <div className="max-w-4xl space-y-8">
      <PanelHeader
        title="Integrations"
        description="Connect external monitoring & observability systems. Dynatrace uses an API token; everything else receives a unique webhook URL that OIS exposes."
      />

      {/* Stats strip */}
      <div className="flex flex-wrap gap-3">
        <IntegrationStat icon={<Plug size={15} />} label="Sources" value={total} />
        <IntegrationStat
          icon={<ShieldCheck size={15} />}
          label="Healthy"
          value={`${healthy}/${integrations.filter(i => i.enabled).length}`}
          tone={healthy === integrations.filter(i => i.enabled).length ? 'text-ois-success' : 'text-ois-text'}
        />
        <IntegrationStat
          icon={<AlertOctagon size={15} />}
          label="Needs attention"
          value={issues}
          tone={issues > 0 ? 'text-ois-warning' : 'text-ois-text-subtle'}
        />
        <IntegrationStat icon={<Activity size={15} />} label="Events · 24h" value={events24h.toLocaleString()} />
        <IntegrationStat icon={<Webhook size={15} />} label="Mode mix" value={<span className="text-ois-text">{webhooks}<span className="text-ois-text-subtle text-xs"> webhook</span> · {apis}<span className="text-ois-text-subtle text-xs"> api</span></span>} />
      </div>

      <SectionBlock
        title="Connected sources"
        description="Each integration shows where it feeds in OIS: Monitoring, Availability, or Capacity."
        action={
          <Button variant="primary" size="sm" className="gap-1.5" onClick={() => setShowAdd(true)}>
            <Plus size={13} /> Add integration
          </Button>
        }
      >
        {loading && !data ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 rounded-ois-card border border-ois-border bg-ois-surface animate-pulse" />
            ))}
          </div>
        ) : integrations.length === 0 ? (
          <div className="py-10 text-center text-sm text-ois-text-muted border border-dashed border-ois-border rounded-ois-card">
            No integrations yet. Add one to start ingesting alerts.
          </div>
        ) : (
          <div className="space-y-3">
            {integrations.map(i => (
              <IntegrationRow
                key={i.id}
                integration={i}
                onToggle={() => handleToggle(i.id)}
                onDelete={() => handleDelete(i.id)}
                onRotate={() => handleRotate(i.id)}
              />
            ))}
          </div>
        )}
      </SectionBlock>

      <AddIntegrationModal isOpen={showAdd} onClose={() => setShowAdd(false)} onCreate={handleCreate} />
    </div>
  );
};

// ── Panel map ─────────────────────────────────────────────────────────────────

const PANELS: Record<PanelId, React.ReactNode> = {
  'profile':      <ProfilePanel />,
  'notifications': <NotificationsPanel />,
  'api-tokens':   <APITokensPanel />,
  'appearance':   (
    <div className="max-w-2xl space-y-8">
      <PanelHeader title="Appearance" description="Customize the look and feel of OIS to match your workflow." />
      <AppearanceSettings />
    </div>
  ),
  'integrations': <IntegrationsPanel />,
};

// ── Settings page ─────────────────────────────────────────────────────────────

export const Settings: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelId>('profile');

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Page header */}
      <div className="shrink-0 border-b border-ois-border bg-ois-surface px-8 py-5">
        <h1 className="text-xl font-bold text-ois-text tracking-tight">Settings</h1>
        <p className="text-sm text-ois-text-muted mt-0.5">
          Manage your workspace preferences, integrations, and account options.
        </p>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left nav — fixed height, never scrolls */}
        <aside className="w-52 shrink-0 border-r border-ois-border bg-ois-surface flex flex-col py-6 px-3 space-y-6">
          {NAV_SECTIONS.map(section => (
            <div key={section.heading}>
              <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest px-3 mb-1.5">
                {section.heading}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(item => (
                  <li key={item.label}>
                    <button
                      onClick={() => setActivePanel(item.panel)}
                      className={cn(
                        'relative flex items-center gap-2.5 w-full text-left px-3 py-2 text-sm rounded-lg transition-colors',
                        activePanel === item.panel
                          ? 'bg-ois-primary-pale text-ois-primary font-medium'
                          : 'text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text'
                      )}
                    >
                      {/* Active indicator bar */}
                      {activePanel === item.panel && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-ois-primary rounded-full" />
                      )}
                      <span className={activePanel === item.panel ? 'text-ois-primary' : 'text-ois-text-subtle'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {/* Panel content — scrollable, sits on page bg for depth */}
        <main className="flex-1 overflow-y-auto bg-ois-bg px-10 py-8">
          {PANELS[activePanel]}
        </main>
      </div>
    </div>
  );
};

export default Settings;
