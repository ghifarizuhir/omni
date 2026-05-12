import React, { useState } from 'react';
import { Camera, Plus, Trash2, AlertTriangle, Mail, Phone, MessageSquare, User, Bell, KeyRound, Palette, Plug } from 'lucide-react';
import { AppearanceSettings } from '../../components/platform/AppearanceSettings';
import { IntegrationCard } from '../../components/platform/IntegrationCard';
import { ProfileForm } from '../../components/platform/ProfileForm';
import { APITokenRow } from '../../components/platform/APITokenRow';
import type { APIToken } from '../../components/platform/APITokenRow';
import { GenerateTokenModal } from '../../components/platform/GenerateTokenModal';
import { QuietHoursForm } from '../../components/platform/QuietHoursForm';
import { PreferencesTable } from '../../components/platform/PreferencesTable';
import { mockNotificationPreferences, mockQuietHours } from '../../mocks/notificationPreferences';
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

const SARAH_CHEN = {
  name: 'Sarah Chen',
  title: 'Platform Engineering Manager',
  team: 'Platform Engineering',
  timezone: 'America/New_York',
  language: 'en',
  manager: 'Helena Vasquez',
  bio: 'Sarah oversees platform reliability for Acme Corp. Joined 2023.',
};

const ProfilePanel: React.FC = () => {
  const [dangerAlert, setDangerAlert] = useState(false);

  return (
    <div className="max-w-2xl space-y-10">
      <PanelHeader title="Profile" description="Manage your personal information and display preferences." />

      {/* Avatar + identity */}
      <SectionBlock title="Identity">
        <div className="flex items-start gap-5">
          <div className="shrink-0">
            <div className="w-16 h-16 rounded-full bg-ois-primary flex items-center justify-center text-white text-xl font-bold select-none">
              SC
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-ois-text leading-tight">{SARAH_CHEN.name}</p>
            <p className="text-sm text-ois-text-muted">{SARAH_CHEN.title} · {SARAH_CHEN.team}</p>
            <p className="text-xs text-ois-text-muted mt-1">sarah.chen@acme.io</p>
            <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-xs -ml-2">
              <Camera size={12} /> Change photo
            </Button>
          </div>
        </div>
      </SectionBlock>

      {/* Profile form */}
      <SectionBlock title="Profile information" description="Update your display name, role, and contact preferences.">
        <ProfileForm initialValues={SARAH_CHEN} />
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
  const [preferences, setPreferences] = useState<NotificationPreference[]>(mockNotificationPreferences);
  const [quietHours, setQuietHours] = useState<QuietHoursConfig>(mockQuietHours);
  const [saved, setSaved] = useState(false);

  const handleSavePrefs = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl space-y-10">
      <PanelHeader title="Notifications" description="Control how and when OIS notifies you." />

      <SectionBlock title="Quiet hours" description="Suppress non-urgent notifications during the hours you specify.">
        <div className="border border-ois-border rounded-ois-card p-5 bg-ois-surface">
          <QuietHoursForm initial={quietHours} onSave={setQuietHours} />
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
          {[
            { Icon: Mail,         label: 'Email',  value: 'sarah.chen@acmecorp.io' },
            { Icon: Phone,        label: 'SMS',    value: '+1 (415) 555-0192' },
            { Icon: MessageSquare, label: 'Slack', value: '@sarah.chen · #ois-alerts' },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5 border-b border-ois-border last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-ois-surface-muted flex items-center justify-center text-ois-text-muted">
                  <Icon size={14} />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{label}</p>
                  <p className="text-sm text-ois-text font-medium">{value}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
};

// ── API Tokens panel ──────────────────────────────────────────────────────────

const INITIAL_TOKENS: APIToken[] = [
  { id: 'tok-001', name: 'OIS API Token (default)', createdAt: '2026-01-15', lastUsed: '5m ago',    scope: 'read:all write:all' },
  { id: 'tok-002', name: 'Claude Code',             createdAt: '2026-03-02', lastUsed: '2 days ago', scope: 'read:all' },
];

const APITokensPanel: React.FC = () => {
  const [tokens, setTokens] = useState<APIToken[]>(INITIAL_TOKENS);
  const [showGenModal, setShowGenModal] = useState(false);

  const handleRevoke = (id: string) => setTokens(prev => prev.filter(t => t.id !== id));
  const handleRevokeAll = () => setTokens([]);
  const handleGenerated = (name: string, scope: string) => {
    setTokens(prev => [...prev, {
      id: `tok-${Date.now()}`, name,
      createdAt: new Date().toISOString().split('T')[0],
      lastUsed: 'Never', scope,
    }]);
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

const noop = () => {};

const INTEGRATIONS = [
  {
    name: 'Slack', logo: '💬', connected: true,
    details: ['Workspace: Acme Corp (acme.slack.com)', 'Channels: #incidents, #payment-engineering, #platform-oncall'],
    actions: [
      { label: 'Test connection', handler: noop, variant: 'outline' as const },
      { label: 'Disconnect',      handler: noop, variant: 'ghost' as const },
    ],
  },
  {
    name: 'PagerDuty', logo: '🔔', connected: false,
    description: 'Connect PagerDuty to sync on-call schedules and escalation policies with OIS.',
    details: [],
    actions: [{ label: 'Connect PagerDuty', handler: noop, variant: 'primary' as const }],
  },
  {
    name: 'GitHub', logo: '🐙', connected: true,
    details: ['Organization: acme-corp', 'Repositories: 12 · Pipelines: 5'],
    actions: [
      { label: 'Manage repos', handler: noop, variant: 'outline' as const },
      { label: 'Disconnect',   handler: noop, variant: 'ghost' as const },
    ],
  },
  {
    name: 'Prometheus', logo: '📊', connected: true,
    details: ['Endpoint: https://prometheus.acme.io', 'Last scraped: 2m ago · Rules: 12'],
    actions: [
      { label: 'Test connection', handler: noop, variant: 'outline' as const },
      { label: 'Edit config',     handler: noop, variant: 'ghost' as const },
    ],
  },
];

const IntegrationsPanel: React.FC = () => (
  <div className="max-w-2xl space-y-8">
    <PanelHeader title="Integrations" description="Connect OIS with your existing toolchain for seamless operations." />
    <div className="space-y-3">
      {INTEGRATIONS.map(i => <IntegrationCard key={i.name} {...i} />)}
    </div>
  </div>
);

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
