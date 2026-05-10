# PROMPT: MVP UI — OIS (Omni Intelligence Suite)
## Doc 7 — AI Chat Mode: Quick Assist Panel & Dedicated AI Workspace

> **Prerequisite:** Doc 0 + 1 + 2 + 3a + 3b + 4a + 4b + 5a + 5b + 5c + 6 sudah di-execute di Build Mode session yang sama.
> **Module:** AI Chat Mode (cross-cutting — OIS-INSTRUCTIONS-V3 §9.2 Intelligence Layer)
> **Routes covered:** `/ai`, `/ai/:sessionId`
> **New entry points:** Floating button + `Cmd+K` shortcut → `AiQuickPanel` overlay (semua halaman)

---

## 🎯 SCOPE & MISSION

Doc 7 menambahkan **AI Chat Mode** sebagai layer kedua di atas Management Mode yang sudah ada (Doc 0–6). Ini bukan pengganti Management Mode — melainkan interface alternatif untuk interaksi natural language dengan data OIS.

Dua entry point dengan mental model yang berbeda:

1. **AI Quick Assist Panel** — Overlay drawer dari kanan, accessible via floating button atau `Cmd+K` di semua halaman. Untuk query cepat dan draft singkat. Auto-close setelah aksi selesai.
2. **Dedicated AI Workspace** (`/ai`) — Full-page layout tiga kolom untuk sesi panjang: investigasi, bulk CI entry, drafting KB article. Session history tersimpan di localStorage.

**Prinsip utama — Human in the Loop:**
- AI hanya menghasilkan **draft** — tidak pernah langsung menulis ke state aplikasi.
- Setiap draft harus di-**Confirm** oleh user sebelum masuk ke mock data.
- Draft yang di-confirm menampilkan feedback visual (card berubah dari dashed amber → solid hijau).

**Phase 1 — CMDB & KB focus (Doc 7 scope):**
Doc 7 hanya mengimplementasikan draft cards untuk **CMDB** (CI entry) dan **Knowledge Base** (article draft). Domain lain (Incident, Problem, Change) menggunakan `AiDraftPlaceholder` — UI-nya ada tapi menampilkan pesan "Coming soon".

**Reuse dari Doc 0–6:**
- `AppShell`, `TopBar`, `Sidebar` — extend TopBar dengan toggle Management/AI Workspace
- Semua UI primitives (`Button`, `Badge`, `Card`, `Modal`, `Tabs`, dll.)
- `mockCIs`, `mockRelationships`, `mockKBArticles`, `mockUsers`, `mockTeams` — sebagai data konteks AI
- `ciTypeMeta`, `relationshipTypeMeta`, `ciStatusMeta` dari `src/lib/constants.ts`
- Lucide-react icons

**Tidak dibutuhkan di Doc 7 (frontend-only):**
- Integrasi Claude API / LLM backend
- AI thinking state / streaming
- Bulk import via chat
- Authentication untuk AI session

---

## 🧩 DOMAIN TYPES (`src/types/ai.ts`)

```typescript
// ============================================================
// AI SESSION & MESSAGES
// ============================================================

export type AiDomain =
  | 'cmdb'           // CMDB CI entry, relationship, query
  | 'knowledge_base' // KB article drafting, search
  | 'incident'       // Incident creation, query (coming soon)
  | 'problem'        // Problem management (coming soon)
  | 'change'         // Change enablement (coming soon)
  | 'all';           // Cross-domain query

export type AiMessageRole = 'user' | 'ai';

export type AiMessageContentType =
  | 'text'              // Plain text response / user message
  | 'draft_ci'          // Draft ConfigurationItem card
  | 'draft_kb'          // Draft KBArticle card
  | 'draft_placeholder' // Coming soon domain
  | 'query_result_ci'   // Query result: list of CIs
  | 'query_result_text' // Query result: text/stat answer
  | 'suggestion';       // Inline AI suggestion (clickable)

export interface AiMessage {
  id: string;
  sessionId: string;
  role: AiMessageRole;
  createdAt: string; // ISO

  // Content — one message can have text + one content block
  text?: string;
  contentType?: AiMessageContentType;
  contentPayload?: AiDraftCIPayload | AiDraftKBPayload | AiQueryResultCIPayload | AiQueryResultTextPayload | AiSuggestionPayload;
}

// ============================================================
// DRAFT PAYLOADS
// ============================================================

export type AiDraftStatus = 'pending' | 'confirmed' | 'cancelled';

export interface AiDraftCIPayload {
  kind: 'draft_ci';
  draftStatus: AiDraftStatus;

  // Pre-filled fields (mirrors ConfigurationItem from src/types/ci.ts)
  publicId: string;          // AI-generated suggestion, e.g. "CI-SRV-PAY-003"
  name: string;
  type: import('./ci').CIType;
  status: import('./ci').CIStatus;
  environment: import('./ci').Environment;
  criticality: import('./ci').Criticality;
  ownerTeamId: string;
  ownerId?: string;
  tags: string[];

  // Type-specific attributes (partial — AI fills what it can infer)
  attributes: Partial<import('./ci').CIAttributes>;

  // Relationships to add alongside this CI
  relationships: Array<{
    type: import('./ci').RelationshipType;
    targetCiPublicId: string;    // e.g. "CI-DB-PAY-001"
    targetCiName: string;        // Denormalized for display
    addedByUser: boolean;        // false = AI suggested, true = user accepted suggestion
  }>;

  // AI suggestions not yet accepted by user
  pendingSuggestions: Array<{
    id: string;
    text: string;               // e.g. "Tambah relasi depends_on CI-DB-PAY-001?"
    actionType: 'add_relationship' | 'set_field';
    actionPayload: Record<string, unknown>;
  }>;
}

export interface AiDraftKBPayload {
  kind: 'draft_kb';
  draftStatus: AiDraftStatus;

  // Pre-filled fields (mirrors KBArticle)
  title: string;
  category: string;
  tags: string[];
  relatedCiPublicIds: string[];  // Linked CIs from CMDB

  // Article body sections
  sections: Array<{
    heading: string;             // e.g. "Symptoms", "Resolution Steps"
    body: string;                // Plain text / markdown
  }>;

  pendingSuggestions: Array<{
    id: string;
    text: string;
    actionType: 'add_related_ci' | 'add_tag' | 'add_section';
    actionPayload: Record<string, unknown>;
  }>;
}

// ============================================================
// QUERY RESULT PAYLOADS
// ============================================================

export interface AiQueryResultCIPayload {
  kind: 'query_result_ci';
  query: string;               // The natural language query
  totalFound: number;
  items: Array<{
    publicId: string;
    name: string;
    type: import('./ci').CIType;
    health: string;
    criticality: import('./ci').Criticality;
    openIncidentCount: number;
    detailUrl: string;          // e.g. "/cmdb/CI-DB-PAY-001"
  }>;
  timestamp: string;
}

export interface AiQueryResultTextPayload {
  kind: 'query_result_text';
  query: string;
  answer: string;              // The stat/text answer
  timestamp: string;
}

export interface AiSuggestionPayload {
  kind: 'suggestion';
  text: string;
  actionLabel: string;         // e.g. "Buat improvement initiative"
  actionType: string;
}

// ============================================================
// SESSION
// ============================================================

export interface AiSession {
  id: string;
  domain: AiDomain;
  title: string;               // Auto-generated from first user message (max 40 chars)
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];

  // Counts for session list display
  draftsPending: number;
  draftsConfirmed: number;
}

// ============================================================
// PANEL STATE (Quick Assist)
// ============================================================

export interface AiPanelContext {
  detectedDomain: AiDomain;
  sourcePath: string;           // Current route when panel opened, e.g. "/cmdb"
  sourceLabel: string;          // Human label, e.g. "CMDB"
}
```

In `src/types/index.ts`, add: `export * from './ai';`

---

## 🗄 MOCK DATA (`src/mocks/aiSessions.ts`)

Generate **3 pre-built mock sessions** to populate the session history in the left panel. These simulate past conversations.

### Session 1 — Active session (current)

```typescript
{
  id: 'ai-sess-001',
  domain: 'cmdb',
  title: 'CMDB prod cluster audit',
  createdAt: '2026-05-09T14:32:00Z',
  updatedAt: '2026-05-09T14:48:00Z',
  draftsPending: 1,
  draftsConfirmed: 2,
  messages: [
    // AI greeting
    {
      id: 'msg-001-01',
      role: 'ai',
      text: 'Halo Sarah! Saya siap bantu kelola CMDB. Saat ini ada 22 CI dan 36 relationships. Ada 3 CI tanpa owner yang perlu diisi.',
      contentType: 'text',
      createdAt: '2026-05-09T14:32:01Z',
    },
    // User asks to add CI
    {
      id: 'msg-001-02',
      role: 'user',
      text: 'tambah server baru prod-api-03, replica dari prod-api-02, AWS ap-southeast-1, owner tim backend',
      createdAt: '2026-05-09T14:33:00Z',
    },
    // AI returns draft CI card
    {
      id: 'msg-001-03',
      role: 'ai',
      text: 'Saya draft CI baru berdasarkan info yang kamu berikan. Periksa dan konfirmasi:',
      contentType: 'draft_ci',
      contentPayload: {
        kind: 'draft_ci',
        draftStatus: 'pending',
        publicId: 'CI-SRV-PAY-003',
        name: 'prod-api-03',
        type: 'server',
        status: 'active',
        environment: 'production',
        criticality: 'critical',
        ownerTeamId: 't-backend',
        tags: ['production', 'tier-1', 'aws'],
        attributes: {
          kind: 'server',
          region: 'ap-southeast-1',
          provider: 'aws',
          os: 'Ubuntu 22.04 LTS',
        },
        relationships: [
          {
            type: 'replica_of',
            targetCiPublicId: 'CI-SRV-PAY-002',
            targetCiName: 'prod-api-02',
            addedByUser: false,
          },
        ],
        pendingSuggestions: [
          {
            id: 'sug-001',
            text: 'prod-api-02 juga depends_on CI-DB-PAY-001 (pay-postgres-primary). Tambahkan relasi yang sama?',
            actionType: 'add_relationship',
            actionPayload: {
              type: 'depends_on',
              targetCiPublicId: 'CI-DB-PAY-001',
              targetCiName: 'pay-postgres-primary',
            },
          },
          {
            id: 'sug-002',
            text: 'prod-api-02 juga depends_on CI-EP-STRIPE-001 (Stripe API). Tambahkan?',
            actionType: 'add_relationship',
            actionPayload: {
              type: 'depends_on',
              targetCiPublicId: 'CI-EP-STRIPE-001',
              targetCiName: 'Stripe API',
            },
          },
        ],
      },
      createdAt: '2026-05-09T14:33:05Z',
    },
    // User accepts suggestion + queries
    {
      id: 'msg-001-04',
      role: 'user',
      text: 'tambahkan juga, dan query dulu: berapa server yang degraded sekarang?',
      createdAt: '2026-05-09T14:35:00Z',
    },
    // AI returns query result
    {
      id: 'msg-001-05',
      role: 'ai',
      text: 'Relasi sudah ditambahkan ke draft. Dan berikut hasil query:',
      contentType: 'query_result_ci',
      contentPayload: {
        kind: 'query_result_ci',
        query: 'CI dengan health degraded',
        totalFound: 2,
        items: [
          {
            publicId: 'CI-DB-PAY-001',
            name: 'pay-postgres-primary',
            type: 'database',
            health: 'degraded',
            criticality: 'critical',
            openIncidentCount: 1,
            detailUrl: '/cmdb/CI-DB-PAY-001',
          },
          {
            publicId: 'CI-APP-ORD-001',
            name: 'order-api',
            type: 'application',
            health: 'degraded',
            criticality: 'high',
            openIncidentCount: 1,
            detailUrl: '/cmdb/CI-APP-ORD-001',
          },
        ],
        timestamp: '2026-05-09T14:35:05Z',
      },
      createdAt: '2026-05-09T14:35:05Z',
    },
  ],
}
```

### Session 2 — Past session (yesterday)

```typescript
{
  id: 'ai-sess-002',
  domain: 'incident',
  title: 'RCA INC-2026-00184',
  createdAt: '2026-05-08T10:15:00Z',
  updatedAt: '2026-05-08T11:02:00Z',
  draftsPending: 0,
  draftsConfirmed: 0,
  messages: [
    {
      id: 'msg-002-01',
      role: 'ai',
      text: 'Domain Incident belum tersedia di AI Chat Mode. Fitur ini akan hadir segera.',
      contentType: 'draft_placeholder',
      createdAt: '2026-05-08T10:15:01Z',
    },
  ],
}
```

### Session 3 — Past session (3 days ago)

```typescript
{
  id: 'ai-sess-003',
  domain: 'knowledge_base',
  title: 'KB: payment timeout handling',
  createdAt: '2026-05-06T09:00:00Z',
  updatedAt: '2026-05-06T09:45:00Z',
  draftsPending: 0,
  draftsConfirmed: 1,
  messages: [
    {
      id: 'msg-003-01',
      role: 'ai',
      text: 'Halo Sarah! Saya siap bantu buat atau cari KB article. Ceritakan topiknya.',
      contentType: 'text',
      createdAt: '2026-05-06T09:00:01Z',
    },
    {
      id: 'msg-003-02',
      role: 'user',
      text: 'buatkan KB article tentang cara handle payment gateway timeout',
      createdAt: '2026-05-06T09:01:00Z',
    },
    {
      id: 'msg-003-03',
      role: 'ai',
      text: 'Berikut draft KB article-nya:',
      contentType: 'draft_kb',
      contentPayload: {
        kind: 'draft_kb',
        draftStatus: 'confirmed',
        title: 'Handling Payment Gateway Timeout',
        category: 'Troubleshooting',
        tags: ['payment', 'timeout', 'stripe', 'incident-response'],
        relatedCiPublicIds: ['CI-APP-PAY-001', 'CI-EP-STRIPE-001'],
        sections: [
          { heading: 'Symptoms', body: 'Transaksi payment gagal dengan error timeout. Response time > 30s dari Stripe API.' },
          { heading: 'Possible causes', body: '1. Stripe API latency spike\n2. Network issue antara payment-api dan Stripe endpoint\n3. Connection pool exhaustion di payment-api' },
          { heading: 'Resolution steps', body: '1. Cek status Stripe di status.stripe.com\n2. Restart payment-worker jika connection pool penuh\n3. Scale up payment-api jika traffic spike' },
          { heading: 'Prevention', body: 'Set timeout di Stripe client ke 10s. Implementasi circuit breaker. Monitor CI-EP-STRIPE-001 latency.' },
        ],
        pendingSuggestions: [],
      },
      createdAt: '2026-05-06T09:01:10Z',
    },
  ],
}
```

Export:
```typescript
export const mockAiSessions: AiSession[] = [session1, session2, session3];

export const getSessionById = (id: string) =>
  mockAiSessions.find(s => s.id === id);

// Active session = most recently updated
export const getActiveSession = () =>
  mockAiSessions.sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0];
```

---

## 🧱 SHARED AI COMPONENTS (`src/components/ai/`)

```
src/components/ai/
├── AiAvatar.tsx              # AI identity mark — sparkles icon dalam circle biru kecil
├── AiMessageBubble.tsx       # Wrapper bubble untuk pesan AI (avatar + bubble)
├── AiUserMessage.tsx         # Bubble untuk pesan user (right-aligned)
├── AiInputBar.tsx            # Input bar bawah — textarea + send button
├── AiDomainSelector.tsx      # Sidebar kiri: list domain dengan active state
├── AiDraftCICard.tsx         # Draft card untuk ConfigurationItem (3 states)
├── AiDraftKBCard.tsx         # Draft card untuk KB Article (3 states)
├── AiDraftPlaceholder.tsx    # "Coming soon" card untuk domain belum aktif
├── AiQueryResultCI.tsx       # Inline query result: list of CIs
├── AiQueryResultText.tsx     # Inline query result: stat/text answer
├── AiSuggestionChip.tsx      # Clickable suggestion pill dalam draft card
├── AiPendingDraftItem.tsx    # Compact draft item di right panel
├── AiCompletenessPanel.tsx   # Completeness checker di right panel (CMDB-specific)
├── AiSessionListItem.tsx     # Session item di left panel
└── AiEmptyState.tsx          # Empty state untuk sesi baru
```

### `AiAvatar.tsx`

Circle 22×22px, background `#E6F1FB`, icon `Sparkles` (lucide) 12px, warna `#185FA5`. Digunakan di semua AI message bubbles.

### `AiDraftCICard.tsx`

**3 visual states — dikendalikan oleh `draftStatus` dalam payload:**

**State `pending`** (default saat AI pertama draft):
- Border: `1px dashed #EF9F27` (amber dashed)
- Background: `rgba(250, 238, 218, 0.15)`
- Header: icon `FileText` + label "Draft CI — belum disimpan" warna `#854F0B`
- Body: tabel field-value dengan kolom label (90px, muted) dan nilai (mono untuk publicId/name)
- Relationship rows: setiap relationship tampil dengan `RelationshipTypeBadge` + nama CI target
- Suggestion area: muncul di bawah fields jika `pendingSuggestions.length > 0`
- Action buttons: `[Confirm & save]` (primary) + `[Edit field]` + `[✕]` (danger)

**State `pending` + suggestions:**
- Sama seperti `pending`, tapi ada `AiSuggestionChip` untuk setiap item di `pendingSuggestions`
- Suggestion chip: border dashed biru, background `rgba(230, 241, 251, 0.2)`, ikon `Lightbulb`
- Klik chip → suggestion `addedByUser` jadi `true`, pindah dari `pendingSuggestions` ke `relationships`
- Update state lokal (React state) — tidak ada API call

**State `confirmed`:**
- Border: `1px solid #3B6D11` (hijau solid)
- Background: `rgba(234, 243, 222, 0.15)`
- Header: icon `CheckCircle` hijau + label "Tersimpan ke CMDB" warna `#3B6D11`
- Body: sama seperti pending tapi read-only
- Action buttons: hanya `[Buka di CMDB →]` yang navigate ke `/cmdb/{publicId}`

**State `cancelled`:**
- Border: `0.5px solid var(--color-border-tertiary)` (normal)
- Background: `var(--color-background-secondary)`
- Header: icon `X` + label "Draft dibatalkan" warna `var(--color-text-tertiary)`
- Tidak ada action buttons

**Confirm interaction:**
Klik `[Confirm & save]` → update `draftStatus` ke `'confirmed'` di React state (lokal session) → update `draftsPending` dan `draftsConfirmed` di session → card re-render ke confirmed state → right panel `AiPendingDraftItem` untuk item ini hilang dari list Pending, muncul di "Tersimpan hari ini".

### `AiDraftKBCard.tsx`

Struktur mirip `AiDraftCICard` tapi untuk KB Article:

**State `pending`:**
- Header: icon `FileText` + "Draft KB Article — belum disimpan" warna `#854F0B`
- Section: Title field + Category badge + Tags chips
- Body: accordion per section (Symptoms, Resolution Steps, dst.) — collapsed by default, click to expand
- Related CIs: row kecil di bawah sections — chip per CI dengan link ke `/cmdb/{publicId}`
- Suggestions: sama dengan CI card
- Actions: `[Confirm & publish draft]` + `[Edit]` + `[✕]`

**State `confirmed`:**
- Header: "Draft dikirim ke KB — menunggu review" (status `draft` di KB, bukan langsung published)
- Action: `[Buka di KB →]` navigate ke `/kb`

### `AiSuggestionChip.tsx`

```
┌──────────────────────────────────────────────────────────┐
│ 💡  prod-api-02 juga depends_on CI-DB-PAY-001.          │
│     Tambahkan relasi yang sama?              [+ Add]     │
└──────────────────────────────────────────────────────────┘
```

- Container: border `1px dashed #378ADD`, background `rgba(230, 241, 251, 0.2)`, radius `var(--border-radius-md)`
- Icon: `Lightbulb` (lucide) 13px warna `#185FA5`
- Text: 11px, `var(--color-text-secondary)`
- Button `[+ Add]`: `background: #E6F1FB`, `color: #0C447C`, `border: 0.5px solid #378ADD`, 10px
- Klik button → suggestion diterima (pindah ke relationships), chip hilang dari `pendingSuggestions`
- Jika semua suggestions di-add atau di-dismiss → suggestion area hilang dari card

### `AiQueryResultCI.tsx`

Inline result card di dalam AI bubble:

```
┌────────────────────────────────────────────────────┐
│  CI degraded — 2 ditemukan          May 9, 14:35  │
│  ─────────────────────────────────────────────────  │
│  ● CI-DB-PAY-001  pay-postgres-primary  DB  [P1]  │
│  ● CI-APP-ORD-001 order-api            App  [P2]  │
│  ─────────────────────────────────────────────────  │
│  [Buka di CMDB]          [Analisis AI →]           │
└────────────────────────────────────────────────────┘
```

- Background: `var(--color-background-secondary)`, border `0.5px solid var(--color-border-tertiary)`, radius `var(--border-radius-md)`
- Health dot: 7×7px circle — hijau = operational, amber = degraded, abu = unknown
- Public ID: mono font, warna `#185FA5`, clickable → navigate ke `detailUrl`
- `[Buka di CMDB]` → `/cmdb` dengan filter health=degraded (visual, React state)
- `[Analisis AI →]` → append user message "Analisis kedua CI ini" ke chat (sendPrompt equivalent: update messages state)

### `AiCompletenessPanel.tsx`

Right panel component, hanya tampil ketika domain aktif adalah `cmdb`:

```
Completeness
─────────────────────────
CI dengan owner     19/22  ████████░  86%
CI dengan monitoring 17/22  ███████░░  77%

Perlu perhatian:
  ● CI-EP-STRIPE-001   no owner
  ● CI-EP-TWILIO-001   no owner
  ● CI-NET-VPC-001     no monitor rule

[✦ Bantu isi dengan AI]
```

Data: computed dari `mockCIs` (Doc 1):
- "Tanpa owner" = CI yang `ownerId` adalah placeholder/empty
- "Tanpa monitoring rule" = CI yang `monitoringRuleCount === 0`

Klik `[Bantu isi dengan AI]` → append message ke chat input: "Bantu saya isi owner untuk CI-EP-STRIPE-001 dan CI-EP-TWILIO-001"

### `AiDraftPlaceholder.tsx`

Digunakan untuk domain `incident`, `problem`, `change` — semua belum diimplementasi di Doc 7:

```
┌──────────────────────────────────────┐
│  🚧  Domain ini belum tersedia       │
│  Incident Management akan hadir di  │
│  versi berikutnya.                   │
│  Gunakan Management Mode untuk       │
│  mengelola incident sekarang.        │
│  [Buka Incident →]                   │
└──────────────────────────────────────┘
```

- Background: `var(--color-background-secondary)`, border dashed `var(--color-border-secondary)`
- Link "Buka Incident →" navigate ke `/incidents`

---

## 📄 ENTRY POINT 1 — AI Quick Assist Panel

### Floating Button (semua halaman)

Tambahkan di `AppShell.tsx`, di luar semua konten, posisi `fixed bottom-6 right-6`:

```
Floating button:
- Ukuran: 44×44px, rounded-full
- Background: #185FA5
- Icon: Sparkles (lucide) 20px, warna putih
- Shadow: tidak ada (flat design)
- z-index: 50
- Tooltip: "AI Quick Assist (⌘K)" muncul on hover
- Klik → toggle AiQuickPanel open/close
```

`Cmd+K` shortcut: tambahkan `useEffect` dengan `keydown` listener di `AppShell.tsx`. `metaKey + k` atau `ctrlKey + k` → toggle panel.

### `AiQuickPanel.tsx`

**Layout:**

```
AppShell (dimmed overlay saat panel open)
└── Panel — fixed right-0 top-0 h-full w-[320px]
    ├── Topbar (panel)
    │   ├── [AI icon] AI Quick Assist
    │   ├── [↗ Buka di Workspace] — navigate ke /ai dengan session carry-over
    │   └── [✕ Close]
    ├── Context Bar
    │   ├── 📍 Konteks: [badge domain auto-detected]
    │   └── [Ganti] — klik buka domain selector dropdown
    ├── Chat Area (scrollable)
    │   ├── Suggested actions (empty state)
    │   └── Message thread
    └── Input Bar
        ├── Textarea placeholder: "Tanya atau instruksikan..."
        ├── "Sesi panjang? Lanjutkan di AI Workspace →"
        └── [Send ↑]
```

**Auto-detect context dari current route:**

```typescript
const detectDomain = (pathname: string): AiDomain => {
  if (pathname.startsWith('/cmdb')) return 'cmdb';
  if (pathname.startsWith('/kb')) return 'knowledge_base';
  if (pathname.startsWith('/incidents')) return 'incident';
  if (pathname.startsWith('/problems')) return 'problem';
  if (pathname.startsWith('/changes')) return 'change';
  return 'all';
};
```

Domain badge ditampilkan di Context Bar dengan warna sesuai domain:
- `cmdb` → ikon `Server`, warna biru
- `knowledge_base` → ikon `BookOpen`, warna ungu
- `incident` → ikon `AlertTriangle`, warna merah
- `change` → ikon `GitPullRequest`, warna abu
- `all` → ikon `Layers`, warna abu

**Overlay behavior:**
- Panel slide dari kanan: `translate-x-full` → `translate-x-0` dengan `transition-transform duration-200`
- Background di belakang panel: `fixed inset-0 bg-black/20` (backdrop), klik backdrop → close panel
- Backdrop tidak block konten Management Mode — hanya visual dim
- Panel tidak push layout, overlay di atas konten

**Suggested actions (empty state, sebelum ada chat):**

Jika domain = `cmdb`:
```
Coba tanya:
• Tambah CI baru untuk server X
• Berapa CI dengan status degraded?
• Cek relasi dari CI-APP-PAY-001
• CI mana yang belum punya owner?
```

Jika domain = `knowledge_base`:
```
Coba tanya:
• Buatkan KB article tentang [topik]
• Cari artikel tentang timeout handling
• Draft runbook untuk restart payment-api
```

Jika domain = `incident` atau `change` atau `problem`:
```
Domain ini belum tersedia di AI Chat Mode.
[Gunakan Management Mode →]
```

**"Lanjutkan di AI Workspace" link:**
- Muncul di bawah input bar setelah ada ≥ 1 pesan dalam panel
- Klik → navigate ke `/ai` dengan `?from=panel&domain={domain}` — workspace akan pick up context ini

**Panel session state:**
- Panel menyimpan message history di React state (lokal, tidak persist)
- Reset saat panel ditutup dan dibuka kembali (fresh start)
- Kecuali jika user klik "Lanjutkan di Workspace" — state di-carry ke session baru di workspace

---

## 📄 ENTRY POINT 2 — Dedicated AI Workspace (`/ai`)

**File:** `src/routes/ai/AiWorkspace.tsx`
**Route:** `/ai` dan `/ai/:sessionId`

### Topbar Update

Di `TopBar.tsx`, tambahkan **mode toggle** di tengah topbar (setelah logo dan sebelum notif bell):

```tsx
// Mode toggle — tampil di semua halaman
<div className="flex bg-secondary border rounded-md p-0.5">
  <button
    onClick={() => navigate(-1)}  // Kembali ke halaman Management terakhir
    className={cn("tab", !isAiRoute && "tab-active")}
  >
    <LayoutDashboard size={12} />
    Management
  </button>
  <button
    onClick={() => navigate('/ai')}
    className={cn("tab", isAiRoute && "tab-active")}
  >
    <Sparkles size={12} />
    AI Workspace
  </button>
</div>
```

`isAiRoute`: `useLocation().pathname.startsWith('/ai')`

Saat di `/ai` → toggle "AI Workspace" active (filled style). Saat di halaman manapun → toggle "Management" active.

### Layout `/ai`

3-kolom layout, full height (tanpa Sidebar kiri dari Doc 0 — di halaman `/ai`, sidebar digantikan oleh AI left panel):

```
┌─────────────────────────────────────────────────────────────┐
│  TopBar (dengan mode toggle)                                │
├──────────────────┬──────────────────────────┬──────────────┤
│  LEFT PANEL      │  CHAT AREA               │  RIGHT PANEL │
│  200px           │  flex-1                  │  210px       │
│  ─────────────── │  ──────────────────────── │  ─────────── │
│  Domain selector │  Context breadcrumb       │  Pending     │
│  Session history │  Message thread           │  drafts      │
│                  │  Input bar                │  Saved today │
│                  │                           │  Completeness│
│                  │                           │  (if cmdb)   │
└──────────────────┴──────────────────────────┴──────────────┘
```

### Left Panel

```
Domain aktif
─────────────────
[✓] CMDB             ← active, background biru muda
[ ] Knowledge Base
[ ] Incident         ← muted (coming soon)
[ ] Change           ← muted (coming soon)
[ ] Semua domain

─────────────────
Sesi              [+ Baru]
─────────────────
[Sesi aktif card]
  CMDB prod cluster
  Hari ini · 14:32
  [2 saved] [1 draft]

Sesi lalu
  RCA INC-00184
  Kemarin · Incident

  KB: payment timeout
  3 hari lalu · KB
```

**Domain selector behavior:**
- Klik domain → set `activeDomain` state → chat area kosong (new session) atau load sesi lalu untuk domain ini
- Domain `incident`, `problem`, `change`: bisa diklik tapi memunculkan `AiDraftPlaceholder` sebagai first AI message
- Domain `all`: AI menjawab query cross-domain tapi tidak bisa draft (informational only)

**Session list:**
- Urut berdasarkan `updatedAt` descending
- Klik sesi → load messages dari `mockAiSessions`
- Active session: card style dengan border, badge `draftsPending` dan `draftsConfirmed`
- Past sessions: list item sederhana dengan title + tanggal + domain chip

**"+ Baru" button:**
- Reset chat area ke empty state
- Buat session baru (id auto-generated) dengan domain aktif
- Simpan ke sessions state (React, tidak persist ke localStorage di Doc 7)

### Chat Area

**Context breadcrumb (top of chat area):**

```
[Server icon] CMDB  ›  Sesi: CMDB prod cluster    [Reset sesi]
```

- Breadcrumb menampilkan domain aktif + judul sesi
- `[Reset sesi]` → clear messages, kembali ke empty state untuk sesi ini

**Message thread:**

Scroll area yang berisi semua `AiMessage` dalam sesi aktif, dirender dari `messages` array:

- `role: 'user'` → `AiUserMessage` (right-aligned, background secondary)
- `role: 'ai'` + `contentType: 'text'` → `AiMessageBubble` berisi teks
- `role: 'ai'` + `contentType: 'draft_ci'` → `AiMessageBubble` berisi teks + `AiDraftCICard`
- `role: 'ai'` + `contentType: 'draft_kb'` → `AiMessageBubble` berisi teks + `AiDraftKBCard`
- `role: 'ai'` + `contentType: 'query_result_ci'` → `AiMessageBubble` berisi teks + `AiQueryResultCI`
- `role: 'ai'` + `contentType: 'query_result_text'` → `AiMessageBubble` berisi teks + inline stat card
- `role: 'ai'` + `contentType: 'draft_placeholder'` → `AiMessageBubble` berisi `AiDraftPlaceholder`

Auto-scroll ke bawah saat ada pesan baru (smooth scroll).

**Input simulation:**

Karena tidak ada backend AI di Doc 7, input bar tetap functional secara UI:
- User bisa type pesan dan tekan Enter/Send
- Message ditambahkan ke thread sebagai `role: 'user'`
- Setelah 800ms delay → mock AI response ditambahkan:

```typescript
const getMockAiResponse = (userMessage: string, domain: AiDomain): AiMessage => {
  // Jika domain belum aktif
  if (['incident', 'problem', 'change'].includes(domain)) {
    return { role: 'ai', contentType: 'draft_placeholder', ... };
  }
  // Jika pesan mengandung kata "tambah" / "buat" / "create" + domain cmdb
  if (domain === 'cmdb' && /tambah|buat|create|add/i.test(userMessage)) {
    return { role: 'ai', contentType: 'draft_ci', contentPayload: generateMockCIDraft(userMessage), ... };
  }
  // Jika domain kb
  if (domain === 'knowledge_base' && /buat|draft|tulis|write/i.test(userMessage)) {
    return { role: 'ai', contentType: 'draft_kb', contentPayload: generateMockKBDraft(userMessage), ... };
  }
  // Query / pertanyaan lain
  return { role: 'ai', contentType: 'text', text: 'Saya memproses permintaan kamu. (Mode demo — response aktual tersedia setelah AI backend terhubung.)', ... };
};
```

`generateMockCIDraft(userMessage)` membuat `AiDraftCIPayload` dengan nilai minimal yang masuk akal. Tidak perlu NLP — cukup template dengan beberapa field pre-filled.

**Empty state (sesi baru):**

```
[Sparkles icon besar]

Halo, Sarah!
Saya siap membantu kelola [Domain Aktif].

Coba mulai dengan:
• [Suggested action 1]
• [Suggested action 2]
• [Suggested action 3]
```

Suggested actions disesuaikan dengan domain aktif (sama dengan Quick Assist Panel).

### Right Panel

**Pending Drafts section:**

```
Pending drafts                          [1]
────────────────────────────────
┌──────────────────────────────────┐
│  [Server] prod-api-03            │
│  CI-SRV-PAY-003 · production     │
│  3 relasi pending                │
│  [Confirm]  [Batal]              │
└──────────────────────────────────┘
```

- Setiap `AiPendingDraftItem` adalah ringkasan dari draft yang masih `pending` dalam sesi aktif
- Klik `[Confirm]` → sama efeknya dengan Confirm di draft card di chat (update state, card berubah ke confirmed)
- Badge angka di header = `session.draftsPending`
- Jika tidak ada pending: "Tidak ada draft menunggu" (muted text)

**Tersimpan hari ini section:**

```
Tersimpan hari ini
────────────────────────────────
✓  prod-api-01      14:20 · Server
✓  prod-api-02      14:25 · Server
```

List item confirmed dari sesi aktif. Klik nama CI → navigate ke `/cmdb/{publicId}`.

**Completeness section (hanya jika domain = `cmdb`):**

Render `AiCompletenessPanel` — component terpisah, data dari `mockCIs`.

---

## 🔀 ROUTING UPDATE

Di `src/routes/index.tsx`, tambahkan route baru di **luar** AppShell route (karena `/ai` punya layout berbeda — tidak pakai Sidebar kiri dari Doc 0):

```tsx
// Di luar AppShell wrapper — /ai pakai layout sendiri
{
  path: '/ai',
  element: <AiWorkspace />,
},
{
  path: '/ai/:sessionId',
  element: <AiWorkspace />,
},
```

`AiWorkspace` merender `TopBar` sendiri (reuse komponen yang sama dari Doc 0) tapi **tanpa Sidebar**. Layout penuh lebar tiga kolom.

---

## 🔗 CROSS-LINKING

**Dari Management Mode ke AI:**
- Floating button (semua halaman) → buka `AiQuickPanel`
- `Cmd+K` (semua halaman) → buka `AiQuickPanel`
- Topbar toggle "AI Workspace" → `/ai`

**Dari AI ke Management Mode:**
- Topbar toggle "Management" → kembali ke halaman terakhir Management (atau `/` jika tidak ada history)
- `[Buka di CMDB →]` di confirmed CI card → `/cmdb/{publicId}` (real, Doc 1)
- `[Buka di KB →]` di confirmed KB card → `/kb` (real, Doc 3b)
- CI public ID di query result → `/cmdb/{publicId}` (real, Doc 1)
- `[Buka Incident →]` di placeholder card → `/incidents` (real, Doc 3a)
- `[Buka di CMDB]` di query result action button → `/cmdb` dengan filter pre-applied (visual only)

**Quick Panel → Workspace:**
- "Lanjutkan di AI Workspace →" → `/ai?from=panel&domain={domain}`
- Workspace cek URL param `from=panel`, jika ada → set domain dari param, tampilkan pesan "Melanjutkan dari Quick Assist Panel"

---

## ✅ QUALITY CHECKLIST

### Floating Button & Cmd+K
- [ ] Floating button muncul di semua halaman Management Mode
- [ ] Tombol tidak muncul di `/ai` (sudah di workspace)
- [ ] Tooltip "AI Quick Assist (⌘K)" muncul on hover
- [ ] `Cmd+K` (Mac) dan `Ctrl+K` (Windows) toggle panel
- [ ] Klik floating button toggle panel open/close

### AI Quick Assist Panel
- [ ] Panel slide dari kanan dengan animasi smooth (200ms)
- [ ] Backdrop dim muncul di belakang panel
- [ ] Klik backdrop → close panel
- [ ] Context badge auto-detect domain dari current route
- [ ] Klik `[Ganti]` → dropdown domain selector muncul
- [ ] Domain `incident`/`problem`/`change` → tampil pesan "belum tersedia" + link management
- [ ] Domain `cmdb` → suggested actions spesifik CMDB
- [ ] Domain `kb` → suggested actions spesifik KB
- [ ] User bisa type pesan + send (Enter atau klik send)
- [ ] Mock AI response muncul setelah 800ms delay
- [ ] "Lanjutkan di AI Workspace" muncul setelah ada ≥ 1 pesan
- [ ] Klik "Lanjutkan" → navigate ke `/ai?from=panel&domain={domain}`
- [ ] `[↗ Buka di Workspace]` di topbar panel → navigate ke `/ai`
- [ ] `[✕ Close]` tutup panel

### Topbar Mode Toggle
- [ ] Toggle muncul di semua halaman (Management dan AI Workspace)
- [ ] "Management" active saat di route manapun selain `/ai`
- [ ] "AI Workspace" active saat di `/ai` atau `/ai/:sessionId`
- [ ] Klik "Management" saat di `/ai` → kembali ke halaman sebelumnya
- [ ] Klik "AI Workspace" saat di Management → navigate ke `/ai`

### AI Workspace `/ai`
- [ ] `/ai` render tanpa Sidebar kiri dari Doc 0 (3-kolom layout)
- [ ] TopBar tetap ada dengan mode toggle
- [ ] Default: load sesi paling recent (`ai-sess-001`)
- [ ] Left panel: domain selector dengan CMDB active
- [ ] Left panel: sesi list menampilkan 3 mock sessions
- [ ] Klik domain → switch domain, tampilkan suggested actions
- [ ] Domain `incident`/`problem`/`change` → first message adalah `AiDraftPlaceholder`
- [ ] Klik sesi lain → load messages sesi tersebut
- [ ] `[+ Baru]` → clear chat, empty state, new session
- [ ] Chat area: semua 5 messages dari `ai-sess-001` ter-render
- [ ] `AiDraftCICard` untuk `msg-001-03` tampil dalam state `pending`
- [ ] Suggestion chips tampil untuk 2 suggestions
- [ ] Klik suggestion `[+ Add]` → relasi pindah ke draft, chip hilang
- [ ] `AiQueryResultCI` untuk `msg-001-05` tampil dengan 2 CI items
- [ ] Klik CI public ID di query result → navigate ke `/cmdb/{publicId}`
- [ ] User bisa type dan send pesan baru
- [ ] Mock response muncul setelah 800ms
- [ ] `[Confirm & save]` → draft card berubah ke state `confirmed`
- [ ] Confirmed card: border hijau, label "Tersimpan ke CMDB", button "Buka di CMDB →"
- [ ] `[✕]` pada draft → state `cancelled`, card tampil sebagai cancelled
- [ ] Right panel: pending draft `prod-api-03` tampil
- [ ] Confirm dari right panel → sama efeknya dengan confirm di card
- [ ] Right panel: "Tersimpan hari ini" menampilkan 2 CI (prod-api-01, prod-api-02)
- [ ] Right panel: `AiCompletenessPanel` tampil (domain cmdb)
- [ ] Completeness panel: 19/22 CI dengan owner (progress bar)
- [ ] Completeness panel: 3 CI yang bermasalah tampil dengan benar
- [ ] Klik `[Bantu isi dengan AI]` → append text ke input
- [ ] `[Reset sesi]` → clear messages, kembali ke empty state

### Draft Cards
- [ ] `AiDraftCICard` state `pending`: border dashed amber
- [ ] `AiDraftCICard` state `confirmed`: border solid hijau
- [ ] `AiDraftCICard` state `cancelled`: border normal, label cancelled
- [ ] `AiDraftKBCard` state `pending`: sections accordion collapsed by default
- [ ] `AiDraftKBCard` state `confirmed`: label "Dikirim ke KB"
- [ ] Semua public ID dalam draft cards pakai mono font
- [ ] `AiDraftPlaceholder` tampil dengan link ke Management Mode
- [ ] `AiSuggestionChip` klik add → masuk ke relationships, chip hilang

### Session dari `/ai/:sessionId`
- [ ] `/ai/ai-sess-002` → load sesi RCA INC-00184 (domain incident, placeholder)
- [ ] `/ai/ai-sess-003` → load sesi KB, tampil `AiDraftKBCard` dalam state `confirmed`

### Cross-links
- [ ] Toggle Management → kembali ke halaman sebelumnya (tidak hard-reset ke `/`)
- [ ] CI link di query result → `/cmdb/CI-DB-PAY-001` real
- [ ] `[Buka di CMDB →]` di confirmed card → `/cmdb/CI-SRV-PAY-003` (atau publicId CI)
- [ ] `[Buka di KB →]` di confirmed KB card → `/kb`
- [ ] Floating button tidak render di `/ai` route

### General
- [ ] Tidak ada console / TypeScript errors
- [ ] Tidak ada `<Placeholder />` baru yang dibuat (semua route AI adalah implementasi nyata)
- [ ] Semua public ID (CI-xxx-xxx-xxx) pakai mono font
- [ ] Dark mode: semua warna pakai CSS variables atau hex yang sudah diuji di dark bg
- [ ] Panel overlay tidak break layout Management Mode di belakangnya

---

## 🚀 DELIVERABLE

Extend project yang sudah ada (Doc 0–6) dengan:

1. `src/types/ai.ts` — semua domain types, re-export di `src/types/index.ts`
2. `src/mocks/aiSessions.ts` — 3 mock sessions dengan messages lengkap
3. `src/components/ai/` — 14 komponen sesuai daftar di atas
4. `src/routes/ai/AiWorkspace.tsx` — dedicated workspace, 3-kolom layout
5. Update `AppShell.tsx` — floating button + `Cmd+K` listener
6. Update `TopBar.tsx` — mode toggle Management/AI Workspace
7. Update `src/routes/index.tsx` — tambah route `/ai` dan `/ai/:sessionId`
8. `AiQuickPanel.tsx` — overlay panel, bisa diletakkan di `src/components/ai/` atau `src/routes/ai/`

Setelah Doc 7, semua route AI adalah implementasi nyata. Floating button dan `Cmd+K` accessible dari semua halaman Management Mode.

---

*End of Doc 7. AI Chat Mode — frontend layer complete.*
*Backend integration (Claude API) dan AI thinking state diimplementasikan di Doc 8 (AI Backend Integration) — fase berikutnya setelah backend siap.*
