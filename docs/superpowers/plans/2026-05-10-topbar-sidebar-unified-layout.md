# Unified TopBar & Seamless Sidebar Layout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move AI routes inside AppShell so both modes share one layout shell, enabling a slide-animated sidebar swap and a uniform TopBar with always-visible brand.

**Architecture:** AppShell becomes the single layout owner. It holds an `aiSidebarContent` slot (React node) and passes a setter to child routes via `<Outlet context>`. `AiWorkspace` uses `useOutletContext()` to inject `<AiSidebarPanel>` into that slot whenever its session state changes. AppShell renders the slot inside an `AnimatePresence` block that slides between the management `Sidebar` and the AI panel. State ownership stays in `AiWorkspace` — no lifting required.

**Tech Stack:** React 18, React Router v6 (`useOutletContext`), Framer Motion (`motion/react`), Tailwind CSS 4, TypeScript

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/components/ai/AiSidebarPanel.tsx` | **Create** | Left panel: domain selector + session list; receives props directly |
| `src/routes/ai/AiWorkspace.tsx` | **Modify** | Remove TopBar + left panel JSX; inject AiSidebarPanel via useOutletContext |
| `src/components/layout/AppShell.tsx` | **Modify** | Add `aiSidebarContent` slot, pass setter via Outlet context, AnimatePresence sidebar swap |
| `src/components/layout/TopBar.tsx` | **Modify** | Always show brand lockup; breadcrumb hidden on AI route |
| `src/routes/index.tsx` | **Modify** | Move `/ai` and `/ai/:sessionId` under AppShell children |

---

### Task 1: Create `AiSidebarPanel`

**Files:**
- Create: `src/components/ai/AiSidebarPanel.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/ai/AiSidebarPanel.tsx
import React from 'react';
import type { AiDomain, AiSession } from '@/src/types/ai';
import { AiDomainSelector } from './AiDomainSelector';
import { AiSessionListItem } from './AiSessionListItem';

interface AiSidebarPanelProps {
  sessions: AiSession[];
  activeSessionId: string;
  activeDomain: AiDomain;
  onSessionSelect: (id: string) => void;
  onNewSession: () => void;
  onDomainChange: (domain: AiDomain) => void;
}

export const AiSidebarPanel: React.FC<AiSidebarPanelProps> = ({
  sessions,
  activeSessionId,
  activeDomain,
  onSessionSelect,
  onNewSession,
  onDomainChange,
}) => (
  <div className="w-[240px] flex-shrink-0 flex flex-col overflow-hidden bg-ois-surface h-full">
    {/* Domain Selector */}
    <div className="p-3 border-b border-ois-border">
      <AiDomainSelector
        activeDomain={activeDomain}
        onDomainChange={onDomainChange}
      />
    </div>

    {/* Session list */}
    <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">
          Sesi
        </span>
        <button
          type="button"
          onClick={onNewSession}
          className="text-[11px] text-ois-primary hover:underline"
        >
          + Baru
        </button>
      </div>
      {sessions.map((session) => (
        <AiSessionListItem
          key={session.id}
          session={session}
          isActive={session.id === activeSessionId}
          onClick={() => onSessionSelect(session.id)}
        />
      ))}
    </div>
  </div>
);
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ai/AiSidebarPanel.tsx
git commit -m "feat: add AiSidebarPanel component"
```

---

### Task 2: Refactor `AiWorkspace` — remove TopBar + left panel, inject sidebar via outlet context

**Files:**
- Modify: `src/routes/ai/AiWorkspace.tsx`

- [ ] **Step 1: Update imports**

Remove:
```tsx
import { TopBar } from '@/src/components/layout/TopBar';
```

Add after existing AI component imports:
```tsx
import { useOutletContext } from 'react-router-dom';
import { AiSidebarPanel } from '@/src/components/ai/AiSidebarPanel';
```

- [ ] **Step 2: Add outlet context type and hook inside the component**

At the top of the `AiWorkspace` function body, after the existing hooks, add:

```tsx
  const { setAiSidebarContent } = useOutletContext<{
    setAiSidebarContent: (node: React.ReactNode) => void;
  }>();
```

- [ ] **Step 3: Add useEffect to inject AiSidebarPanel into the sidebar slot**

After the existing `useEffect` blocks (around line 60), add:

```tsx
  // Inject the AI session panel into AppShell's sidebar slot
  useEffect(() => {
    setAiSidebarContent(
      <AiSidebarPanel
        sessions={sessions}
        activeSessionId={activeSessionId}
        activeDomain={activeDomain}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onDomainChange={setActiveDomain}
      />
    );
  }, [sessions, activeSessionId, activeDomain]);

  // Clear sidebar slot on unmount
  useEffect(() => {
    return () => setAiSidebarContent(null);
  }, []);
```

- [ ] **Step 4: Replace the render return**

Replace the entire `return (...)` block with (removes the outer `flex flex-col h-screen` wrapper and `<TopBar>`, removes the left panel div, keeps chat + right panel):

```tsx
  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
      {/* ── Chat Area ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Context breadcrumb */}
        <div className="h-10 flex items-center justify-between px-4 border-b border-ois-border flex-shrink-0">
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-ois-text-subtle">{getDomainLabel(activeDomain)}</span>
            <span className="text-ois-border-strong">›</span>
            <span className="text-ois-text font-medium truncate max-w-[200px]">
              {activeSession?.title ?? 'Sesi baru'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleResetSession}
            className="text-[11px] text-ois-text-muted hover:text-ois-text transition-colors"
          >
            Reset sesi
          </button>
        </div>

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0">
          {messages.length === 0 ? (
            <AiEmptyState domain={activeDomain} onSuggestionClick={handleSend} />
          ) : (
            messages.map((msg) => renderMessage(msg))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-ois-border p-3 flex-shrink-0">
          <AiInputBar onSend={handleSend} placeholder="Tanya atau instruksikan..." />
        </div>
      </div>

      {/* ── Right Panel ─────────────────────────────────────────────────── */}
      <div className="w-[210px] flex-shrink-0 border-l border-ois-border flex flex-col overflow-hidden bg-ois-surface">
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 min-h-0">
          {/* Pending Drafts */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">
                Pending drafts
              </span>
              {pendingDrafts.length > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-800 rounded-full px-1.5 leading-none py-0.5">
                  {pendingDrafts.length}
                </span>
              )}
            </div>
            {pendingDrafts.length === 0 ? (
              <p className="text-[11px] text-ois-text-subtle">Tidak ada draft menunggu</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pendingDrafts.map(({ msgId, payload }) => (
                  <AiPendingDraftItem
                    key={msgId}
                    payload={payload}
                    onConfirm={() => updateMessageDraftStatus(msgId, 'confirmed')}
                    onCancel={() => updateMessageDraftStatus(msgId, 'cancelled')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Saved today */}
          <div>
            <div className="mb-2">
              <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">
                Tersimpan hari ini
              </span>
            </div>
            {confirmedDrafts.length === 0 ? (
              <p className="text-[11px] text-ois-text-subtle">Belum ada</p>
            ) : (
              <div className="flex flex-col gap-0.5">
                {confirmedDrafts.map(({ msgId, payload, createdAt }) => (
                  <div key={msgId} className="flex items-center gap-1.5 py-1">
                    <span className="text-[#12B76A] text-[11px] flex-shrink-0">✓</span>
                    <Link
                      to={payload.kind === 'draft_ci' ? `/cmdb/${payload.publicId}` : '/kb'}
                      className="text-[11px] text-ois-text hover:text-ois-primary truncate flex-1 min-w-0"
                    >
                      {payload.kind === 'draft_ci' ? payload.name : payload.title}
                    </Link>
                    <span className="text-[10px] text-ois-text-subtle flex-shrink-0">
                      {formatAiTime(createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completeness panel (CMDB only) */}
          {activeDomain === 'cmdb' && (
            <div className="border-t border-ois-border pt-3">
              <AiCompletenessPanel onFillWithAI={handleSend} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
```

- [ ] **Step 5: Verify lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/routes/ai/AiWorkspace.tsx
git commit -m "refactor: AiWorkspace removes TopBar and left panel, injects sidebar via outlet context"
```

---

### Task 3: Refactor `AppShell` — animated sidebar slot + outlet context

**Files:**
- Modify: `src/components/layout/AppShell.tsx`

- [ ] **Step 1: Add `AiSidebarPanel` import**

At the top of `src/components/layout/AppShell.tsx`, add after existing imports:

```tsx
import { AiSidebarPanel } from '@/src/components/ai/AiSidebarPanel';
```

Note: `useLocation`, `AnimatePresence`, and `motion` are already imported — do not duplicate them.

- [ ] **Step 2: Add `aiSidebarContent` state**

Inside the `AppShell` component, after existing state declarations, add:

```tsx
  const [aiSidebarContent, setAiSidebarContent] = useState<React.ReactNode>(null);
  const location = useLocation();
  const isAiRoute = location.pathname.startsWith('/ai');
```

Note: if `useLocation` and `isAiRoute` are already declared, skip duplicates.

- [ ] **Step 3: Replace the full return JSX**

Replace the entire `return (...)` with:

```tsx
  return (
    <div className="flex h-screen w-full bg-ois-bg overflow-hidden">
      {/* Sidebar slot — slides between management nav and AI panel */}
      <AnimatePresence mode="wait">
        {isAiRoute ? (
          <motion.div
            key="ai-sidebar"
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="flex-shrink-0 h-full border-r border-ois-border overflow-hidden"
          >
            {aiSidebarContent}
          </motion.div>
        ) : (
          <motion.div
            key="mgmt-sidebar"
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="flex-shrink-0 h-full"
          >
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <TopBar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenInbox={() => setInboxOpen(true)}
        />

        <main className={isAiRoute ? 'flex-1 overflow-hidden flex min-h-0' : 'flex-1 overflow-y-auto p-6'}>
          <Outlet context={{ setAiSidebarContent }} />
        </main>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {inboxOpen && (
          <InboxDrawer onClose={() => setInboxOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aiPanelOpen && !isAiRoute && (
          <AiQuickPanel onClose={() => setAiPanelOpen(false)} />
        )}
      </AnimatePresence>

      {/* Floating AI Quick Assist button */}
      {!isAiRoute && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="relative group">
            {!aiPanelOpen && (
              <span
                className="absolute inset-0 rounded-full animate-ping"
                style={{
                  backgroundColor: 'rgba(31, 79, 212, 0.25)',
                  animationDuration: '2.5s',
                  animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
                }}
              />
            )}
            <span
              className="absolute inset-[-4px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'radial-gradient(circle, rgba(31,79,212,0.2) 0%, transparent 70%)' }}
            />
            <motion.button
              onClick={() => setAiPanelOpen(v => !v)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={cn(
                'relative w-11 h-11 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#185FA5]/40 transition-colors duration-200',
                aiPanelOpen ? 'bg-[#1F4FD4]' : 'bg-[#185FA5] hover:bg-[#1F4FD4]'
              )}
              aria-label="AI Quick Assist"
              aria-expanded={aiPanelOpen}
              type="button"
            >
              <motion.div
                animate={{ rotate: aiPanelOpen ? 20 : 0, scale: aiPanelOpen ? 0.9 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Sparkles size={20} className="text-white" />
              </motion.div>
            </motion.button>
            <div className="absolute bottom-[52px] right-0 px-2.5 py-1.5 bg-ois-text text-white rounded-md text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none shadow-lg">
              AI Quick Assist <span className="opacity-60 ml-1">⌘K</span>
              <div className="absolute bottom-[-4px] right-4 w-2 h-2 bg-ois-text rotate-45" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
```

- [ ] **Step 4: Verify lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppShell.tsx
git commit -m "feat: AppShell animated sidebar slot with outlet context for AI panel injection"
```

---

### Task 4: Update `TopBar` — always show brand, breadcrumb hidden on AI route

**Files:**
- Modify: `src/components/layout/TopBar.tsx`

- [ ] **Step 1: Replace the left-side section**

In `src/components/layout/TopBar.tsx`, find and replace the entire first `<div className="flex items-center ...">` block (the one containing the hamburger and brand/breadcrumb) with:

```tsx
      <div className="flex items-center gap-3">
        {/* Brand — always visible in both modes */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-[7px] flex items-center justify-center shrink-0 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1F4FD4 0%, #185FA5 60%, #0C447C 100%)',
              boxShadow: '0 1px 4px rgba(31,79,212,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)' }}
            />
            <span className="relative text-white font-black text-[11px] tracking-tight">OIS</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[13px] text-ois-text tracking-tight leading-none">Omni</span>
            <span className="text-[10px] text-ois-text-subtle tracking-[0.05em] uppercase leading-none mt-0.5">Intelligence Suite</span>
          </div>
        </div>

        {/* Hamburger — collapses whichever sidebar is currently active */}
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="text-ois-text-muted">
          <Menu size={20} />
        </Button>

        {/* Breadcrumb — management mode only */}
        {!isAiRoute && (
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="text-ois-text-subtle">Home</span>
            <span className="text-ois-border-strong px-0.5">/</span>
            <span className="text-ois-text">Dashboard</span>
          </div>
        )}
      </div>
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat: TopBar always shows brand; breadcrumb hidden in AI Workspace"
```

---

### Task 5: Move `/ai` routes under AppShell in the router

**Files:**
- Modify: `src/routes/index.tsx`

- [ ] **Step 1: Relocate the two AI route entries**

In `src/routes/index.tsx`, remove these two top-level lines (currently lines 80–81):
```tsx
  { path: '/ai',            element: <AiWorkspace /> },
  { path: '/ai/:sessionId', element: <AiWorkspace /> },
```

Add them as the last two entries inside the AppShell `children` array:
```tsx
      { path: 'ai',            element: <AiWorkspace /> },
      { path: 'ai/:sessionId', element: <AiWorkspace /> },
```

- [ ] **Step 2: Verify lint**

```bash
npm run lint
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/index.tsx
git commit -m "feat: move AI routes under AppShell for shared layout shell"
```

---

### Task 6: Visual verification with Playwright

- [ ] **Step 1: Check Management mode**

Navigate to `http://localhost:3000/` — confirm:
- OIS brand logo + "Omni / Intelligence Suite" visible in TopBar left
- Hamburger visible
- Breadcrumb "Home / Dashboard" visible
- Management nav sidebar on left

- [ ] **Step 2: Switch to AI Workspace — confirm slide**

Click "AI Workspace" toggle — confirm:
- Management sidebar slides out left
- AI session panel slides in from left  
- Brand logo still in TopBar
- Breadcrumb gone
- Chat area + right panel fills the main area

- [ ] **Step 3: Switch back — confirm slide**

Click "Management" toggle — management sidebar slides back in.

- [ ] **Step 4: Final lint**

```bash
npm run lint
```
Expected: no errors.
