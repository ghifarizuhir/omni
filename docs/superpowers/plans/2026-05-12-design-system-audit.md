# Design System Audit — Full Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring every route page into full compliance with `docs/DESIGN-SYSTEM.md`, matching the north-star `IncidentDetail` (`src/routes/incidents/IncidentDetail.tsx`).

**Architecture:** Three tiers of work — (A) full 3-column layout overhauls for 6 detail pages, (B) SectionCard header sweep on pages not in tier A, (C) mechanical sweeps for native `<select>` → FilterDropdown and `tracking-wider` → `tracking-widest` typography across all list pages.

**Tech Stack:** React 18, Tailwind CSS 4 (custom OIS tokens), Vite, TypeScript

**Already done:** `IncidentDetail`, `IncidentQueue`, `ProblemDetail`, `ProblemList` — fully compliant. Use them as reference.

---

## North-Star Patterns (memorise these)

### Full-height 3-column detail layout
Every entity detail page must use this outer shell:
```tsx
// Outer wrapper — negates AppShell p-6, fills remaining viewport height
<div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

  {/* Header — shrink-0 so it never scrolls */}
  <div className="bg-white border-b border-ois-border shrink-0 z-30">

    {/* Nav row */}
    <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
      <button onClick={() => navigate('/entity-list')}
        className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors">
        <ArrowLeft size={15} /> List label
      </button>
      <div className="flex items-center gap-2">
        {/* StatusDropdown or static pill */}
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>

    {/* Entity header — priority/risk bar + content */}
    <div className="flex items-start gap-0">
      <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: stripeColor }} />
      <div className="flex-1 px-6 py-4">
        {/* ID chips, title, tags, meta line */}
      </div>
    </div>
  </div>

  {/* Body — three independent scroll columns */}
  <div className="flex flex-1 min-h-0">

    {/* Left sidebar */}
    <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
      {/* SectionCard components */}
    </aside>

    {/* Center: pinned tab bar + scrollable content */}
    <div className="flex flex-col flex-1 min-w-0">
      <div className="border-b border-ois-border bg-white shrink-0 px-6">
        <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'border-ois-primary text-ois-primary font-bold'
                  : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong'
              )}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* active tab content */}
      </div>
    </div>

    {/* Right sidebar */}
    <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
      {/* SectionCard components */}
    </aside>
  </div>
</div>
```

### SectionCard (use EXACTLY this — copy from IncidentDetail)
```tsx
const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);
```

### Quick Action Button List (design system pattern)
```tsx
{/* One primary (blue fill), rest outlined */}
<div className="space-y-1.5">
  {[
    { icon: CheckCircle2, label: 'Primary action', action: () => {}, primary: true },
    { icon: Edit3,        label: 'Secondary action', action: () => {}, primary: false },
  ].map(({ icon: Icon, label, action, primary }) => (
    <button key={label} onClick={action}
      className={cn(
        'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
        primary
          ? 'bg-ois-primary text-white hover:bg-ois-primary-hover'
          : 'border border-ois-border text-ois-text hover:bg-ois-surface-muted'
      )}>
      <Icon size={13} className={primary ? 'text-white' : 'text-ois-text-subtle'} />
      {label}
    </button>
  ))}
</div>
```

### Section content header (inside tab content, NOT SectionCard)
When a card inside tab content needs a label, use SectionCard. When a standalone header label is needed above a list:
```tsx
<p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-3">Section Name</p>
```
Never use `text-xs font-bold text-ois-text uppercase tracking-wider` — that pattern is wrong everywhere.

### Tags
```tsx
<span className="text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
  #{tag}
</span>
```

### Table headers
```tsx
<th className="px-4 py-3 text-left text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
  Column
</th>
```
Never `text-ois-text-muted` or `tracking-wider` in table `<th>`.

### Risk stripe colors (ChangeDetail / ReleaseDetail)
Use inline style, not Tailwind color class:
```ts
const RISK_COLOR: Record<string, string> = {
  low: '#12B76A', medium: '#F79009', high: '#F04438', critical: '#B42318',
};
// <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: RISK_COLOR[change.risk] }} />
```

---

## File Map

### Tier A — Full Layout Overhauls
| File | Lines | Key changes |
|------|-------|-------------|
| `src/routes/changes/ChangeDetail.tsx` | 654 | Outer wrapper, header, sidebar widths/borders, tab bar, SectionCard headers, quick actions |
| `src/routes/releases/ReleaseDetail.tsx` | 501 | Same as ChangeDetail |
| `src/routes/changes/CABWorkspace.tsx` | 699 | Outer wrapper, sidebar widths/borders, SectionCard headers — no status pill in nav (workspace, not entity) |
| `src/routes/improvement/ImprovementDetail.tsx` | 217 | Outer wrapper, header card → inline header, sticky sidebar → `overflow-y-auto border-l`, SectionCard headers |
| `src/routes/cmdb/CMDBDetail.tsx` | 488 | Entire restructure to 3-column — currently single column |
| `src/routes/deployments/DeploymentDetail.tsx` | 587 | Outer wrapper, two-column → three-column, header, sidebar |

### Tier B — SectionCard Header Sweep (non-overhaul pages)
Files using `bg-ois-bg` or `bg-ois-surface-muted/50` in section headers, or `text-sm font-bold text-ois-text` in section labels, or `tracking-wider` + `text-ois-text-muted` in section headers:

| File | Violation |
|------|-----------|
| `src/routes/Dashboard.tsx` | `px-5 py-3` padding, `bg-ois-bg` |
| `src/routes/monitoring/EventDetail.tsx` | `bg-ois-surface-muted/50` |
| `src/routes/testing/TestCases.tsx` | `bg-ois-surface-muted/50` |
| `src/routes/releases/ReleasePipeline.tsx` | `bg-ois-bg`, `py-3` |
| `src/routes/monitoring/CoverageReport.tsx` | `bg-ois-bg` |

### Tier C — Native `<select>` → FilterDropdown
26 files (listed in Task 8).

### Tier D — Typography Sweep (tracking-wider, text-ois-text-muted in headers)
26 files, 141 occurrences (listed in Task 9).

---

## Task 1: ChangeDetail — Full Layout Overhaul

**Files:**
- Modify: `src/routes/changes/ChangeDetail.tsx`

### What to change

The current layout is `<div className="flex gap-6 min-h-0">` — a flat 3-column that doesn't use the full-height shell. The header card (`<Card className="overflow-hidden">`) and top bar are separate, both inside the center column.

After this task the component should match the 3-column detail layout exactly.

- [ ] **Step 1: Replace the risk stripe map and outer structure**

Replace the `riskStripe` map at the top of the file:
```tsx
// REMOVE:
const riskStripe: Record<string, string> = {
  low: 'bg-emerald-400', medium: 'bg-amber-400', high: 'bg-red-500', critical: 'bg-red-700',
};

// ADD:
const RISK_COLOR: Record<string, string> = {
  low: '#12B76A', medium: '#F79009', high: '#F04438', critical: '#B42318',
};
```

- [ ] **Step 2: Add `useNavigate` usage (already imported) and replace return statement**

Replace the entire `return (...)` block (currently line 71 onward) with the 3-column shell. The key structural code:

```tsx
return (
  <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

    {/* Header */}
    <div className="bg-white border-b border-ois-border shrink-0 z-30">
      {/* Nav row */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
        <button onClick={() => navigate('/changes')}
          className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors">
          <ArrowLeft size={15} /> Calendar
        </button>
        <div className="flex items-center gap-2">
          <ChangeStatusPill status={changeStatus} />
          {/* Actions dropdown — keep existing actionsOpen logic, just re-style trigger */}
          <div className="relative">
            <button onClick={() => setActionsOpen(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
              <MoreHorizontal size={16} />
            </button>
            {actionsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setActionsOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[180px]">
                  {[
                    { label: 'Copy change ID', action: () => navigator.clipboard.writeText(change.publicId) },
                    { label: 'Copy link', action: () => navigator.clipboard.writeText(window.location.href) },
                  ].map(item => (
                    <button key={item.label} onClick={() => { item.action(); setActionsOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors text-ois-text">
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Entity header */}
      <div className="flex items-start gap-0">
        <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: RISK_COLOR[change.risk] }} />
        <div className="flex-1 px-6 py-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-semibold text-ois-text-muted">{change.publicId}</span>
            <ChangeTypeChip type={change.type} size="sm" />
            <RiskBadge risk={change.risk} score={change.riskScore} size="sm" />
          </div>
          <h1 className="text-xl font-bold text-ois-text leading-snug">{change.title}</h1>
          <div className="flex flex-wrap gap-1 mt-2">
            {change.tags.map(t => (
              <span key={t} className="text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-ois-text-muted mt-2">
            <span className="flex items-center gap-1"><Clock size={11} />{change.implementationWindow}</span>
            <span>Owner: <span className="font-medium text-ois-text">{change.ownerName}</span></span>
            <span>Created {formatRelative(change.createdAt)} by {change.requesterName}</span>
          </div>
        </div>
      </div>
    </div>

    {/* Body */}
    <div className="flex flex-1 min-h-0">

      {/* Left sidebar — 280px */}
      <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
        <SectionCard title="At a glance">
          <dl className="space-y-2 text-xs">
            {[
              { label: 'Status',  value: <ChangeStatusPill status={changeStatus} size="sm" /> },
              { label: 'Type',    value: <ChangeTypeChip type={change.type} size="sm" /> },
              { label: 'Risk',    value: <RiskBadge risk={change.risk} score={change.riskScore} size="sm" /> },
              { label: 'Impact',  value: <span className="capitalize font-medium text-ois-text">{change.impact}</span> },
              { label: 'Owner',   value: <span className="text-ois-text">{change.ownerName}</span> },
              { label: 'Created', value: <span className="text-ois-text-muted">{formatRelative(change.createdAt)}</span> },
              { label: 'Window',  value: <span className="text-ois-text text-[10px]">{change.implementationWindow}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <dt className="text-ois-text-subtle shrink-0">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        {change.riskFactors.length > 0 && (
          <SectionCard title="Risk factors">
            <ul className="space-y-1.5">
              {change.riskFactors.map(f => (
                <li key={f} className="text-xs text-ois-text flex items-start gap-1.5">
                  <span className="text-ois-text-subtle mt-0.5 shrink-0">•</span>{f}
                </li>
              ))}
            </ul>
          </SectionCard>
        )}

        <SectionCard title={`Approvals (${change.approvals.length})`}>
          <div className="flex gap-1 mb-2">
            {change.approvals.map((a, i) => (
              <div key={i} className={cn('w-5 h-5 rounded-full flex items-center justify-center',
                a.decision === 'approve' ? 'bg-ois-success' :
                a.decision === 'reject' ? 'bg-ois-danger' : 'bg-ois-border')}>
                {a.decision === 'approve' ? <CheckCircle2 size={11} className="text-white" /> :
                 a.decision === 'reject' ? <span className="text-white text-[9px] font-bold">✕</span> :
                 <Clock size={10} className="text-ois-text-subtle" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-ois-text-muted">{approvedCount} of {change.approvals.length} received</p>
          {change.cabSessionId && (
            <p className="text-[10px] text-ois-text-subtle mt-1 flex items-center gap-1">
              <Clock size={9} /> CAB Thu May 9 10:00 UTC
            </p>
          )}
        </SectionCard>
      </aside>

      {/* Center: pinned tab bar + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="border-b border-ois-border bg-white shrink-0 px-6">
          <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-ois-primary text-ois-primary font-bold'
                    : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong')}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* KEEP all existing tab content exactly as-is EXCEPT fix any card headers */}
          {/* Fix every: className="px-4 py-3 border-b border-ois-border bg-ois-bg" */}
          {/*       to:  className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted" */}
          {/* Fix every: <h3 className="text-sm font-bold text-ois-text"> */}
          {/*       to:  <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest"> */}
          {activeTab === 'overview' && <>{/* overview content */}</>}
          {/* ... rest of tabs ... */}
        </div>
      </div>

      {/* Right sidebar — 280px */}
      <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
        <SectionCard title="Quick actions">
          <div className="space-y-1.5">
            {[
              { label: 'Approve change',     action: () => setActiveTab('approvals'), primary: true },
              { label: 'Open CAB workspace', action: () => navigate('/changes/cab'), primary: false },
              { label: 'Reschedule',         action: () => setRescheduleOpen(true), primary: false },
            ].map(({ label, action, primary }) => (
              <button key={label} onClick={action}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                  primary ? 'bg-ois-primary text-white hover:bg-ois-primary-hover'
                           : 'border border-ois-border text-ois-text hover:bg-ois-surface-muted'
                )}>
                {label}
              </button>
            ))}
            <div className="pt-1 border-t border-ois-border">
              <button onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-danger hover:bg-ois-danger-pale">
                Cancel change
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Watchers">
          <div className="space-y-2">
            {[change.ownerName, ...change.approvals.map(a => a.approverName)]
              .filter((v, i, a) => a.indexOf(v) === i).slice(0, 5)
              .map(name => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-ois-primary-pale text-ois-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                    {name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-xs text-ois-text truncate">{name}</span>
                </div>
              ))}
          </div>
        </SectionCard>
      </aside>
    </div>

    {/* Modals — keep exactly as-is */}
    <Modal ...>{/* existing modal content */}</Modal>
    <RescheduleModal ...>{/* existing */}</RescheduleModal>
  </div>
);
```

- [ ] **Step 3: Add `SectionCard` local component**

Add above the `ChangeDetail` component function (line 30):
```tsx
const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);
```

- [ ] **Step 4: Remove unused imports**

Remove `Card`, `CardBody` from imports (replaced by `SectionCard`). Remove `Tabs` import (replaced by inline tab bar). Keep `Modal`, `Button`, all domain components.

- [ ] **Step 5: Fix all card headers inside tab content**

In the tab content (overview, plans, approvals, conflicts, linked, pir, history sections), every instance of:
```tsx
// WRONG — appears ~15 times in tab content
<div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
  <h3 className="text-sm font-bold text-ois-text">Title</h3>
</div>
```
Replace with SectionCard wrapper OR with correct header style:
```tsx
// RIGHT — wrap the entire card in SectionCard
<SectionCard title="Title">
  {/* content */}
</SectionCard>
```

- [ ] **Step 6: Verify**

```bash
npm run lint
```
Expected: no errors. Then open the app and navigate to any change detail page. Verify: full-height layout, sidebars have borders, tab bar is pinned, headers are muted gray.

- [ ] **Step 7: Commit**

```bash
git add src/routes/changes/ChangeDetail.tsx
git commit -m "fix(changes): apply design system 3-column layout to ChangeDetail"
```

---

## Task 2: ReleaseDetail — Full Layout Overhaul

**Files:**
- Modify: `src/routes/releases/ReleaseDetail.tsx`

Same structural violations as ChangeDetail. Current: `flex gap-6 min-h-0`, sidebar `w-60`/`w-52`, Card headers use `bg-ois-bg` + `py-3` + `text-sm font-bold`.

- [ ] **Step 1: Add RISK_COLOR / stripe map**

There's no risk on releases — use a release-type stripe instead, or a static neutral color. Add above component:
```tsx
// Release type stripe colors
const RELEASE_TYPE_COLOR: Record<string, string> = {
  major: '#B42318', minor: '#DC6803', patch: '#027A48', hotfix: '#F04438',
};
```

- [ ] **Step 2: Add SectionCard component**

```tsx
const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);
```

- [ ] **Step 3: Replace return statement with 3-column shell**

```tsx
return (
  <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

    {/* Header */}
    <div className="bg-white border-b border-ois-border shrink-0 z-30">
      {/* Nav row */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
        <button onClick={() => navigate('/releases')}
          className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors">
          <ArrowLeft size={15} /> Releases
        </button>
        <div className="flex items-center gap-2">
          <ReleaseStatusPill status={localStatus ?? release.status} />
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Entity header */}
      <div className="flex items-start gap-0">
        <div className="w-1 self-stretch shrink-0"
          style={{ backgroundColor: RELEASE_TYPE_COLOR[release.type] ?? '#475467' }} />
        <div className="flex-1 px-6 py-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-xs font-semibold text-ois-text-muted">{release.publicId}</span>
            <ReleaseTypeChip type={release.type} />
          </div>
          <h1 className="text-xl font-bold text-ois-text">
            {release.componentName} {release.version}
            {release.name && <span className="font-normal text-ois-text-muted text-base"> — {release.name}</span>}
          </h1>
          <div className="flex flex-wrap gap-1 mt-2">
            {release.tags.map(t => (
              <span key={t} className="text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
                {t}
              </span>
            ))}
          </div>
          <p className="text-xs text-ois-text-muted mt-2">
            Release manager: <span className="font-medium text-ois-text">{release.releaseManagerName}</span> ·
            Planned {formatDate(release.plannedReleaseDate, 'MMM d, HH:mm')} UTC
          </p>
        </div>
      </div>
    </div>

    {/* Body */}
    <div className="flex flex-1 min-h-0">

      {/* Left sidebar */}
      <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
        <SectionCard title="At a glance">
          <dl className="space-y-2 text-xs">
            {[
              { label: 'Status',    value: <ReleaseStatusPill status={localStatus ?? release.status} size="sm" /> },
              { label: 'Type',      value: <ReleaseTypeChip type={release.type} size="sm" /> },
              { label: 'Version',   value: <span className="font-mono font-bold text-ois-text">{release.version}</span> },
              { label: 'Component', value: <span className="text-ois-text">{release.componentName}</span> },
              { label: 'Manager',   value: <span className="text-ois-text">{release.releaseManagerName}</span> },
              { label: 'Planned',   value: <span className="text-ois-text-muted">{formatDate(release.plannedReleaseDate, 'MMM d, HH:mm')}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <dt className="text-ois-text-subtle shrink-0">{label}</dt>
                <dd className="text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard title="Pipeline">
          <StagesMiniStepper stages={release.stages} currentStageIndex={release.currentStageIndex} size="sm" />
        </SectionCard>

        <SectionCard title="Composition">
          <div className="space-y-1 text-xs text-ois-text-muted">
            <p>{release.composition.changes.length} change(s)</p>
            <p>{release.composition.problemsFixed.length} problem(s) fixed</p>
            <p>{release.composition.incidentsResolved.length} incident(s) resolved</p>
          </div>
        </SectionCard>
      </aside>

      {/* Center */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="border-b border-ois-border bg-white shrink-0 px-6">
          <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn('py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-ois-primary text-ois-primary font-bold'
                    : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong')}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* KEEP all existing tab content. Fix card headers:
              bg-ois-bg → bg-ois-surface-muted
              py-3 → py-2.5
              <h3 className="text-sm font-bold text-ois-text"> → wrap in SectionCard with title prop */}
          {activeTab === 'overview' && <>{/* overview */}</>}
          {/* ... */}
        </div>
      </div>

      {/* Right sidebar */}
      <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
        <SectionCard title="Quick actions">
          <div className="space-y-1.5">
            {[
              { label: 'Promote to staging', action: () => setPromoteModalOpen(true), primary: true },
              { label: 'Lock composition',   action: () => {},                         primary: false },
              { label: 'Add change',         action: () => {},                         primary: false },
            ].map(({ label, action, primary }) => (
              <button key={label} onClick={action}
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                  primary ? 'bg-ois-primary text-white hover:bg-ois-primary-hover'
                           : 'border border-ois-border text-ois-text hover:bg-ois-surface-muted'
                )}>
                {label}
              </button>
            ))}
            <div className="pt-1 border-t border-ois-border">
              <button onClick={() => setCancelModalOpen(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-danger hover:bg-ois-danger-pale">
                Cancel release
              </button>
            </div>
          </div>
        </SectionCard>
      </aside>
    </div>

    {/* Modals — keep existing */}
    {toast && <Toast message={toast.message} variant={toast.variant} />}
    {/* promote modal, cancel modal, deploy modal */}
  </div>
);
```

- [ ] **Step 4: Remove unused imports** — `Card`, `CardBody`, `Tabs`

- [ ] **Step 5: Fix tab content card headers** — same find/replace pattern as Task 1 Step 5

- [ ] **Step 6: Verify**
```bash
npm run lint
```

- [ ] **Step 7: Commit**
```bash
git add src/routes/releases/ReleaseDetail.tsx
git commit -m "fix(releases): apply design system 3-column layout to ReleaseDetail"
```

---

## Task 3: CABWorkspace — Layout Overhaul

**Files:**
- Modify: `src/routes/changes/CABWorkspace.tsx`

CABWorkspace is a 3-column collaborative workspace (not a standard entity detail). It does NOT need the full-height `shrink-0` pinned header pattern — the center column is a live agenda/workspace, not a tab panel. But it does need: outer `-m-6` wrapper with height, proper sidebar widths (280px), border separators, and SectionCard headers.

- [ ] **Step 1: Read the file**

Read `src/routes/changes/CABWorkspace.tsx` in full to understand current structure before editing.

- [ ] **Step 2: Replace outer wrapper**

Current (around line 458): `<div className="flex gap-5 min-h-0">`
Replace with:
```tsx
<div className="-m-6 flex bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
```
Note: no `flex-col` here — CABWorkspace keeps its horizontal 3-column flex directly. No pinned header since the workspace has no entity header.

- [ ] **Step 3: Fix left sidebar classes**

Current: `<div className="w-60 shrink-0 space-y-3">`
Replace with:
```tsx
<aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
```

- [ ] **Step 4: Fix right sidebar classes**

Current: `<div className="w-56 shrink-0 space-y-3">`
Replace with:
```tsx
<aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
```

- [ ] **Step 5: Fix center column wrapper**

Current: `<div className="flex-1 min-w-0">`
Ensure it is:
```tsx
<div className="flex-1 min-w-0 overflow-y-auto">
```

- [ ] **Step 6: Add SectionCard and fix all section headers**

Add `SectionCard` component above the main export (same pattern as Tasks 1–2).

Then find every instance of the wrong section header pattern:
```tsx
// WRONG — appears ~6 times
<div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
  <h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">Title</h3>
</div>
```
Wrap each card in `<SectionCard title="Title">` and remove the manual header div.

- [ ] **Step 7: Verify and commit**
```bash
npm run lint
git add src/routes/changes/CABWorkspace.tsx
git commit -m "fix(changes): apply design system layout to CABWorkspace"
```

---

## Task 4: ImprovementDetail — Layout Overhaul

**Files:**
- Modify: `src/routes/improvement/ImprovementDetail.tsx`

Current: 2-column layout (`flex gap-5`), custom card-based header (`border border-ois-border rounded-xl bg-ois-surface p-5 mb-5`), right sidebar uses `sticky top-4` instead of `overflow-y-auto border-l`. SectionCard headers use `px-3 py-2 bg-ois-surface-muted/50` + `text-[10px] font-bold text-ois-text-muted`.

This page has a real left-side tab panel (65%) + right sidebar (35%). Convert to 3-column: add an empty left sidebar or collapse it — actually this page has no left sidebar data, so use 2-column with a wider center. **Exception:** ImprovementDetail legitimately has no left sidebar, so use the layout with just left-sidebar absent — center takes left area.

Actually: looking at the page, it has rich right sidebar content. The correct approach: give it the full-height outer wrapper but use a 2-column body (center + right sidebar). No left sidebar.

- [ ] **Step 1: Replace outer wrapper and top bar**

Current: `<div className="flex flex-col min-h-full pb-8">` + top bar div.

Replace the outer wrapper and top bar with:
```tsx
<div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

  {/* Header */}
  <div className="bg-white border-b border-ois-border shrink-0 z-30">
    {/* Nav row */}
    <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
      <button onClick={() => navigate('/improvement')}
        className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors">
        <ArrowLeft size={15} /> Register
      </button>
      <div className="flex items-center gap-2">
        <ImprovementStatusPill status={initiative.status} />
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
          <MoreVertical size={16} />
        </button>
      </div>
    </div>

    {/* Entity header */}
    <div className="flex items-start gap-0">
      <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: priorityMeta.color }} />
      <div className="flex-1 px-6 py-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-xs font-semibold text-ois-text-muted">{initiative.publicId}</span>
          <ImprovementCategoryChip category={initiative.category} />
        </div>
        <h1 className="text-xl font-bold text-ois-text leading-tight">{initiative.title}</h1>
        <div className="flex items-center gap-3 mt-2 text-xs text-ois-text-muted flex-wrap">
          <span className="flex items-center gap-1.5">
            <ImprovementPriorityDot priority={initiative.priority} />
            <span style={{ color: priorityMeta.color }} className="font-semibold">{priorityMeta.label}</span>
          </span>
          <span>·</span>
          <span>Owner: <strong className="text-ois-text">{initiative.ownerName}</strong></span>
          {initiative.startedAt && <><span>·</span><span>Started {formatDate(initiative.startedAt, 'MMM d, yyyy')}</span></>}
          {initiative.targetCompletionDate && <><span>·</span><span>Target {formatDate(initiative.targetCompletionDate, 'MMM d, yyyy')}</span></>}
        </div>
      </div>
    </div>
  </div>

  {/* Body — 2-column (no left sidebar for Improvement) */}
  <div className="flex flex-1 min-h-0">

    {/* Center: pinned tab bar + scrollable content */}
    <div className="flex flex-col flex-1 min-w-0">
      <div className="border-b border-ois-border bg-white shrink-0 px-6">
        <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
          {tabsWithCount.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('py-4 px-1 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'border-ois-primary text-ois-primary font-bold'
                  : 'border-transparent text-ois-text-muted hover:text-ois-text hover:border-ois-border-strong')}>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* keep existing tab content */}
        {activeTab === 'overview' && <OverviewTab initiative={initiative} />}
        {activeTab === 'progress' && <ProgressTab initiative={initiative} onLogUpdate={handleLogUpdate} />}
        {activeTab === 'metrics' && <MetricsTab initiative={initiative} />}
        {activeTab === 'roi' && <ROITab initiative={initiative} roiCalc={roiCalc} />}
        {activeTab === 'linked' && <LinkedItemsTab initiative={initiative} />}
        {activeTab === 'updates' && <UpdatesTab initiative={initiative} onAddUpdate={() => {}} />}
      </div>
    </div>

    {/* Right sidebar */}
    <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
      <SectionCard title="At a glance">
        {/* existing meta rows — keep content, just wrap */}
      </SectionCard>
      <ROISummaryPanel initiative={initiative} roiCalc={roiCalc} onViewROI={() => setActiveTab('roi')} />
      <SectionCard title="Quick actions">
        <div className="space-y-1.5">
          {[
            { label: 'Log update', action: () => setActiveTab('updates'), primary: true },
          ].map(({ label, action, primary }) => (
            <button key={label} onClick={action}
              className={cn('flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left',
                primary ? 'bg-ois-primary text-white hover:bg-ois-primary-hover'
                         : 'border border-ois-border text-ois-text hover:bg-ois-surface-muted')}>
              {label}
            </button>
          ))}
          <Link to="/improvement/kanban"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-text hover:bg-ois-surface-muted">
            Move to Kanban <ArrowRight size={11} />
          </Link>
          <div className="pt-1 border-t border-ois-border">
            <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left border border-ois-border text-ois-text-muted hover:bg-ois-surface-muted">
              Mark as complete
            </button>
          </div>
        </div>
      </SectionCard>
    </aside>
  </div>
</div>
```

- [ ] **Step 2: Add `useNavigate` import** — add `useNavigate` to the react-router import line (currently only has `useParams` and `Link`):
```tsx
import { useParams, Link, useNavigate } from 'react-router-dom';
```
And add `const navigate = useNavigate();` inside the component before the `if (!initiative)` guard.

- [ ] **Step 3: Add SectionCard component** above the `ImprovementDetail` function.

- [ ] **Step 4: Verify and commit**
```bash
npm run lint
git add src/routes/improvement/ImprovementDetail.tsx
git commit -m "fix(improvement): apply design system 3-column layout to ImprovementDetail"
```

---

## Task 5: CMDBDetail — Layout Overhaul

**Files:**
- Modify: `src/routes/cmdb/CMDBDetail.tsx`

Current: Single-column `space-y-6 pb-20`. Tabs used without sidebars. This needs a proper 3-column layout.

- [ ] **Step 1: Read the file in full**

```bash
cat -n src/routes/cmdb/CMDBDetail.tsx
```

- [ ] **Step 2: Add SectionCard**

Add above the `CMDBDetail` export:
```tsx
const SectionCard: React.FC<{ title?: string; children: React.ReactNode; className?: string }> = ({
  title, children, className,
}) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    {title && (
      <div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
        <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">{title}</p>
      </div>
    )}
    <div className="p-4">{children}</div>
  </div>
);
```

- [ ] **Step 3: Replace outer wrapper and restructure**

Current wrapper `<div className="space-y-6 pb-20">` + standalone header.

Replace with full-height 3-column. The CI type determines stripe color:
```tsx
const CI_TYPE_COLOR: Record<string, string> = {
  server: '#1F4FD4', application: '#0BA5EC', database: '#DC6803',
  load_balancer: '#6941C6', service: '#027A48', network: '#475467',
  storage: '#F79009', endpoint: '#B42318',
};
const stripeColor = CI_TYPE_COLOR[ci.type] ?? '#475467';
```

Outer wrapper:
```tsx
<div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
  {/* Header */}
  <div className="bg-white border-b border-ois-border shrink-0 z-30">
    {/* Nav row */}
    <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
      <button onClick={() => navigate('/cmdb')}
        className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors">
        <ArrowLeft size={15} /> CMDB
      </button>
      <div className="flex items-center gap-2">
        {/* Keep existing edit/more buttons, re-styled */}
        {editMode ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSave}>Save</Button>
          </>
        ) : (
          <Button variant="outline" size="sm" className="gap-2 h-9" onClick={startEdit}>
            <Edit2 size={14} /> Edit
          </Button>
        )}
        <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors"
          onClick={() => setMoreOpen(v => !v)}>
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>

    {/* Entity header */}
    <div className="flex items-start gap-0">
      <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: stripeColor }} />
      <div className="flex-1 px-6 py-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-mono text-xs font-semibold text-ois-text-muted">{ci.publicId}</span>
          <CITypeIcon type={ci.type} size={14} />
          <CIStatusBadge status={ci.status} />
        </div>
        <h1 className="text-xl font-bold text-ois-text leading-tight">{ci.name}</h1>
        <p className="text-xs text-ois-text-muted mt-2">
          {ci.type} · {ci.environment} · {service?.name ?? '—'}
        </p>
      </div>
    </div>
  </div>

  {/* Body */}
  <div className="flex flex-1 min-h-0">
    {/* Left sidebar — CIQuickFactsCard goes here */}
    <aside className="w-[280px] shrink-0 overflow-y-auto border-r border-ois-border bg-white p-4 space-y-4">
      <CIQuickFactsCard ci={ci} service={service} />
      {/* relationships summary */}
    </aside>

    {/* Center: pinned tab bar + scrollable content */}
    <div className="flex flex-col flex-1 min-w-0">
      <div className="border-b border-ois-border bg-white shrink-0 px-6">
        <nav className="flex gap-8 overflow-x-auto scrollbar-hide">
          {/* existing tabs array, inline buttons */}
        </nav>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* existing tab content */}
      </div>
    </div>

    {/* Right sidebar — monitoring rules, quick links */}
    <aside className="w-[280px] shrink-0 overflow-y-auto border-l border-ois-border bg-white p-4 space-y-4">
      {/* monitoring rules, JSON export, etc. */}
    </aside>
  </div>
</div>
```

- [ ] **Step 4: Move content to sidebars**

Identify what currently lives in the standalone header section and move to left/right sidebars as SectionCards. The existing `<CIQuickFactsCard>` component can go directly in the left sidebar. Monitoring rules and audit log can go in the right sidebar.

- [ ] **Step 5: Replace `Tabs` with inline tab bar** — same pattern as Tasks 1–4.

- [ ] **Step 6: Verify and commit**
```bash
npm run lint
git add src/routes/cmdb/CMDBDetail.tsx
git commit -m "fix(cmdb): apply design system 3-column layout to CMDBDetail"
```

---

## Task 6: DeploymentDetail — Layout Overhaul

**Files:**
- Modify: `src/routes/deployments/DeploymentDetail.tsx`

Current: `min-h-screen bg-ois-bg pb-20` outer + 2-column `flex gap-6` body. Has a `StickyActionBar` component stuck to the bottom using `sticky bottom-0 z-20`. This page has a live deployment view, so the sticky action bar is important UX — preserve it.

- [ ] **Step 1: Read the file in full**

```bash
cat -n src/routes/deployments/DeploymentDetail.tsx
```

- [ ] **Step 2: Replace outer wrapper**

Current: `<div className="min-h-screen bg-ois-bg pb-20">`
Replace with:
```tsx
<div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>
```

- [ ] **Step 3: Restructure header**

The current sticky top bar becomes the pinned header:
```tsx
<div className="bg-white border-b border-ois-border shrink-0 z-30">
  <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
    <button onClick={() => navigate('/deployments')}
      className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors">
      <ArrowLeft size={15} /> Deployments
    </button>
    <div className="flex items-center gap-2">
      {/* status pill */}
      <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-ois-border bg-white text-sm text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
        <MoreVertical size={16} />
      </button>
    </div>
  </div>
  {/* DeploymentHero goes here — it's the entity header */}
  <DeploymentHero deployment={deployment} />
</div>
```

- [ ] **Step 4: Wrap body in flex container**

```tsx
<div className="flex flex-col flex-1 min-h-0">
  {/* Scrollable main content */}
  <div className="flex-1 overflow-y-auto">
    {/* existing content: DeploymentStages, tab content, etc. */}
  </div>
  {/* StickyActionBar stays at bottom — preserve as-is */}
  <StickyActionBar deployment={deployment} onRollback={handleRollback} onRedeploy={handleRedeploy} />
</div>
```

- [ ] **Step 5: Fix table/meta header typography**

`MetaRow` in this file uses `tracking-wide` in the `<td>` — update to `tracking-widest`:
```tsx
// CURRENT:
<td className="py-3 pr-6 text-xs font-semibold text-ois-text-muted uppercase tracking-wide whitespace-nowrap w-40 align-top">
// CORRECT:
<td className="py-3 pr-6 text-xs font-semibold text-ois-text-subtle uppercase tracking-widest whitespace-nowrap w-40 align-top">
```

- [ ] **Step 6: Verify and commit**
```bash
npm run lint
git add src/routes/deployments/DeploymentDetail.tsx
git commit -m "fix(deployments): apply design system layout to DeploymentDetail"
```

---

## Task 7: SectionCard Header Sweep — Non-Overhaul Pages

**Files:**
- Modify: `src/routes/Dashboard.tsx`
- Modify: `src/routes/monitoring/EventDetail.tsx`
- Modify: `src/routes/testing/TestCases.tsx`
- Modify: `src/routes/releases/ReleasePipeline.tsx`
- Modify: `src/routes/monitoring/CoverageReport.tsx`

These pages don't need a full layout overhaul but have wrong section headers.

The two violation patterns to fix in every file:

**Pattern A** — Wrong background and padding:
```tsx
// WRONG:
<div className="px-4 py-3 border-b border-ois-border bg-ois-bg">
<div className="px-4 py-3 border-b border-ois-border bg-ois-surface-muted/40">
<div className="px-3 py-2 bg-ois-surface-muted/50 border-b border-ois-border">
// CORRECT:
<div className="px-4 py-2.5 border-b border-ois-border bg-ois-surface-muted">
```

**Pattern B** — Wrong section label typography:
```tsx
// WRONG:
<h3 className="text-sm font-bold text-ois-text">Title</h3>
<h3 className="text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">Title</h3>
<p className="text-[10px] font-bold text-ois-text-muted uppercase tracking-widest">Title</p>
// CORRECT:
<p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">Title</p>
```

- [ ] **Step 1: Fix Dashboard.tsx**

Read the file, apply Pattern A and B fixes to all section headers. There are approximately 4–6 section headers in the dashboard.

- [ ] **Step 2: Fix EventDetail.tsx**

Read the file, apply fixes. EventDetail uses `bg-ois-surface-muted/50` pattern (semi-transparent — wrong).

- [ ] **Step 3: Fix TestCases.tsx**

Read the file, apply fixes.

- [ ] **Step 4: Fix ReleasePipeline.tsx**

Read the file, apply fixes. Uses `bg-ois-bg` + `py-3`.

- [ ] **Step 5: Fix CoverageReport.tsx**

Read the file, apply fixes.

- [ ] **Step 6: Verify all**
```bash
npm run lint
```

- [ ] **Step 7: Commit**
```bash
git add src/routes/Dashboard.tsx src/routes/monitoring/EventDetail.tsx src/routes/testing/TestCases.tsx src/routes/releases/ReleasePipeline.tsx src/routes/monitoring/CoverageReport.tsx
git commit -m "fix(ui): standardise SectionCard headers across dashboard and monitoring pages"
```

---

## Task 8: Native `<select>` → FilterDropdown Sweep

**Files (26 total):**
```
src/routes/availability/Outages.tsx
src/routes/availability/SLATargets.tsx
src/routes/capacity/CapacityThresholds.tsx
src/routes/changes/ChangeCalendar.tsx
src/routes/continuity/DRPlans.tsx
src/routes/continuity/DRTests.tsx
src/routes/deployments/DeploymentsQueue.tsx
src/routes/deployments/Environments.tsx
src/routes/improvement/ImprovementHeatmap.tsx
src/routes/improvement/ImprovementKanban.tsx
src/routes/improvement/ImprovementRegister.tsx
src/routes/kb/KBEditor.tsx
src/routes/measurement/MetricCatalog.tsx
src/routes/measurement/Reports.tsx
src/routes/monitoring/AlertRouting.tsx
src/routes/monitoring/EventStream.tsx
src/routes/monitoring/MonitoringRules.tsx
src/routes/portal/CatalogItemDetail.tsx
src/routes/portal/MyRequests.tsx
src/routes/releases/ReleaseNotes.tsx
src/routes/releases/ReleasesList.tsx
src/routes/requests/RequestQueue.tsx
src/routes/testing/SignOffQueue.tsx
src/routes/testing/TestCases.tsx
src/routes/testing/TestPlans.tsx
src/routes/testing/TestRuns.tsx
```

**The transformation for every file:**

1. Add import: `import { FilterDropdown } from '@/src/components/ui/FilterDropdown';`
   (or `'../../components/ui/FilterDropdown'` — match the existing import style in that file)

2. For each `<select>`:
```tsx
// BEFORE:
<select
  value={filter}
  onChange={e => setFilter(e.target.value as SomeType)}
  className="h-9 px-3 text-sm border border-ois-border rounded-lg bg-white text-ois-text focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
>
  <option value="all">All items</option>
  {ITEMS.map(s => (
    <option key={s} value={s}>{labelMap[s]}</option>
  ))}
</select>

// AFTER:
<FilterDropdown
  value={filter}
  onChange={v => setFilter(v as SomeType)}
  options={[
    { value: 'all', label: 'All items' },
    ...ITEMS.map(s => ({ value: s, label: labelMap[s] })),
  ]}
  placeholder="All items"
/>
```

Note: The `FilterDropdown` trigger has `h-8` (not `h-9`). This is correct by design — don't force `h-9`.

- [ ] **Step 1: Process files 1–9** (availability, capacity, changes, continuity, deployments group):
  - `Outages.tsx`, `SLATargets.tsx`, `CapacityThresholds.tsx`, `ChangeCalendar.tsx`, `DRPlans.tsx`, `DRTests.tsx`, `DeploymentsQueue.tsx`, `Environments.tsx`, `ImprovementHeatmap.tsx`
  - For each: read → add import → replace all `<select>` → verify `npm run lint`

- [ ] **Step 2: Process files 10–18** (improvement, kb, measurement, monitoring group):
  - `ImprovementKanban.tsx`, `ImprovementRegister.tsx`, `KBEditor.tsx`, `MetricCatalog.tsx`, `Reports.tsx`, `AlertRouting.tsx`, `EventStream.tsx`, `MonitoringRules.tsx`, `CatalogItemDetail.tsx`

- [ ] **Step 3: Process files 19–26** (portal, releases, requests, testing group):
  - `MyRequests.tsx`, `ReleaseNotes.tsx`, `ReleasesList.tsx`, `RequestQueue.tsx`, `SignOffQueue.tsx`, `TestCases.tsx`, `TestPlans.tsx`, `TestRuns.tsx`

- [ ] **Step 4: Verify**
```bash
npm run lint
```

- [ ] **Step 5: Commit**
```bash
git add src/routes/
git commit -m "fix(ui): replace native select with FilterDropdown across all list pages"
```

---

## Task 9: Typography Sweep — tracking-widest and text-ois-text-subtle in Headers

**Files** (26 files with `tracking-wider` violations, 141 total occurrences):
```
src/routes/availability/Outages.tsx
src/routes/changes/CABWorkspace.tsx        ← already fixed in Task 3
src/routes/changes/ChangeCalendar.tsx
src/routes/changes/ChangeDetail.tsx        ← already fixed in Task 1
src/routes/changes/NewChange.tsx
src/routes/cmdb/CMDBDetail.tsx             ← already fixed in Task 5
src/routes/Dashboard.tsx                   ← partially fixed in Task 7
src/routes/deployments/DeploymentsQueue.tsx
src/routes/deployments/Environments.tsx
src/routes/improvement/BenefitTracker.tsx
src/routes/improvement/ImprovementRegister.tsx
src/routes/kb/ArticleView.tsx
src/routes/kb/KBBrowse.tsx
src/routes/kb/KBEditor.tsx
src/routes/measurement/Reports.tsx
src/routes/monitoring/AlertRouting.tsx
src/routes/monitoring/CoverageReport.tsx   ← already fixed in Task 7
src/routes/monitoring/EventDetail.tsx      ← already fixed in Task 7
src/routes/monitoring/MonitoringRules.tsx
src/routes/portal/CatalogItemDetail.tsx
src/routes/portal/Catalog.tsx
src/routes/portal/PortalHome.tsx
src/routes/releases/ReleaseDetail.tsx      ← already fixed in Task 2
src/routes/releases/ReleasePipeline.tsx    ← already fixed in Task 7
src/routes/requests/RequestQueue.tsx
src/routes/testing/TestRuns.tsx
```

**The fix in every file — two patterns:**

**In table `<th>` elements:**
```tsx
// WRONG:
className="... text-ois-text-muted uppercase tracking-wider"
// CORRECT:
className="... text-ois-text-subtle uppercase tracking-widest"
```

**In section label `<p>` or `<h3>` elements (not table headers):**
```tsx
// WRONG:
<h3 className="... font-bold text-ois-text ... tracking-wider">
// CORRECT:
<p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest">
```

**DO NOT touch:**
- `tracking-widest` occurrences (already correct)
- `tracking-wide` in `LinkedCard` or `HistoryItem` (these are 2-word labels, not section headers)
- Any file already fixed in Tasks 1–7

- [ ] **Step 1: Process files not yet touched** (NewChange, ChangeCalendar, Outages, DeploymentsQueue, Environments, BenefitTracker, ImprovementRegister, kb files, measurement, monitoring, portal, RequestQueue, TestRuns):

For each file:
1. Run `grep -n "tracking-wider" <file>` to find all occurrences
2. Check each one — table `<th>` or section label?
3. Apply the correct fix
4. Verify with `npm run lint`

- [ ] **Step 2: Verify all at once**
```bash
npm run lint
# Also grep to confirm no remaining tracking-wider (except intentional ones):
grep -rn "tracking-wider\b" src/routes/ --include="*.tsx" | grep -v "tracking-widest"
```
Expected: 0 results (or only legitimate non-header uses).

- [ ] **Step 3: Commit**
```bash
git add src/routes/
git commit -m "fix(ui): standardise table header typography to tracking-widest and text-ois-text-subtle"
```

---

## Verification Checklist

After all tasks are done, run through these visual checks on the running app (`npm run dev`):

- [ ] Navigate to `/changes/<id>` — full-height 3-column, pinned tab bar, sidebar borders visible
- [ ] Navigate to `/releases/<id>` — same as above, type stripe visible
- [ ] Navigate to `/changes/cab` — full-height, 280px sidebars with borders
- [ ] Navigate to `/improvement/<id>` — full-height, right sidebar scrolls independently
- [ ] Navigate to `/cmdb/<id>` — full-height, CI type stripe, sidebars visible
- [ ] Navigate to `/deployments/<id>` — full-height, sticky action bar still at bottom
- [ ] Open any filter bar (Outages, DeploymentsQueue, etc.) — FilterDropdown instead of `<select>`
- [ ] Open any list page with a table — headers are `text-ois-text-subtle tracking-widest`
- [ ] Open any detail page sidebar — section card headers are `px-4 py-2.5 bg-ois-surface-muted`
- [ ] Run `npm run lint` — zero errors

---

## Self-Review

**Spec coverage check:**
- ✅ All 6 detail pages get layout overhaul (Tasks 1–6)
- ✅ SectionCard header pattern applied everywhere (Tasks 1–7)
- ✅ Quick actions pattern applied in all detail pages (Tasks 1–6)
- ✅ Native selects replaced (Task 8)
- ✅ Typography standardised (Task 9)
- ✅ Tag styling fixed (included in Tasks 1–4 header rewrites)

**Placeholder scan:** No TBD/TODO in tasks. Each step has exact code or exact grep command.

**Type consistency:**
- `SectionCard` props: `{ title?: string; children: React.ReactNode; className?: string }` — consistent across all tasks
- `RISK_COLOR` map defined in Task 1 (used in Task 1 only); `RELEASE_TYPE_COLOR` in Task 2 (used in Task 2 only)
- `FilterDropdown` import path matches each file's existing import style
