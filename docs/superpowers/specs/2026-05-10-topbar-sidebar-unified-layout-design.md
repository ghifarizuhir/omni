# Unified TopBar & Seamless Sidebar Layout

**Date:** 2026-05-10  
**Status:** Approved

## Problem

The `/ai` route family lives outside `AppShell`, creating a separate layout tree. Switching between Management and AI Workspace causes a full page remount — no shared layout, no animation, no state persistence across mode switches. The TopBar brand logo is missing in AI Workspace because the `Sidebar` (which owns the brand) is not rendered there.

## Goal

- Single layout shell owns TopBar, sidebar slot, and outlet for all routes
- TopBar looks identical in both modes (brand always visible)
- Switching modes slides the sidebar content — management nav slides out, AI panel slides in (and vice versa)
- No full remount on mode switch

## Architecture

### Routing (`src/routes/index.tsx`)

Move `/ai` and `/ai/:sessionId` from top-level routes into children of the `AppShell` route:

```
AppShell (path: "/")
  ├── Dashboard (path: "")
  ├── /cmdb, /events, /incidents, ... (existing)
  ├── /ai            → AiWorkspace
  └── /ai/:sessionId → AiWorkspace
```

Remove the two standalone top-level route entries for `/ai` and `/ai/:sessionId`.

### AppShell (`src/components/layout/AppShell.tsx`)

- Detect `isAiRoute` via `useLocation().pathname.startsWith('/ai')`
- Sidebar slot wrapped in `AnimatePresence mode="wait"`:
  - `!isAiRoute` → `<Sidebar>` (management nav) with key `"mgmt"`
  - `isAiRoute` → `<AiSidebarPanel>` with key `"ai"`
- `<main>` outlet and all overlays (InboxDrawer, AiQuickPanel, FAB) unchanged
- `onToggleSidebar` collapses/expands both sidebar variants via the existing `sidebarCollapsed` state

### TopBar (`src/components/layout/TopBar.tsx`)

Left side always renders: **brand lockup → hamburger button**.  
Remove the `isAiRoute` conditional introduced in the previous fix — brand is now always present regardless of route.  
Breadcrumb (`Home / Dashboard`) renders only when `!isAiRoute`; hidden in AI Workspace since the left panel provides session context.

### New Component: `AiSidebarPanel` (`src/components/ai/AiSidebarPanel.tsx`)

Extracted from `AiWorkspace.tsx`. Contains:
- Domain selector (`AiDomainSelector`)
- Session list (`AiSessionListItem` items)
- "New session" button

**Props:**
```ts
interface AiSidebarPanelProps {
  collapsed: boolean;
  sessions: AiSession[];
  activeSessionId: string;
  activeDomain: AiDomain;
  onSessionSelect: (id: string) => void;
  onNewSession: () => void;
  onDomainChange: (domain: AiDomain) => void;
}
```

State (`sessions`, `activeSessionId`, `activeDomain`) remains owned by `AiWorkspace` and passed down. URL param `:sessionId` remains the source of truth for active session across navigation.

### AiWorkspace (`src/routes/ai/AiWorkspace.tsx`)

- Remove `<TopBar>` render (AppShell now owns it)
- Remove left panel JSX (moved to `AiSidebarPanel`)
- Remove `TopBar` import
- Component renders: chat message column + right drafts/completeness panel only
- Outer wrapper: `<div className="flex flex-1 overflow-hidden min-h-0">` (fits inside AppShell's `<main>`)

## Slide Animation

```tsx
// In AppShell sidebar slot:
<AnimatePresence mode="wait">
  {isAiRoute ? (
    <motion.div
      key="ai"
      initial={{ x: -240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -240, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35, duration: 0.2 }}
    >
      <AiSidebarPanel collapsed={sidebarCollapsed} {...aiSidebarProps} />
    </motion.div>
  ) : (
    <motion.div
      key="mgmt"
      initial={{ x: -240, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -240, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35, duration: 0.2 }}
    >
      <Sidebar collapsed={sidebarCollapsed} onToggle={...} />
    </motion.div>
  )}
</AnimatePresence>
```

Sidebar width is constant (`w-[240px]` or `w-16`) — only content slides, main area never shifts.

## State Management

- `sidebarCollapsed` — owned by AppShell, shared to both sidebar variants
- AI session state (`sessions`, `activeSessionId`, `activeDomain`) — owned by `AiWorkspace`, passed to `AiSidebarPanel` via props
- Active session anchored to URL param `:sessionId` for persistence across navigation

## Files Changed

| File | Change |
|------|--------|
| `src/routes/index.tsx` | Move `/ai`, `/ai/:sessionId` under AppShell children |
| `src/components/layout/AppShell.tsx` | Add `isAiRoute`, AnimatePresence sidebar slot, import AiSidebarPanel |
| `src/components/layout/TopBar.tsx` | Always show brand; breadcrumb hidden when `isAiRoute` |
| `src/routes/ai/AiWorkspace.tsx` | Remove TopBar render + left panel JSX; adjust outer wrapper |
| `src/components/ai/AiSidebarPanel.tsx` | **New** — extracted left panel from AiWorkspace |

## Success Criteria

- [ ] Brand logo visible in both Management and AI Workspace modes
- [ ] Switching modes slides the sidebar content (no flash/remount)
- [ ] Hamburger collapses/expands sidebar in both modes
- [ ] All existing Management routes still work
- [ ] AI Workspace chat, sessions, and domain selector still work
- [ ] `npm run lint` passes with no errors
