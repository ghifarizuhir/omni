import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Mail, Phone, MessageSquare } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/Button';
import { QuietHoursForm } from '@/src/components/platform/QuietHoursForm';
import { PreferencesTable } from '@/src/components/platform/PreferencesTable';
import { notificationsService, useResource } from '@/src/services';
import { NotificationPreference, QuietHoursConfig } from '@/src/types/platform';

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState {
  id: number;
  message: string;
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-ois-surface border border-ois-border shadow-lg px-4 py-3 text-sm text-ois-text animate-in slide-in-from-bottom-4">
      <span className="h-2 w-2 rounded-full bg-[#12B76A] flex-shrink-0" />
      {message}
      <button
        type="button"
        onClick={onDismiss}
        className="ml-1 text-ois-text-muted hover:text-ois-text transition-colors text-xs"
      >
        ✕
      </button>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ois-border bg-ois-surface p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-ois-text">{title}</h2>
        {subtitle && <p className="text-sm text-ois-text-muted mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Connected channel row ─────────────────────────────────────────────────────

function ChannelRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-ois-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-ois-surface-muted flex items-center justify-center text-ois-text-muted">
          <Icon size={15} />
        </div>
        <div>
          <p className="text-xs text-ois-text-muted font-medium uppercase tracking-wide">{label}</p>
          <p className="text-sm text-ois-text font-medium">{value}</p>
        </div>
      </div>
      <Button variant="outline" size="sm">
        Change
      </Button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationPreferences() {
  const { data: prefData } = useResource(() => notificationsService.preferences(), []);
  const { data: quietData } = useResource(() => notificationsService.quietHours(), []);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [quietHours, setQuietHours] = useState<QuietHoursConfig | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => { if (prefData) setPreferences(prefData); }, [prefData]);
  useEffect(() => { if (quietData) setQuietHours(quietData); }, [quietData]);

  let nextId = 0;

  function showToast(message: string) {
    const id = ++nextId;
    setToasts(prev => [...prev, { id, message }]);
  }

  function dismissToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  function handleSaveQuietHours(config: QuietHoursConfig) {
    setQuietHours(config);
    showToast('Quiet hours saved successfully.');
  }

  function handleSavePreferences() {
    showToast('Notification preferences saved.');
  }

  return (
    <div className="min-h-screen bg-ois-bg">
      {/* Toast stack */}
      {toasts.map(t => (
        <React.Fragment key={t.id}>
          <Toast message={t.message} onDismiss={() => dismissToast(t.id)} />
        </React.Fragment>
      ))}

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Back link */}
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-primary transition-colors"
        >
          <ChevronLeft size={14} />
          Settings
        </Link>

        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold text-ois-text tracking-tight">Notification Preferences</h1>
          <p className="text-sm text-ois-text-muted mt-1">Control how and when OIS notifies you.</p>
        </div>

        {/* Quiet Hours */}
        <SectionCard
          title="Quiet Hours"
          subtitle="Suppress non-urgent notifications during the hours you specify."
        >
          {quietHours && <QuietHoursForm initial={quietHours} onSave={handleSaveQuietHours} />}
        </SectionCard>

        {/* Topic Notifications */}
        <SectionCard
          title="Topic Notifications"
          subtitle="Choose which channels to use for each notification type."
        >
          <PreferencesTable
            preferences={preferences}
            onChange={setPreferences}
            onSave={handleSavePreferences}
          />
        </SectionCard>

        {/* Connected Channels */}
        <SectionCard
          title="Connected Channels"
          subtitle="Where OIS delivers your notifications."
        >
          <div className="-mx-1">
            <ChannelRow
              icon={Mail}
              label="Email"
              value="sarah.chen@acmecorp.io"
            />
            <ChannelRow
              icon={Phone}
              label="SMS"
              value="+1 (415) 555-0192"
            />
            <ChannelRow
              icon={MessageSquare}
              label="Slack"
              value="@sarah.chen · #ois-alerts"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
