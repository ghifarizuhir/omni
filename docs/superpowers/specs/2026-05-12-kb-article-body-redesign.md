# KB Article Body Redesign — Design Spec
**Date:** 2026-05-12
**Scope:** `src/routes/kb/ArticleView.tsx` — `renderMarkdown()` function and prose styling
**Approach:** Stripe-inspired Editorial (Option A)
**Density:** Airy + readable (generous whitespace, comfortable long-form reading)

---

## Background

The current `renderMarkdown()` renderer is functionally correct but visually basic. It lacks differentiated callout types, polished heading rhythm, visual step procedures, table support, and sufficient reading typography. The audience is internal IT/ops engineers reading runbooks and procedures — often mid-incident.

## Goals

1. Improve reading comfort with airy typography and generous vertical rhythm
2. Make callout severity immediately scannable (NOTE / WARNING / DANGER / TIP)
3. Make numbered step procedures visually distinct and easy to follow
4. Add table rendering
5. Refine heading hierarchy to three clearly differentiated tiers

---

## Section 1: Typography & Reading Layout

- Reading column: `max-w-[740px] mx-auto`
- Body text: `15px`, line-height `1.8`, `text-ois-text`
- Paragraph spacing: `my-4` (up from `my-2`)

**Vertical spacing scale:**

| Element    | Spacing         |
|------------|-----------------|
| H2         | `mt-10 mb-4`    |
| H3         | `mt-7 mb-3`     |
| H4         | `mt-5 mb-2`     |
| Paragraph  | `my-4`          |
| Code block | `my-6`          |
| Callout    | `my-5`          |
| Table      | `my-6`          |
| HR         | `my-8`          |
| List       | `my-4`          |

**Horizontal rule:** replaced with a decorative section break — two `flex-1 h-px bg-ois-border` lines flanking a centered `·` dot.

---

## Section 2: Headings

**H2 — Section headers:**
- `text-[19px] font-bold text-ois-text`
- Full-width `border-b border-ois-border pb-3`
- `mt-10 mb-4`

**H3 — Subsection headers:**
- `text-[16px] font-semibold text-ois-text`
- Left accent: `border-l-4 border-ois-primary pl-3`
- `mt-7 mb-3`

**H4 — Minor headers:**
- `text-[13px] font-bold uppercase tracking-widest text-ois-text-subtle`
- No border
- `mt-5 mb-2`

---

## Section 3: Callouts (4 Types)

Detection from first keyword of blockquote opening line:

| Trigger | Type | Border color | Icon |
|---|---|---|---|
| `**Note**`, `**Info**`, `**When` | NOTE | `#1F4FD4` | `Info` |
| `**Warning**`, `**Caution**` | WARNING | `#F79009` | `AlertTriangle` |
| `**Danger**`, `**Critical**`, `**Do NOT**` | DANGER | `#F04438` | `ShieldAlert` |
| `**Tip**`, `**Recommended**` | TIP | `#12B76A` | `Lightbulb` |
| anything else | NOTE | `#1F4FD4` | `Info` |

**Visual treatment (all types):**
- `border-l-4 rounded-r-lg px-4 py-3.5 my-5`
- Row: `[Icon] LABEL` — `text-[10px] font-bold uppercase tracking-widest mb-1.5`
- Body: `text-[13.5px] leading-relaxed text-ois-text`
- Background: matching `*-pale` token per type

---

## Section 4: Ordered Steps

**Number badge:**
- `w-6 h-6` circle, `bg-ois-primary`, `text-white text-[11px] font-bold`, `shrink-0 mt-0.5`

**Connecting line:**
- `absolute left-[11px] top-6 bottom-0 w-0.5 bg-ois-border` on each step except last
- Parent step wrapper: `relative`

**Step text:**
- `text-[15px] leading-[1.8] pl-4`
- Full `renderInline()` support

**Unordered bullets:**
- Bullet: `w-1.5 h-1.5 rounded-full bg-ois-primary mt-[9px] shrink-0`
- Text: `text-[15px] leading-[1.8] text-ois-text-muted`
- `space-y-2` between items

---

## Section 5: Code Blocks

**Theme:** Catppuccin Mocha (already in use)

**Header bar:**
- Background: `#181825`
- Language badge: `text-[11px] font-mono text-white/50`
- Copy button: `text-[11px] text-white/40 hover:text-white/80`, copy→check animation 1800ms
- Border-bottom: `border-white/10`, padding: `px-4 py-2.5`

**Code body:**
- Background: `#1e1e2e`, text: `#cdd6f4`
- `font-mono text-[13px] leading-relaxed px-5 py-5 overflow-x-auto`
- `rounded-b-lg` only (top is flush with header)

**Block margin:** `my-6`

---

## Section 6: Tables

**Parsing:** detect `| col |` rows and `|---|` separator lines in markdown.

**Wrapper:** `overflow-x-auto my-6 rounded-lg border border-ois-border`

**`<th>`:** `bg-ois-surface-muted text-ois-text-subtle font-semibold uppercase text-[10px] tracking-widest px-4 py-2.5 text-left border-b border-ois-border`

**`<td>`:** `px-4 py-2.5 text-[13.5px] text-ois-text border-b border-ois-border`

**Zebra rows:** even rows `bg-ois-surface-muted/40`

---

## Implementation Scope

All changes are contained to `renderMarkdown()` and its sub-components inside `ArticleView.tsx`. No other files need modification. The `CONTENT_TYPE_META` stripe field added in the previous session is unaffected.

**New imports needed:** `Info`, `Lightbulb` from lucide-react (others already imported).

---

## Out of Scope

- Syntax highlighting (token colorization) inside code blocks — plain text only
- Article editor (`KBEditor.tsx`)
- KB browse / analytics pages
- Any changes to the article header or right rail
