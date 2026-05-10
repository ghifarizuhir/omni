# Frontend P0 Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four P0 gaps from the incident journey audit: Skeleton primitive, Toast system, RouteError boundary, and a data-fetching hook layer — applied to the incident module as proof-of-concept.

**Architecture:** No new libraries (project has no TanStack Query / SWR). Hooks wrap existing mock getters behind a `{ data, isLoading, error }` interface so swapping to real fetch calls later is a one-file change per domain. Skeleton, Toast, and RouteError are new `src/components/ui/` primitives that follow the existing primitive style (TypeScript, `cn()`, Tailwind tokens).

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, `cn()` from `src/lib/utils.ts`, existing mock getters in `src/mocks/`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ui/Skeleton.tsx` | **Create** | Animated skeleton primitive with `text`, `card`, `table-row`, `avatar` variants |
| `src/lib/toast.ts` | **Create** | Global toast store (event emitter + React hook) |
| `src/components/ui/Toast.tsx` | **Create** | Toast UI component + `<Toaster>` container |
| `src/components/ui/RouteError.tsx` | **Create** | Full-page error fallback with retry CTA |
| `src/lib/api/incidents.ts` | **Create** | `useIncident(id)`, `useIncidents(filters?)` hooks wrapping mock data |
| `src/lib/api/events.ts` | **Create** | `useEvent(id)`, `useEvents(filters?)` hooks wrapping mock data |
| `src/lib/api/problems.ts` | **Create** | `useProblem(id)`, `useProblems(filters?)` hooks wrapping mock data |
| `src/components/layout/AppShell.tsx` | **Modify** | Mount `<Toaster>` once at app shell level |
| `src/routes/incidents/IncidentDetail.tsx` | **Modify** | Replace direct mock import with `useIncident()`, add Skeleton + error state |
| `src/routes/incidents/IncidentQueue.tsx` | **Modify** | Replace direct mock import with `useIncidents()`, add Skeleton + error state |

---

### Task 1: `<Skeleton>` primitive

**Files:**
- Create: `src/components/ui/Skeleton.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/Skeleton.tsx
import React from 'react';
import { cn } from '@/src/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'avatar' | 'table-row' | 'block';
}

const pulse = 'animate-pulse bg-ois-border rounded';

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'block' }) => {
  if (variant === 'text') {
    return <div className={cn(pulse, 'h-4 w-full', className)} />;
  }
  if (variant === 'avatar') {
    return <div className={cn(pulse, 'w-8 h-8 rounded-full', className)} />;
  }
  if (variant === 'table-row') {
    return (
      <div className={cn('flex items-center gap-3 px-4 py-3 border-b border-ois-border', className)}>
        <div className={cn(pulse, 'w-16 h-4')} />
        <div className={cn(pulse, 'flex-1 h-4')} />
        <div className={cn(pulse, 'w-20 h-4')} />
        <div className={cn(pulse, 'w-16 h-4')} />
        <div className={cn(pulse, 'w-24 h-4')} />
      </div>
    );
  }
  if (variant === 'card') {
    return (
      <div className={cn('p-4 rounded-lg border border-ois-border space-y-3', className)}>
        <div className={cn(pulse, 'h-4 w-1/3')} />
        <div className={cn(pulse, 'h-4 w-full')} />
        <div className={cn(pulse, 'h-4 w-4/5')} />
      </div>
    );
  }
  // block (default)
  return <div className={cn(pulse, 'h-4 w-full', className)} />;
};

// Convenience: stack N skeletons
export const SkeletonList: React.FC<{ count?: number; variant?: SkeletonProps['variant']; className?: string }> = ({
  count = 5,
  variant = 'table-row',
  className,
}) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} variant={variant} className={className} />
    ))}
  </>
);
```

- [ ] **Step 2: Lint check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Skeleton.tsx
git commit -m "feat: add Skeleton primitive with text/card/avatar/table-row variants"
```

---

### Task 2: Toast system

**Files:**
- Create: `src/lib/toast.ts`
- Create: `src/components/ui/Toast.tsx`

- [ ] **Step 1: Create the toast store**

```ts
// src/lib/toast.ts
type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number; // ms, default 4000
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners: Set<Listener> = new Set();

const notify = () => listeners.forEach(l => l([...toasts]));

export const toast = {
  show(message: string, variant: ToastVariant = 'info', duration = 4000) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    toasts = [...toasts, { id, message, variant, duration }];
    notify();
    setTimeout(() => toast.dismiss(id), duration);
    return id;
  },
  success: (message: string) => toast.show(message, 'success'),
  error: (message: string) => toast.show(message, 'error'),
  info: (message: string) => toast.show(message, 'info'),
  warning: (message: string) => toast.show(message, 'warning'),
  dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  },
};

export function useToasts(): ToastItem[] {
  const [items, setItems] = React.useState<ToastItem[]>([...toasts]);
  React.useEffect(() => {
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);
  return items;
}

// Need React import — add at top:
import React from 'react';
```

- [ ] **Step 2: Create the Toast UI + Toaster**

```tsx
// src/components/ui/Toast.tsx
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToasts, toast, type ToastItem } from '@/src/lib/toast';

const variantStyles: Record<ToastItem['variant'], string> = {
  success: 'bg-white border-[#12B76A] text-ois-text',
  error:   'bg-white border-ois-danger text-ois-text',
  warning: 'bg-white border-[#F79009] text-ois-text',
  info:    'bg-white border-ois-primary text-ois-text',
};

const variantIcons: Record<ToastItem['variant'], React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-[#12B76A] shrink-0" />,
  error:   <XCircle size={16} className="text-ois-danger shrink-0" />,
  warning: <AlertTriangle size={16} className="text-[#F79009] shrink-0" />,
  info:    <Info size={16} className="text-ois-primary shrink-0" />,
};

const ToastEntry: React.FC<{ item: ToastItem }> = ({ item }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -10, scale: 0.95 }}
    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    className={cn(
      'flex items-start gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg max-w-sm w-full',
      variantStyles[item.variant]
    )}
    style={{ boxShadow: '0 4px 12px rgba(16,24,40,0.12)' }}
  >
    {variantIcons[item.variant]}
    <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
    <button
      type="button"
      onClick={() => toast.dismiss(item.id)}
      className="shrink-0 text-ois-text-subtle hover:text-ois-text transition-colors"
    >
      <X size={14} />
    </button>
  </motion.div>
);

export const Toaster: React.FC = () => {
  const items = useToasts();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      <AnimatePresence mode="sync">
        {items.map(item => (
          <div key={item.id} className="pointer-events-auto">
            <ToastEntry item={item} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};
```

- [ ] **Step 3: Lint check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/toast.ts src/components/ui/Toast.tsx
git commit -m "feat: add Toast system with success/error/info/warning variants"
```

---

### Task 3: `<RouteError>` boundary

**Files:**
- Create: `src/components/ui/RouteError.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ui/RouteError.tsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface RouteErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const RouteError: React.FC<RouteErrorProps> = ({
  title = 'Failed to load',
  message = 'Something went wrong while loading this page. Try again or contact support if the issue persists.',
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center">
    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
      <AlertCircle size={24} className="text-ois-danger" />
    </div>
    <h2 className="text-lg font-semibold text-ois-text mb-2">{title}</h2>
    <p className="text-sm text-ois-text-muted max-w-md mb-6">{message}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw size={14} className="mr-2" />
        Try again
      </Button>
    )}
  </div>
);

// Inline variant for section-level errors (e.g. failed to load comments)
export const InlineError: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-ois-danger">
    <AlertCircle size={14} className="shrink-0" />
    <span className="flex-1">{message}</span>
    {onRetry && (
      <button type="button" onClick={onRetry} className="text-xs font-medium underline shrink-0">
        Retry
      </button>
    )}
  </div>
);
```

- [ ] **Step 2: Lint check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/RouteError.tsx
git commit -m "feat: add RouteError and InlineError components"
```

---

### Task 4: Mount `<Toaster>` in AppShell

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Add Toaster import**

In `src/components/layout/AppShell.tsx`, add after existing imports:

```tsx
import { Toaster } from '@/src/components/ui/Toast';
```

- [ ] **Step 2: Mount Toaster inside the root div**

In the return JSX of AppShell, add `<Toaster />` just before the closing `</div>` of the root element:

```tsx
      {/* Global toast notifications */}
      <Toaster />
    </div>
  );
```

- [ ] **Step 3: Lint check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Verify toast renders**

Open browser at `http://localhost:3000`. Open DevTools console and run:
```js
// Manually test — import is not needed in console, just trigger via window
// Can't easily test from console without module access; visual check after Task 9 when it's wired to incident actions
```
Skip manual test here — will be verified in Task 9.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: mount Toaster in AppShell for global toast notifications"
```

---

### Task 5: Data-fetching hook layer — incidents

**Files:**
- Create: `src/lib/api/incidents.ts`

- [ ] **Step 1: Create the hooks file**

```ts
// src/lib/api/incidents.ts
import { useState, useEffect } from 'react';
import type { Incident } from '@/src/types/incident';
import type { Problem } from '@/src/types/problem';
import {
  mockIncidents,
  getIncidentById,
  getIncidentsByCI,
} from '@/src/mocks/incidents';
import { getTimelineForIncident } from '@/src/mocks/incidentTimelines';
import { getCommentsForIncident } from '@/src/mocks/incidentComments';
import { mockProblems } from '@/src/mocks/problems';
import type { IncidentEvent } from '@/src/types/incident';
import type { IncidentComment } from '@/src/types/incident';

export interface IncidentFilters {
  status?: string[];
  priority?: string[];
  search?: string;
}

// Simulates the async boundary — replace body with fetch() when backend is ready
function mockAsync<T>(fn: () => T): Promise<T> {
  return Promise.resolve(fn());
}

export function useIncidents(filters?: IncidentFilters) {
  const [data, setData] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    mockAsync(() => {
      let result = [...mockIncidents];
      if (filters?.status?.length) {
        result = result.filter(i => filters.status!.includes(i.status));
      }
      if (filters?.priority?.length) {
        result = result.filter(i => filters.priority!.includes(i.priority));
      }
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(i =>
          i.title.toLowerCase().includes(q) ||
          i.publicId.toLowerCase().includes(q)
        );
      }
      return result;
    })
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [filters?.status?.join(), filters?.priority?.join(), filters?.search]);

  return { data, isLoading, error };
}

export function useIncident(id: string | undefined) {
  const [data, setData] = useState<Incident | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    mockAsync(() => getIncidentById(id))
      .then(result => {
        if (!result) throw new Error(`Incident "${id}" not found`);
        setData(result);
      })
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [id]);

  return { data, isLoading, error };
}

export function useIncidentTimeline(incidentId: string | undefined) {
  const [data, setData] = useState<IncidentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!incidentId) { setIsLoading(false); return; }
    setIsLoading(true);
    mockAsync(() => getTimelineForIncident(incidentId))
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [incidentId]);

  return { data, isLoading, error };
}

export function useIncidentComments(incidentId: string | undefined) {
  const [data, setData] = useState<IncidentComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!incidentId) { setIsLoading(false); return; }
    setIsLoading(true);
    mockAsync(() => getCommentsForIncident(incidentId))
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [incidentId]);

  return { data, isLoading, error };
}

export function useLinkedProblem(problemId: string | undefined) {
  const [data, setData] = useState<Problem | undefined>(undefined);

  useEffect(() => {
    if (!problemId) return;
    const found = mockProblems.find(p => p.id === problemId);
    setData(found);
  }, [problemId]);

  return { data };
}
```

- [ ] **Step 2: Lint check**

```bash
npm run lint
```
Expected: no errors. If there are type errors on `IncidentEvent` or `IncidentComment` not exported from `src/types/incident`, check the actual exported names and update imports accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/lib/api/incidents.ts
git commit -m "feat: add incident data-fetching hooks (useIncident, useIncidents, useIncidentTimeline)"
```

---

### Task 6: Data-fetching hooks — events + problems

**Files:**
- Create: `src/lib/api/events.ts`
- Create: `src/lib/api/problems.ts`

- [ ] **Step 1: Create events hooks**

```ts
// src/lib/api/events.ts
import { useState, useEffect } from 'react';
import type { Event } from '@/src/types/monitoring';
import { mockEvents, getEventById } from '@/src/mocks/events';

function mockAsync<T>(fn: () => T): Promise<T> {
  return Promise.resolve(fn());
}

export function useEvents() {
  const [data, setData] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    mockAsync(() => [...mockEvents])
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading, error };
}

export function useEvent(id: string | undefined) {
  const [data, setData] = useState<Event | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }
    setIsLoading(true);
    mockAsync(() => getEventById(id))
      .then(result => {
        if (!result) throw new Error(`Event "${id}" not found`);
        setData(result);
      })
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [id]);

  return { data, isLoading, error };
}
```

- [ ] **Step 2: Create problems hooks**

```ts
// src/lib/api/problems.ts
import { useState, useEffect } from 'react';
import type { Problem } from '@/src/types/problem';
import { mockProblems, getProblemById } from '@/src/mocks/problems';

function mockAsync<T>(fn: () => T): Promise<T> {
  return Promise.resolve(fn());
}

export function useProblems() {
  const [data, setData] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsLoading(true);
    mockAsync(() => [...mockProblems])
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  return { data, isLoading, error };
}

export function useProblem(id: string | undefined) {
  const [data, setData] = useState<Problem | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) { setIsLoading(false); return; }
    setIsLoading(true);
    mockAsync(() => getProblemById(id))
      .then(result => {
        if (!result) throw new Error(`Problem "${id}" not found`);
        setData(result);
      })
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [id]);

  return { data, isLoading, error };
}
```

- [ ] **Step 3: Lint check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/api/events.ts src/lib/api/problems.ts
git commit -m "feat: add event and problem data-fetching hooks"
```

---

### Task 7: Wire `useIncident` into `IncidentDetail` + add loading/error states

**Files:**
- Modify: `src/routes/incidents/IncidentDetail.tsx`

- [ ] **Step 1: Add new imports**

At the top of `src/routes/incidents/IncidentDetail.tsx`, add after existing imports:

```tsx
import { useIncident, useIncidentTimeline, useIncidentComments } from '@/src/lib/api/incidents';
import { Skeleton, SkeletonList } from '@/src/components/ui/Skeleton';
import { RouteError } from '@/src/components/ui/RouteError';
import { toast } from '@/src/lib/toast';
```

- [ ] **Step 2: Replace direct mock calls with hooks**

Find the section inside the component where `incidentId` is used to look up the incident. It currently looks like:

```tsx
const { incidentId } = useParams<{ incidentId: string }>();
// ...
const incident = getIncidentById(incidentId ?? '');
```

Replace the data-fetching lines with:

```tsx
const { incidentId } = useParams<{ incidentId: string }>();
const { data: incident, isLoading, error } = useIncident(incidentId);
```

- [ ] **Step 3: Add loading skeleton and error state before the main render**

After the hooks section and before the existing `if (!incident)` guard, add:

```tsx
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-4">
        <Skeleton variant="block" className="h-8 w-64" />
        <Skeleton variant="block" className="h-5 w-48" />
        <div className="grid grid-cols-3 gap-4 mt-6">
          <Skeleton variant="card" className="col-span-2" />
          <Skeleton variant="card" />
        </div>
        <SkeletonList count={4} variant="table-row" />
      </div>
    );
  }

  if (error) {
    return (
      <RouteError
        title="Failed to load incident"
        message={error.message}
        onRetry={() => window.location.reload()}
      />
    );
  }
```

- [ ] **Step 4: Wire toast on status change actions**

Find the status-change handler (look for `setIncidentStatus`, `handleResolve`, or similar). After any successful status mutation, add:

```tsx
toast.success('Incident status updated');
```

And on any action failure:

```tsx
toast.error('Failed to update incident — please try again');
```

- [ ] **Step 5: Lint check**

```bash
npm run lint
```
Expected: no errors. Fix any type mismatches by adjusting the `incident` type reference (it may have been `Incident` | `undefined`, now it's from the hook).

- [ ] **Step 6: Visual check in browser**

Navigate to `http://localhost:3000/incidents/inc-2026-00184`. Confirm:
- Page loads normally (no flicker visible since mock is synchronous)
- Layout is unchanged
- No console errors

- [ ] **Step 7: Commit**

```bash
git add src/routes/incidents/IncidentDetail.tsx
git commit -m "feat: IncidentDetail uses useIncident hook with loading/error states"
```

---

### Task 8: Wire `useIncidents` into `IncidentQueue` + add loading/error states

**Files:**
- Modify: `src/routes/incidents/IncidentQueue.tsx`

- [ ] **Step 1: Add new imports**

At the top of `src/routes/incidents/IncidentQueue.tsx`, add after existing imports:

```tsx
import { useIncidents } from '@/src/lib/api/incidents';
import { SkeletonList } from '@/src/components/ui/Skeleton';
import { RouteError } from '@/src/components/ui/RouteError';
```

- [ ] **Step 2: Replace direct mock import with hook**

Find where `mockIncidents` is currently used to populate the list. It will look like:

```tsx
import { mockIncidents } from '@/src/mocks/incidents';
// ...
const incidents = mockIncidents.filter(...);
```

Replace the data source with the hook:

```tsx
const { data: allIncidents, isLoading, error } = useIncidents();
```

Then update all references from `mockIncidents` to `allIncidents` in the filtering logic.

- [ ] **Step 3: Add loading and error states**

Before the table/list render, add:

```tsx
  if (isLoading) {
    return (
      <div className="space-y-0">
        <SkeletonList count={8} variant="table-row" />
      </div>
    );
  }

  if (error) {
    return (
      <RouteError
        title="Failed to load incidents"
        message={error.message}
        onRetry={() => window.location.reload()}
      />
    );
  }
```

- [ ] **Step 4: Lint check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 5: Visual check in browser**

Navigate to `http://localhost:3000/incidents`. Confirm:
- List renders correctly
- Filter chips still work
- No console errors

- [ ] **Step 6: Commit**

```bash
git add src/routes/incidents/IncidentQueue.tsx
git commit -m "feat: IncidentQueue uses useIncidents hook with loading/error states"
```

---

### Task 9: Verify full toast flow end-to-end

- [ ] **Step 1: Open browser at incident detail**

Navigate to `http://localhost:3000/incidents/inc-2026-00184`.

- [ ] **Step 2: Trigger a status action**

Click any Quick Action button (Assign, Acknowledge, or Resolve) that calls the status-change handler.

Confirm: a toast notification appears at the bottom-center of the screen with the correct message and auto-dismisses after 4 seconds.

- [ ] **Step 3: Final lint check**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: P0 hardening complete — hooks, skeleton, toast, error states"
```
