# Monitoring Pages Dead Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire all 10 dead buttons across EventDetail, EventStream, and MonitoringRules using local React state — no backend required.

**Architecture:** EventDetail already holds `[event, setEvent]` local state — mutations go through `setEvent`. EventStream adds a `timeRange` state that feeds into the existing `filteredEvents` useMemo. MonitoringRules adds `testedChannels` state to the test modal section. No new files required — all changes are to existing route files.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 4, Lucide icons, `date-fns` (already installed), `cn()` from `src/lib/utils.ts`

---

## File Map

| File | Action | Dead buttons wired |
|------|--------|--------------------|
| `src/routes/monitoring/EventDetail.tsx` | Modify | Overflow menu, Copy query, CMDB graph, Create Incident, Show more events, Add tag |
| `src/routes/monitoring/EventStream.tsx` | Modify | Time range dropdown, Export CSV |
| `src/routes/monitoring/MonitoringRules.tsx` | Modify | Test channel (per row), Run all |

**Reused without modification:**
- `src/components/incidents/CreateIncidentModal.tsx` — props: `{ isOpen, onClose, onCreated(publicId: string) }`

---

## Task 1: EventDetail — overflow menu, copy query, CMDB graph, show more events

**Files:**
- Modify: `src/routes/monitoring/EventDetail.tsx`

> **Context:** `EventDetail` already has `const [event, setEvent] = useState<Event | undefined>(...)`. `affectedCIs` is a `useMemo` derived from `mockCIs`. `rule` is derived from `mockMonitoringRules`. `navigate` is already in scope from `useNavigate()`.

- [ ] **Step 1: Add new state variables**

Read `src/routes/monitoring/EventDetail.tsx` first. Find the existing `useState` block (lines 65–69). Add directly after the last existing `useState`:

```tsx
const [overflowOpen, setOverflowOpen]       = useState(false);
const [showAllRelated, setShowAllRelated]   = useState(false);
```

- [ ] **Step 2: Wire MoreVertical overflow menu**

Find the dead `MoreVertical` icon button (around line 188 — in the top header actions row, no `onClick`). Replace it with:

```tsx
<div className="relative">
  <button
    onClick={() => setOverflowOpen(v => !v)}
    className="p-1.5 rounded-lg border border-ois-border hover:bg-ois-surface-muted transition-colors"
  >
    <MoreVertical size={16} className="text-ois-text-muted" />
  </button>
  {overflowOpen && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setOverflowOpen(false)} />
      <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[180px]">
        {[
          { label: 'Copy event ID',  action: () => navigator.clipboard.writeText(event!.publicId) },
          { label: 'Copy link',      action: () => navigator.clipboard.writeText(window.location.href) },
        ].map(item => (
          <button
            key={item.label}
            onClick={() => { item.action(); setOverflowOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors text-ois-text"
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )}
</div>
```

- [ ] **Step 3: Wire "Copy query" button**

Find the dead "Copy query" button (around line 361, inside the monitoring rule card). Add:

```tsx
onClick={() => navigator.clipboard.writeText(rule?.query ?? '')}
```

Keep all existing `className` and children unchanged — only add the `onClick`.

- [ ] **Step 4: Wire "View full CMDB dependency graph" button**

Find the dead button (around line 310–312). Add:

```tsx
onClick={() => {
  const firstCI = affectedCIs[0];
  navigate(firstCI ? `/cmdb/graph?ci=${firstCI.publicId}` : '/cmdb/graph');
}}
```

- [ ] **Step 5: Wire "Show N more events" button**

Find the dead "Show {N} more events" button (around line 464–465) in the related events section. This button is visible when there are more related events than are currently shown. Add:

```tsx
onClick={() => setShowAllRelated(true)}
```

In the related events rendering logic (wherever it slices the related events list to a limited count), change the slice condition to use `showAllRelated`:

```tsx
// Before (something like):
{relatedEvents.slice(0, 3).map(...)}
// After:
{(showAllRelated ? relatedEvents : relatedEvents.slice(0, 3)).map(...)}
```

- [ ] **Step 6: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/monitoring/EventDetail.tsx
git commit -m "feat(events): wire overflow menu, copy query, CMDB graph, show more events"
```

---

## Task 2: EventDetail — Create Incident from alert + inline Add tag

**Files:**
- Modify: `src/routes/monitoring/EventDetail.tsx`

> **Context:** `CreateIncidentModal` accepts `{ isOpen, onClose, onCreated(publicId: string) }`. When an incident is created from an alert, link it back by setting `event.linkedIncidentId` and navigate to the new incident. The Event type has `tags: string[]` and `linkedIncidentId?: string`.

- [ ] **Step 1: Add new state variables**

Add to the existing state block:

```tsx
const [createIncidentOpen, setCreateIncidentOpen] = useState(false);
const [addingTag, setAddingTag]                   = useState(false);
const [tagInput, setTagInput]                     = useState('');
```

- [ ] **Step 2: Add import**

Add to the imports at the top of the file:

```tsx
import { CreateIncidentModal } from '@/src/components/incidents/CreateIncidentModal';
```

- [ ] **Step 3: Wire "Create Incident from alert" button**

Find the dead button (around line 415–417, visible when `!event.linkedIncidentId`). Add:

```tsx
onClick={() => setCreateIncidentOpen(true)}
```

- [ ] **Step 4: Handle incident creation**

After the existing handler functions (after `handleAddComment`), add:

```tsx
const handleIncidentCreated = (publicId: string) => {
  setEvent(prev => prev ? { ...prev, linkedIncidentId: publicId } : prev);
  navigate(`/incidents/${publicId}`);
};
```

- [ ] **Step 5: Wire "+ Add tag" button and inline input**

Find the dead "+ Add tag" button (around line 555–557, at the bottom of the tags section). Replace the dead button with this toggle pattern:

```tsx
{addingTag ? (
  <form
    onSubmit={e => {
      e.preventDefault();
      const tag = tagInput.trim();
      if (tag && !event!.tags.includes(tag)) {
        setEvent(prev => prev ? { ...prev, tags: [...prev.tags, tag] } : prev);
      }
      setTagInput('');
      setAddingTag(false);
    }}
    className="flex items-center gap-1.5 mt-2"
  >
    <input
      autoFocus
      value={tagInput}
      onChange={e => setTagInput(e.target.value)}
      placeholder="tag name"
      className="h-6 px-2 text-xs border border-ois-border rounded focus:outline-none focus:ring-1 focus:ring-ois-primary/30 focus:border-ois-primary"
    />
    <Button variant="primary" size="sm" type="submit" className="h-6 px-2 text-[11px]">Add</Button>
    <Button variant="ghost" size="sm" type="button" className="h-6 px-2 text-[11px]" onClick={() => { setAddingTag(false); setTagInput(''); }}>Cancel</Button>
  </form>
) : (
  <button
    onClick={() => setAddingTag(true)}
    className="mt-2 flex items-center gap-1 text-xs text-ois-primary hover:underline"
  >
    <Plus size={11} /> Add tag
  </button>
)}
```

Add `Plus` to the lucide-react import if not already present.

- [ ] **Step 6: Render CreateIncidentModal**

At the bottom of the component return (after all existing modals/conditionals), add:

```tsx
<CreateIncidentModal
  isOpen={createIncidentOpen}
  onClose={() => setCreateIncidentOpen(false)}
  onCreated={handleIncidentCreated}
/>
```

- [ ] **Step 7: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/routes/monitoring/EventDetail.tsx
git commit -m "feat(events): wire create incident from alert and inline add tag"
```

---

## Task 3: EventStream — time range dropdown + CSV export

**Files:**
- Modify: `src/routes/monitoring/EventStream.tsx`

> **Context:** `EventStream` uses a `filteredEvents` useMemo (lines 41–86) that applies status/severity/source/type filters. We need to add a `timeRange` state and incorporate it into that useMemo. The existing mock events have `firedAt` ISO timestamps. `date-fns` is already installed (`subDays`, `parseISO`, `isAfter` are available). Use reference date `new Date('2026-05-09')` (same mock data epoch used in IncidentAnalytics and IncidentQueue).

- [ ] **Step 1: Add imports**

Add to the existing import block:

```tsx
import { subDays, parseISO, isAfter } from 'date-fns';
```

- [ ] **Step 2: Add new state variables**

Add to the existing `useState` block (after line 38):

```tsx
type TimeRange = '24h' | '7d' | '30d';
const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '24h': 'Last 24h',
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
};
const [timeRange, setTimeRange]         = useState<TimeRange>('7d');
const [timeRangeOpen, setTimeRangeOpen] = useState(false);
```

Place the `type` and `const` declarations at module level (above the component function), not inside the `useState` block.

- [ ] **Step 3: Add time range filter to filteredEvents useMemo**

Find the `filteredEvents` useMemo (lines 41–86). It currently filters by status, severity, source, type, and search. Add a date filter at the **start** of the filter chain (before any other filters), and add `timeRange` to the dependency array:

```tsx
const filteredEvents = useMemo(() => {
  const referenceDate = new Date('2026-05-09');
  const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
  const cutoff = subDays(referenceDate, days);

  let events = (isPaused ? frozenEvents : mockEvents).filter(e =>
    isAfter(parseISO(e.firedAt), cutoff)
  );

  // ... rest of existing filters unchanged ...
  // Make sure to keep all the existing filter logic (status, severity, source, type, search, quickFilter)
  return events;
}, [timeRange, isPaused, frozenEvents, searchQuery, statusFilter, severityFilter, sourceFilter, typeFilter, activeQuickFilter]);
```

**Important:** Do not remove any existing filter logic — only add the date filter at the top and `timeRange` to the dependency array.

- [ ] **Step 4: Wire time range dropdown**

Find the dead "Last 7d" button (around line 195–198, in the page header right side). Replace it with:

```tsx
<div className="relative">
  <Button
    variant="outline"
    size="sm"
    onClick={() => setTimeRangeOpen(v => !v)}
    className="gap-1.5"
  >
    {TIME_RANGE_LABELS[timeRange]}
    <ChevronDown size={13} className={timeRangeOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
  </Button>
  {timeRangeOpen && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setTimeRangeOpen(false)} />
      <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[150px]">
        {(Object.entries(TIME_RANGE_LABELS) as [TimeRange, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTimeRange(key); setTimeRangeOpen(false); }}
            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors ${timeRange === key ? 'font-semibold text-ois-primary' : 'text-ois-text'}`}
          >
            {label}
          </button>
        ))}
      </div>
    </>
  )}
</div>
```

`ChevronDown` is already imported in this file.

- [ ] **Step 5: Wire Export button**

Find the dead "Export" button (around line 199–201). Add `onClick`:

```tsx
onClick={() => {
  const headers = ['ID', 'Title', 'Severity', 'Status', 'Source', 'Fired At', 'Tags'];
  const rows = filteredEvents.map(e => [
    e.publicId,
    `"${e.title.replace(/"/g, '""')}"`,
    e.severity,
    e.status,
    e.source,
    e.firedAt,
    `"${(e.tags ?? []).join(', ')}"`,
  ].join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `events-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}}
```

- [ ] **Step 6: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/monitoring/EventStream.tsx
git commit -m "feat(events): add time range filter and CSV export to event stream"
```

---

## Task 4: MonitoringRules — test channel feedback + run all

**Files:**
- Modify: `src/routes/monitoring/MonitoringRules.tsx`

> **Context:** `MonitoringRules` has a test modal controlled by `testModalRule: MonitoringRule | null`. When the modal opens for a rule, it shows the rule's alert route channels. The test modal renders a list of channels (from the alert route) with a "Test" button per row, plus a "Run all" button. We need local state to track which channels have been tested, show a checkmark after testing, and reset when the modal closes.

- [ ] **Step 1: Read the test modal section**

Read `src/routes/monitoring/MonitoringRules.tsx` lines 660–740 in full to understand exactly how channel rows are rendered and what data drives the channel list.

- [ ] **Step 2: Add testedChannels state**

Find the existing `useState` block (lines 75–88). Add after the existing state:

```tsx
const [testedChannels, setTestedChannels] = useState<Set<string>>(new Set());
```

- [ ] **Step 3: Reset testedChannels when modal closes**

Find every place that sets `setTestModalRule(null)` (the close action for the test modal). After each one, add:

```tsx
setTestedChannels(new Set());
```

This ensures the tested state resets for the next rule tested.

- [ ] **Step 4: Wire "Test" button per channel**

Read the test modal channel rows (around lines 710–712). Each channel row has a dead `<button>` labelled "Test". The channel identifier is whatever string uniquely identifies each row (channel name, id, or label — read the actual code to find it).

Replace the dead "Test" button with:

```tsx
{testedChannels.has(channelId) ? (
  <span className="flex items-center gap-1 text-xs font-medium text-ois-success">
    <CheckCircle2 size={12} /> Sent
  </span>
) : (
  <button
    onClick={() => setTestedChannels(prev => new Set([...prev, channelId]))}
    className="text-xs font-medium text-ois-primary hover:underline"
  >
    Test
  </button>
)}
```

Where `channelId` is the unique identifier for that channel row (e.g. `channel.name`, `channel.id`, or the channel type string — use whatever the actual data field is).

Add `CheckCircle2` to the lucide-react import if not already present.

- [ ] **Step 5: Wire "Run all" button**

Find the dead "Run all" button (around lines 730–732). Add `onClick`:

```tsx
onClick={() => {
  // allChannelIds is the array of all channel identifiers shown in the modal
  // Replace `channels.map(c => c.name)` with the actual field used in Step 4
  const allChannelIds = channels.map(c => c.name ?? c.id ?? c);
  setTestedChannels(new Set(allChannelIds));
}}
```

**Note:** Use the same identifier as Step 4 — if you used `channel.name` in Step 4, use `c.name` here.

- [ ] **Step 6: Verify lint**

```bash
cd /home/ubuntu/omni && npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/routes/monitoring/MonitoringRules.tsx
git commit -m "feat(monitoring): add test channel feedback and run all in test modal"
```

---

## Final steps

- [ ] **Update tracker**

In `docs/BUTTON-WIRING-GUIDE.md`, update these rows from `❌` to `✅`:

| Page | Buttons |
|------|---------|
| `EventDetail.tsx` | View CMDB dependency graph, Copy query, Create Incident from alert, Add tag |
| `EventStream.tsx` | Time range selector, Export |
| `MonitoringRules.tsx` | Test channel, Run all |

```bash
git add docs/BUTTON-WIRING-GUIDE.md
git commit -m "docs: mark monitoring buttons as done in wiring tracker"
```

---

## Self-Review Notes

- **No placeholders:** All code blocks are complete. Task 4 Step 4 instructs the implementer to read the actual channel data before writing code — this is intentional because the channel identifier field (`name` vs `id`) must be determined from the live file, not guessed.
- **Type consistency:** `TimeRange` type and `TIME_RANGE_LABELS` are defined at module level in Task 3 Step 2 and referenced consistently in Steps 3 and 4.
- **Resets:** `testedChannels` is reset in Task 4 Step 3 every time the test modal closes — prevents stale state bleeding between rules.
- **MoreVertical vs MoreHorizontal:** EventDetail uses `MoreVertical` (confirmed from imports). The overflow menu pattern matches ChangeDetail and IncidentDetail exactly.
- **`event!` non-null assertions:** Safe — the component has a not-found guard before the main render, so `event` is guaranteed non-null past that point.
