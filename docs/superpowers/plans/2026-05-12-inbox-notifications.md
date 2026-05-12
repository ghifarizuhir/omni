# Inbox & Notifications Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce a clean contract between Inbox (work queue) and Notifications bell (activity feed), fix the bell footer link, move misrouted mock items, and add a `/notifications` full page.

**Architecture:** `mockNotifications` gains a `url` field and loses two items that belong in Inbox (`ntf-001`, `ntf-002`). `mockInboxItems` gains those two as proper `InboxItem` entries. `NotificationDropdown` is simplified to use `notification.url` directly and its footer now links to `/notifications`. A new `Notifications.tsx` page serves the full feed at `/notifications`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, React Router v6, lucide-react, `cn()` from `src/lib/utils`

---

### Task 1: Add `url` to `MockNotificationItem`, remove misrouted items, populate URLs

**Files:**
- Modify: `src/mocks/notifications.ts`

- [ ] **Step 1: Replace the file contents**

```ts
export interface MockNotificationItem {
  id: string;
  type: 'info' | 'update' | 'mention' | 'system';
  title: string;
  body: string;
  sourceModule?: string;
  sourceRef?: string;
  url: string | null;
  readAt: string | null;
  createdAt: string;
}

export const mockNotifications: MockNotificationItem[] = [
  // ntf-001 and ntf-002 removed — moved to mockInboxItems (ibx-008, ibx-009)
  { id: 'ntf-003', type: 'info',   title: 'Your on-call shift starts soon',    body: 'Payment Service primary, 18:00 UTC tonight.',              sourceModule: 'oncall',                                  url: null,                          readAt: null,                    createdAt: '2026-05-08T07:55:00Z' },
  { id: 'ntf-004', type: 'update', title: 'Change CHG-2026-00088 approved',    body: 'Auto-approved by standard policy.',                        sourceModule: 'change',   sourceRef: 'CHG-2026-00088', url: '/changes/CHG-2026-00088',     readAt: '2026-05-08T07:30:00Z',  createdAt: '2026-05-08T07:01:00Z' },
  { id: 'ntf-005', type: 'system', title: 'Daily digest available',            body: '8 incidents, 3 changes, 2 deploys in last 24h.',                                                                url: null,                          readAt: '2026-05-08T07:30:00Z',  createdAt: '2026-05-08T07:00:00Z' },
  { id: 'ntf-006', type: 'update', title: 'KB article published',              body: 'New runbook: "ES cluster yellow recovery"',                sourceModule: 'kb',       sourceRef: 'KB-00231',       url: '/kb/es-cluster-yellow-recovery', readAt: '2026-05-08T06:45:00Z',  createdAt: '2026-05-08T06:30:00Z' },
  { id: 'ntf-007', type: 'info',   title: 'Status page incident posted',       body: 'Search Service: investigating partial outage.',            sourceModule: 'status',   sourceRef: 'STP-2026-00012', url: '/status',                     readAt: null,                    createdAt: '2026-05-08T06:18:00Z' },
  { id: 'ntf-008', type: 'mention',title: 'Helena mentioned you',              body: 'in CHG-2026-00091: "@sarah please review risk score"',     sourceModule: 'change',   sourceRef: 'CHG-2026-00091', url: '/changes/CHG-2026-00091',     readAt: '2026-05-07T22:00:00Z',  createdAt: '2026-05-07T21:48:00Z' },
  { id: 'ntf-009', type: 'update', title: 'Deploy completed: REL-2026-00016',  body: 'Notification Gateway 1.5.2 deployed to prod.',            sourceModule: 'release',  sourceRef: 'REL-2026-00016', url: '/releases/REL-2026-00016',    readAt: '2026-05-07T20:15:00Z',  createdAt: '2026-05-07T20:11:00Z' },
  { id: 'ntf-010', type: 'system', title: 'Weekly improvement digest',         body: '3 new initiatives created from PIR this week.',                                                                url: null,                          readAt: '2026-05-07T18:00:00Z',  createdAt: '2026-05-07T17:00:00Z' },
  { id: 'ntf-011', type: 'info',   title: 'Capacity threshold alert',          body: 'CI WEB-PROD-03 CPU > 80% for 30min.',                      sourceModule: 'monitoring',                              url: '/events',                     readAt: null,                    createdAt: '2026-05-07T15:42:00Z' },
  { id: 'ntf-012', type: 'update', title: 'Problem PRB-2026-00021 closed',     body: 'Permanent fix verified. KB updated.',                      sourceModule: 'problem',  sourceRef: 'PRB-2026-00021', url: '/problems/PRB-2026-00021',    readAt: '2026-05-07T14:30:00Z',  createdAt: '2026-05-07T14:20:00Z' },
  { id: 'ntf-013', type: 'mention',title: 'David mentioned you',               body: 'in PRB-2026-00023: "@sarah RCA draft ready for review"',   sourceModule: 'problem',  sourceRef: 'PRB-2026-00023', url: '/problems/PRB-2026-00023',    readAt: '2026-05-07T11:00:00Z',  createdAt: '2026-05-07T10:54:00Z' },
  { id: 'ntf-014', type: 'system', title: 'Maintenance window scheduled',      body: 'Internal Wiki: tomorrow 02:00–04:00 UTC.',                 sourceModule: 'change',   sourceRef: 'CHG-2026-00086', url: '/changes/CHG-2026-00086',     readAt: '2026-05-07T09:00:00Z',  createdAt: '2026-05-07T08:45:00Z' },
  { id: 'ntf-015', type: 'info',   title: 'New comment on your incident',      body: 'INC-2026-00179 — Yuki added a comment.',                   sourceModule: 'incident', sourceRef: 'INC-2026-00179', url: '/incidents/INC-2026-00179',   readAt: '2026-05-07T08:30:00Z',  createdAt: '2026-05-07T08:22:00Z' },
];
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/mocks/notifications.ts
git commit -m "refactor(notifications): add url field, remove misrouted items ntf-001/002"
```

---

### Task 2: Add moved items to mockInboxItems

**Files:**
- Modify: `src/mocks/inboxItems.ts`

- [ ] **Step 1: Append `ibx-008` and `ibx-009` to the `mockInboxItems` array**

Add these two items before the closing `];` of the array:

```ts
  {
    id: 'ibx-008',
    type: 'mention',
    priority: 'normal',
    title: 'Marcus mentioned you in INC-2026-00184',
    summary: '"@sarah can you check the runbook?"',
    sourceType: 'incident',
    sourcePublicId: 'INC-2026-00184',
    sourceTitle: 'Payment Service: 5xx error rate elevated',
    sourceUrl: '/incidents/INC-2026-00184',
    senderId: 'u-marcus',
    senderName: 'Marcus',
    isRead: false,
    isArchived: false,
    isPinned: false,
    requiresAction: true,
    primaryAction: { label: 'Open incident', navigateTo: '/incidents/INC-2026-00184' },
    receivedAt: '2026-05-08T08:20:00Z',
  },
  {
    id: 'ibx-009',
    type: 'assignment',
    priority: 'high',
    title: 'Incident assigned to you: INC-2026-00184',
    summary: 'Payment Service 5xx error rate elevated — assigned to you.',
    sourceType: 'incident',
    sourcePublicId: 'INC-2026-00184',
    sourceTitle: 'Payment Service: 5xx error rate elevated',
    sourceUrl: '/incidents/INC-2026-00184',
    senderId: 'system',
    senderName: 'Incident Management',
    isRead: false,
    isArchived: false,
    isPinned: false,
    requiresAction: true,
    primaryAction: { label: 'Open incident', navigateTo: '/incidents/INC-2026-00184' },
    receivedAt: '2026-05-08T08:14:00Z',
  },
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/mocks/inboxItems.ts
git commit -m "feat(inbox): add ibx-008 (actionable mention) and ibx-009 (assignment) from notifications"
```

---

### Task 3: Simplify NotificationDropdown — use `url`, fix footer link

**Files:**
- Modify: `src/components/layout/NotificationDropdown.tsx`

- [ ] **Step 1: Replace file contents**

```tsx
import React, { useState } from 'react';
import { Check, Bell, MessageSquare, Settings, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { cn } from '@/src/lib/utils';
import { mockNotifications } from '@/src/mocks';
import { formatRelative } from '@/src/lib/format';

interface NotificationDropdownProps {
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onClose }) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');
  const navigate = useNavigate();

  const filteredNotifications = mockNotifications.filter(n => {
    if (filter === 'unread') return !n.readAt;
    if (filter === 'mentions') return n.type === 'mention';
    return true;
  });

  const unreadCount = mockNotifications.filter(n => !n.readAt).length;

  return (
    <div
      className="absolute right-0 mt-2 w-80 sm:w-[380px] bg-white border border-ois-border rounded-ois-card shadow-ois-dropdown overflow-hidden z-50 flex flex-col max-h-[500px]"
      onMouseLeave={onClose}
    >
      <div className="p-4 border-b border-ois-border bg-ois-surface flex items-center justify-between">
        <h3 className="font-bold text-ois-text">Notifications</h3>
        <Button variant="ghost" size="sm" className="text-ois-primary text-xs flex items-center gap-1 h-auto py-1">
          Mark all as read
        </Button>
      </div>

      <div className="flex border-b border-ois-border">
        <Tab active={filter === 'all'} onClick={() => setFilter('all')}>All</Tab>
        <Tab active={filter === 'unread'} onClick={() => setFilter('unread')}>
          Unread {unreadCount > 0 && `(${unreadCount})`}
        </Tab>
        <Tab active={filter === 'mentions'} onClick={() => setFilter('mentions')}>Mentions</Tab>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-ois-border">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => {
                if (notification.url) { onClose(); navigate(notification.url); }
              }}
              className={cn(
                'p-4 hover:bg-ois-surface-muted transition-colors flex gap-3 relative',
                notification.url ? 'cursor-pointer' : 'cursor-default',
                !notification.readAt && 'bg-ois-primary-pale/30'
              )}
            >
              {!notification.readAt && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-ois-primary" />
              )}

              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                notification.type === 'mention' ? 'bg-ois-info-pale text-ois-info' :
                notification.type === 'update'  ? 'bg-ois-success-pale text-ois-success' :
                notification.type === 'system'  ? 'bg-ois-surface-muted text-ois-text-subtle' :
                'bg-ois-warning-pale text-ois-warning'
              )}>
                {notification.type === 'mention' ? <MessageSquare size={14} /> :
                 notification.type === 'update'  ? <Check size={14} /> :
                 notification.type === 'system'  ? <Settings size={14} /> :
                 <Info size={14} />}
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-semibold', !notification.readAt ? 'text-ois-text' : 'text-ois-text-muted')}>
                    {notification.title}
                  </span>
                  {!notification.readAt && <span className="w-2 h-2 rounded-full bg-ois-primary" />}
                </div>
                <p className="text-sm text-ois-text-muted leading-tight">{notification.body}</p>
                <div className="text-[11px] text-ois-text-subtle font-medium mt-1 uppercase tracking-wider">
                  {formatRelative(notification.createdAt)}
                  {notification.sourceRef && ` • ${notification.sourceRef}`}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-ois-text-muted">
            <Bell size={32} className="mx-auto mb-2 opacity-20" />
            <p>No notifications found</p>
          </div>
        )}
      </div>

      <div className="p-3 bg-ois-surface-muted text-center border-t border-ois-border">
        <button
          className="text-xs font-bold text-ois-primary hover:underline"
          onClick={() => { navigate('/notifications'); onClose(); }}
        >
          View all notifications
        </button>
      </div>
    </div>
  );
};

const Tab: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex-1 py-2 text-xs font-semibold border-b-2 transition-all',
      active
        ? 'border-ois-primary text-ois-primary bg-ois-primary-pale/10'
        : 'border-transparent text-ois-text-muted hover:text-ois-text hover:bg-ois-surface-muted'
    )}
  >
    {children}
  </button>
);
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/NotificationDropdown.tsx
git commit -m "refactor(notifications): use url field, fix footer link to /notifications"
```

---

### Task 4: Create Notifications full page

**Files:**
- Create: `src/routes/platform/Notifications.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useState } from 'react';
import { Bell, Check, MessageSquare, Settings, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { mockNotifications, MockNotificationItem } from '@/src/mocks/notifications';
import { formatRelative } from '@/src/lib/format';

type FilterId = 'all' | 'unread' | 'mentions';

const FILTERS: { id: FilterId; label: string }[] = [
  { id: 'all',      label: 'All' },
  { id: 'unread',   label: 'Unread' },
  { id: 'mentions', label: 'Mentions' },
];

function NotificationIcon({ type }: { type: MockNotificationItem['type'] }) {
  const styles = {
    mention: 'bg-ois-info-pale text-ois-info',
    update:  'bg-ois-success-pale text-ois-success',
    system:  'bg-ois-surface-muted text-ois-text-subtle',
    info:    'bg-ois-warning-pale text-ois-warning',
  };
  const icons = {
    mention: <MessageSquare size={14} />,
    update:  <Check size={14} />,
    system:  <Settings size={14} />,
    info:    <Info size={14} />,
  };
  return (
    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center shrink-0', styles[type])}>
      {icons[type]}
    </div>
  );
}

export const Notifications: React.FC = () => {
  const [filter, setFilter] = useState<FilterId>('all');
  const navigate = useNavigate();

  const unreadCount = mockNotifications.filter(n => !n.readAt).length;

  const filtered = mockNotifications.filter(n => {
    if (filter === 'unread')   return !n.readAt;
    if (filter === 'mentions') return n.type === 'mention';
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-ois-text tracking-tight">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-ois-text-muted mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <button className="text-xs font-semibold text-ois-primary hover:underline">
          Mark all as read
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-ois-border mb-4">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              filter === f.id
                ? 'border-ois-primary text-ois-primary'
                : 'border-transparent text-ois-text-muted hover:text-ois-text'
            )}
          >
            {f.label}
            {f.id === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 text-xs font-bold text-ois-primary">({unreadCount})</span>
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-ois-text-muted">
          <Bell size={36} className="mb-3 opacity-20" />
          <p className="text-sm">No notifications</p>
        </div>
      ) : (
        <div className="divide-y divide-ois-border border border-ois-border rounded-ois-card overflow-hidden bg-white">
          {filtered.map(n => (
            <div
              key={n.id}
              onClick={() => n.url && navigate(n.url)}
              className={cn(
                'flex gap-4 p-4 relative transition-colors',
                n.url ? 'cursor-pointer hover:bg-ois-surface-muted' : 'cursor-default',
                !n.readAt && 'bg-ois-primary-pale/20'
              )}
            >
              {!n.readAt && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-ois-primary rounded-l" />
              )}
              <NotificationIcon type={n.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className={cn(
                    'text-sm font-semibold leading-tight',
                    !n.readAt ? 'text-ois-text' : 'text-ois-text-muted'
                  )}>
                    {n.title}
                    {!n.readAt && <span className="inline-block w-1.5 h-1.5 rounded-full bg-ois-primary ml-2 mb-0.5 align-middle" />}
                  </span>
                  <span className="text-[11px] text-ois-text-subtle whitespace-nowrap shrink-0">
                    {formatRelative(n.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-ois-text-muted mt-0.5 leading-snug">{n.body}</p>
                {n.sourceRef && (
                  <span className="text-[10px] font-mono text-ois-text-subtle mt-1 block">{n.sourceRef}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
```

- [ ] **Step 2: Verify lint passes**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/platform/Notifications.tsx
git commit -m "feat(notifications): add /notifications full feed page"
```

---

### Task 5: Wire up `/notifications` route

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Add import after the `NotificationPreferences` import on line 69**

Find this line:
```ts
import NotificationPreferences from './platform/NotificationPreferences';
```

Add after it:
```ts
import Notifications from './platform/Notifications';
```

- [ ] **Step 2: Add route after the `notifications/preferences` route on line 155**

Find this line:
```ts
{ path: 'notifications/preferences',      element: <NotificationPreferences /> },
```

Add after it:
```ts
{ path: 'notifications',                  element: <Notifications /> },
```

- [ ] **Step 3: Verify lint passes**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat(routing): add /notifications route"
```
