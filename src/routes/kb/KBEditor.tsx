import React, {
  useState, useMemo, useEffect, useRef, useCallback,
} from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Save, Eye, EyeOff, ChevronDown, Check, X, Plus,
  Bold, Italic, Code, Link2, List, ListOrdered, Quote,
  Terminal, Minus, Table2, Heading, Zap, BookOpen, Server,
  AlertCircle, HelpCircle, Microscope, Clock, FileText,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { getArticleBySlug } from '@/src/mocks/kbArticles';
import { mockKBCategories } from '@/src/mocks/kbCategories';
import { Modal } from '@/src/components/ui/Modal';
import { FilterDropdown } from '@/src/components/ui/FilterDropdown';
import {
  KBContentType, KBVisibility, KBStatus,
} from '@/src/types/knowledge';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EditorState {
  title: string;
  summary: string;
  body: string;
  categoryId: string;
  contentType: KBContentType;
  visibility: KBVisibility;
  tags: string[];
  linkedCIs: string[];
  linkedItems: string[];
  status: KBStatus;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_TYPES: { value: KBContentType; label: string }[] = [
  { value: 'how_to',              label: 'How-To' },
  { value: 'troubleshooting',     label: 'Troubleshooting' },
  { value: 'runbook',             label: 'Runbook' },
  { value: 'reference',           label: 'Reference' },
  { value: 'faq',                 label: 'FAQ' },
  { value: 'incident_postmortem', label: 'Postmortem' },
];

const VISIBILITIES: { value: KBVisibility; label: string }[] = [
  { value: 'internal', label: 'Internal — all staff' },
  { value: 'team',     label: 'Team only' },
  { value: 'public',   label: 'Public (future)' },
];

const PLACEHOLDER_BODY = `# Article title

Start writing your article here…

## Section heading

Add your content below.
`;

// ── Slash commands ────────────────────────────────────────────────────────────

interface SlashCmd {
  id: string;
  label: string;
  description: string;
  icon: React.FC<{ size?: number; className?: string }>;
  snippet: string;
}

const SLASH_COMMANDS: SlashCmd[] = [
  { id: 'heading',   label: '/heading',       description: 'Insert heading (H2)',       icon: Heading,      snippet: '## Heading\n' },
  { id: 'h3',        label: '/h3',            description: 'Insert subheading (H3)',    icon: Heading,      snippet: '### Subheading\n' },
  { id: 'code',      label: '/code',          description: 'Insert code block',         icon: Terminal,     snippet: '```bash\n\n```\n' },
  { id: 'callout',   label: '/callout',       description: 'Insert callout / note',     icon: AlertCircle,  snippet: '> **Note:** Add your callout text here.\n' },
  { id: 'warning',   label: '/warning',       description: 'Insert warning callout',    icon: AlertCircle,  snippet: '> **Warning:** Add your warning here.\n' },
  { id: 'list',      label: '/list',          description: 'Insert bulleted list',      icon: List,         snippet: '- Item 1\n- Item 2\n- Item 3\n' },
  { id: 'ordered',   label: '/ordered',       description: 'Insert numbered list',      icon: ListOrdered,  snippet: '1. Item 1\n2. Item 2\n3. Item 3\n' },
  { id: 'link-kb',   label: '/link-kb',       description: 'Link to a KB article',      icon: BookOpen,     snippet: '`KB-XXXXX` — Article title' },
  { id: 'link-ci',   label: '/link-ci',       description: 'Reference a CI',            icon: Server,       snippet: '`CI-XXX-XXX`' },
  { id: 'link-inc',  label: '/link-incident', description: 'Reference an incident',     icon: AlertCircle,  snippet: '`INC-2026-XXXXX`' },
  { id: 'divider',   label: '/divider',       description: 'Insert horizontal rule',    icon: Minus,        snippet: '\n---\n' },
  { id: 'table',     label: '/table',         description: 'Insert table template',     icon: Table2,       snippet: '| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell     | Cell     | Cell     |\n' },
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.replace(/[#*`>\-_\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length;
}

function estimateReadTime(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / 200));
}

// ── Incident postmortem template ──────────────────────────────────────────────

function buildIncidentTemplate(incidentId: string, title: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `# Postmortem: ${title}

**Incident:** ${incidentId}
**Date:** ${today}

## Summary

[Brief description of what happened and customer impact]

## Timeline

| Time (UTC) | Event |
|---|---|
| 00:00 | Incident detected |
| 00:05 | On-call engineer paged |
| 00:30 | Root cause identified |
| 01:00 | Incident resolved |

## Root Cause

[Describe the root cause]

## Contributing Factors

- [Factor 1]
- [Factor 2]

## Resolution

[What was done to resolve the incident]

## Action Items

| Action | Owner | Due |
|---|---|---|
| [Action 1] | [Owner] | [Date] |
`;
}

function getInitialEditorState(slug: string | undefined, searchParams: URLSearchParams): EditorState {
  const source = searchParams.get('source');
  const id = searchParams.get('id') ?? '';
  const title = searchParams.get('title') ?? '';

  let body = PLACEHOLDER_BODY;
  let contentType: KBContentType = 'how_to';

  if (source === 'incident' && id) {
    body = buildIncidentTemplate(id, title || id);
    contentType = 'incident_postmortem';
  }

  return {
    title: source === 'incident' && title ? `Postmortem: ${title}` : '',
    summary: '',
    body,
    categoryId: '',
    contentType,
    visibility: 'internal',
    tags: source === 'incident' ? ['postmortem', 'incident'] : [],
    linkedCIs: [],
    linkedItems: source === 'incident' && id ? [id] : [],
    status: 'draft',
  };
}

// ── Minimal markdown preview (lightweight, for editor panel) ─────────────────

function PreviewRenderer({ body }: { body: string }) {
  const lines = body.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code fence
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { codeLines.push(lines[i]); i++; }
      nodes.push(
        <pre key={`c${i}`} className="bg-[#1e1e2e] text-[#cdd6f4] text-xs rounded-lg p-4 my-3 overflow-x-auto font-mono leading-relaxed">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++; continue;
    }

    // Headings
    const hm = line.match(/^(#{1,4})\s+(.+)/);
    if (hm) {
      const lv = hm[1].length;
      const cls = lv === 1 ? 'text-xl font-extrabold mt-6 mb-2' : lv === 2 ? 'text-base font-bold mt-5 mb-2 border-b border-ois-border pb-1' : lv === 3 ? 'text-sm font-bold mt-4 mb-1' : 'text-sm font-semibold mt-3 mb-1';
      const Tag = `h${lv}` as 'h1' | 'h2' | 'h3' | 'h4';
      nodes.push(React.createElement(Tag, { key: `h${i}`, className: cn(cls, 'text-ois-text') }, hm[2]));
      i++; continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const ql: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) { ql.push(lines[i].slice(2)); i++; }
      const isWarn = ql.some(l => l.includes('Warning') || l.includes('ARCHIVED'));
      nodes.push(
        <blockquote key={`bq${i}`} className={cn('pl-3 border-l-4 rounded-r py-2 my-2', isWarn ? 'border-ois-warning bg-ois-warning-pale' : 'border-ois-primary bg-ois-primary-pale')}>
          {ql.map((q, j) => <p key={j} className="text-xs text-ois-text leading-relaxed">{renderSimpleInline(q)}</p>)}
        </blockquote>
      );
      continue;
    }

    // List
    if (line.match(/^[-*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*]\s/)) { items.push(lines[i].replace(/^[-*]\s/, '')); i++; }
      nodes.push(
        <ul key={`ul${i}`} className="my-2 space-y-1 pl-1">
          {items.map((it, j) => <li key={j} className="flex gap-2 text-xs text-ois-text-muted"><span className="text-ois-primary mt-1.5 shrink-0">•</span>{renderSimpleInline(it)}</li>)}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) { items.push(lines[i].replace(/^\d+\.\s/, '')); i++; }
      nodes.push(
        <ol key={`ol${i}`} className="my-2 space-y-1 pl-1">
          {items.map((it, j) => <li key={j} className="flex gap-2 text-xs text-ois-text-muted"><span className="text-[10px] font-bold text-ois-primary mt-0.5 w-4 shrink-0">{j+1}.</span>{renderSimpleInline(it)}</li>)}
        </ol>
      );
      continue;
    }

    // HR
    if (line.match(/^---+$/)) { nodes.push(<hr key={`hr${i}`} className="my-4 border-ois-border" />); i++; continue; }

    // Blank
    if (!line.trim()) { i++; continue; }

    // Paragraph
    nodes.push(<p key={`p${i}`} className="text-xs text-ois-text-muted leading-relaxed my-1.5">{renderSimpleInline(line)}</p>);
    i++;
  }
  return <>{nodes}</>;
}

function renderSimpleInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="font-semibold text-ois-text">{p.slice(2,-2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`')) return <code key={i} className="bg-ois-surface-muted text-ois-text font-mono text-[11px] px-1 py-0.5 rounded border border-ois-border">{p.slice(1,-1)}</code>;
    return p;
  });
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface ToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onBodyChange: (val: string) => void;
  onSlashHelp: () => void;
}

function wrapSelection(
  ta: HTMLTextAreaElement,
  before: string, after: string, fallback: string,
  onChange: (v: string) => void
) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const selected = value.slice(s, e) || fallback;
  const next = value.slice(0, s) + before + selected + after + value.slice(e);
  onChange(next);
  setTimeout(() => {
    ta.selectionStart = s + before.length;
    ta.selectionEnd   = s + before.length + selected.length;
    ta.focus();
  }, 0);
}

function insertAtLineStart(
  ta: HTMLTextAreaElement, prefix: string, onChange: (v: string) => void
) {
  const { selectionStart: s, value } = ta;
  const lineStart = value.lastIndexOf('\n', s - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  onChange(next);
  setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + prefix.length; ta.focus(); }, 0);
}

const ToolbarBtn: React.FC<{
  icon: React.FC<{ size?: number; className?: string }>;
  title: string; onClick: () => void; active?: boolean;
}> = ({ icon: Icon, title, onClick, active }) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    className={cn(
      'p-1.5 rounded transition-colors',
      active
        ? 'bg-ois-primary-pale text-ois-primary'
        : 'text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text',
    )}
  >
    <Icon size={14} />
  </button>
);

const EditorToolbar: React.FC<ToolbarProps> = ({ textareaRef, onBodyChange, onSlashHelp }) => {
  const ta = () => textareaRef.current!;

  return (
    <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-ois-border bg-ois-surface-muted">
      <ToolbarBtn icon={Bold}         title="Bold (Ctrl+B)"       onClick={() => wrapSelection(ta(), '**', '**', 'bold text', onBodyChange)} />
      <ToolbarBtn icon={Italic}       title="Italic (Ctrl+I)"     onClick={() => wrapSelection(ta(), '*', '*', 'italic text', onBodyChange)} />
      <ToolbarBtn icon={Code}         title="Inline code"         onClick={() => wrapSelection(ta(), '`', '`', 'code', onBodyChange)} />
      <ToolbarBtn icon={Link2}        title="Link"                onClick={() => wrapSelection(ta(), '[', '](url)', 'link text', onBodyChange)} />
      <div className="w-px h-4 bg-ois-border mx-1 shrink-0" />
      <ToolbarBtn icon={List}         title="Bullet list"         onClick={() => insertAtLineStart(ta(), '- ', onBodyChange)} />
      <ToolbarBtn icon={ListOrdered}  title="Numbered list"       onClick={() => insertAtLineStart(ta(), '1. ', onBodyChange)} />
      <ToolbarBtn icon={Quote}        title="Blockquote / callout" onClick={() => insertAtLineStart(ta(), '> ', onBodyChange)} />
      <ToolbarBtn icon={Terminal}     title="Code block"          onClick={() => {
        const t = ta(); const { selectionStart: s, value } = t;
        const snippet = '\n```bash\n\n```\n';
        const next = value.slice(0, s) + snippet + value.slice(s);
        onBodyChange(next);
        setTimeout(() => { t.selectionStart = t.selectionEnd = s + 9; t.focus(); }, 0);
      }} />
      <div className="w-px h-4 bg-ois-border mx-1 shrink-0" />
      <button
        type="button"
        title="Slash commands"
        onClick={onSlashHelp}
        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-primary border border-ois-border transition-colors"
      >
        / <span className="text-[10px] font-normal">slash</span>
      </button>
    </div>
  );
};

// ── Publish menu ──────────────────────────────────────────────────────────────

const PublishMenu: React.FC<{
  onAction: (action: 'publish' | 'review' | 'draft') => void;
}> = ({ onAction }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} className="relative flex">
      <button
        onClick={() => onAction('publish')}
        className="flex items-center gap-1.5 px-4 py-2 rounded-l-lg bg-ois-primary text-white text-xs font-bold hover:bg-ois-primary-hover transition-colors"
      >
        <Check size={13} /> Publish now
      </button>
      <button
        onClick={() => setOpen(v => !v)}
        className="px-2 py-2 rounded-r-lg bg-ois-primary text-white hover:bg-ois-primary-hover transition-colors border-l border-white/20"
      >
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-ois-surface border border-ois-border rounded-lg shadow-ois-dropdown min-w-[180px] py-1">
          {[
            { id: 'publish' as const, label: 'Publish now', sub: 'Status → published' },
            { id: 'review'  as const, label: 'Submit for review', sub: 'Status → in review' },
            { id: 'draft'   as const, label: 'Save as draft', sub: 'Status → draft' },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => { onAction(opt.id); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-ois-surface-muted transition-colors"
            >
              <div className="text-xs font-semibold text-ois-text">{opt.label}</div>
              <div className="text-[10px] text-ois-text-subtle">{opt.sub}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Review reminder modal ─────────────────────────────────────────────────────

const ReviewReminderModal: React.FC<{
  action: 'publish' | 'review' | 'draft';
  onConfirm: (days: number | null) => void;
  onClose: () => void;
}> = ({ action, onConfirm, onClose }) => {
  const [days, setDays] = useState<number | null>(90);
  const label = action === 'publish' ? 'Published' : action === 'review' ? 'Submitted for review' : 'Saved as draft';
  return (
    <Modal isOpen onClose={onClose} title={`${label} — set review reminder?`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ois-text-muted">
          When should this article be reviewed for accuracy?
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[30, 60, 90, 180].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={cn(
                'py-3 rounded-lg border text-sm font-semibold transition-all',
                days === d
                  ? 'border-ois-primary bg-ois-primary-pale text-ois-primary'
                  : 'border-ois-border text-ois-text-muted hover:border-ois-primary/40',
              )}
            >
              {d} days
            </button>
          ))}
        </div>
        <div className="flex justify-between items-center gap-2 pt-1">
          <button onClick={() => onConfirm(null)} className="text-xs text-ois-text-subtle hover:text-ois-text transition-colors">
            Skip reminder
          </button>
          <button
            onClick={() => days && onConfirm(days)}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-ois-primary text-white text-xs font-bold hover:bg-ois-primary-hover transition-colors"
          >
            <Check size={13} /> Set reminder
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ── Tag input ─────────────────────────────────────────────────────────────────

const TagInput: React.FC<{
  tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void;
}> = ({ tags, onAdd, onRemove }) => {
  const [val, setVal] = useState('');
  const commit = () => {
    const t = val.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !tags.includes(t)) { onAdd(t); setVal(''); }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 border border-ois-border-strong rounded-lg bg-white focus-within:ring-2 focus-within:ring-ois-primary/20 focus-within:border-ois-primary min-h-[38px]">
      {tags.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium bg-ois-primary-pale text-ois-primary px-2 py-0.5 rounded-full">
          {tag}
          <button onClick={() => onRemove(tag)} className="hover:text-ois-danger transition-colors"><X size={10} /></button>
        </span>
      ))}
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } }}
        onBlur={commit}
        placeholder={tags.length === 0 ? 'Add tags (press Enter)…' : ''}
        className="flex-1 min-w-[80px] text-xs outline-none bg-transparent text-ois-text placeholder:text-ois-text-subtle"
      />
    </div>
  );
};

// ── Chips input (for CIs and linked items) ────────────────────────────────────

const ChipsInput: React.FC<{
  chips: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void;
  placeholder: string;
}> = ({ chips, onAdd, onRemove, placeholder }) => {
  const [val, setVal] = useState('');
  const commit = () => {
    const v = val.trim();
    if (v && !chips.includes(v)) { onAdd(v); setVal(''); }
  };
  return (
    <div className="space-y-1.5">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map(c => (
            <span key={c} className="inline-flex items-center gap-1 text-[11px] font-mono bg-ois-surface-muted border border-ois-border text-ois-text-muted px-2 py-0.5 rounded">
              {c}
              <button onClick={() => onRemove(c)} className="hover:text-ois-danger transition-colors"><X size={9} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1.5">
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          placeholder={placeholder}
          className="flex-1 h-8 px-2.5 text-xs border border-ois-border-strong rounded-lg bg-white outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
        />
        <button
          onClick={commit}
          className="h-8 px-2.5 rounded-lg border border-ois-border text-xs font-medium text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text transition-colors flex items-center gap-1"
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const KBEditor: React.FC = () => {
  const { slug }      = useParams<{ slug?: string }>();
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();

  const existingArticle = useMemo(() => slug ? getArticleBySlug(slug) : null, [slug]);
  const isEditing = !!existingArticle;

  // ── Editor state ─────────────────────────────────────────────────────────
  const [state, setState] = useState<EditorState>(() => {
    if (existingArticle) {
      return {
        title:       existingArticle.title,
        summary:     existingArticle.summary,
        body:        existingArticle.body,
        categoryId:  existingArticle.categoryId,
        contentType: existingArticle.contentType,
        visibility:  existingArticle.visibility,
        tags:        [...existingArticle.tags],
        linkedCIs:   [...existingArticle.relatedCIPublicIds],
        linkedItems: [...existingArticle.linkedProblemIds, ...existingArticle.linkedIncidentIds],
        status:      existingArticle.status,
      };
    }
    return getInitialEditorState(slug, searchParams);
  });

  const set = <K extends keyof EditorState>(key: K, val: EditorState[K]) =>
    setState(prev => ({ ...prev, [key]: val }));

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showPreview,    setShowPreview]    = useState(false);
  const [slashOpen,      setSlashOpen]      = useState(false);
  const [slashQuery,     setSlashQuery]     = useState('');
  const [slashIndex,     setSlashIndex]     = useState(0);
  const [slashInsertAt,  setSlashInsertAt]  = useState(0);
  const [autoSavedAt,    setAutoSavedAt]    = useState<Date | null>(null);
  const [lastSaved,      setLastSaved]      = useState<Date | null>(null);
  const [pendingAction,  setPendingAction]  = useState<'publish' | 'review' | 'draft' | null>(null);
  const [published,      setPublished]      = useState(false);
  const [lastBody,       setLastBody]       = useState(state.body);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-save
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (state.body !== lastBody) {
        setLastBody(state.body);
        setAutoSavedAt(new Date());
      }
    }, 10_000);
    return () => { if (autoSaveTimer.current) clearInterval(autoSaveTimer.current); };
  }, [state.body, lastBody]);

  // Autosave to localStorage (debounced 30s)
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('kb-editor-draft', JSON.stringify(state));
      setLastSaved(new Date());
    }, 30_000);
    return () => clearTimeout(timer);
  }, [state]);

  // Restore from localStorage on mount (new articles only, no source context)
  useEffect(() => {
    if (!slug && !searchParams.get('source')) {
      const saved = localStorage.getItem('kb-editor-draft');
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as EditorState;
          setState(parsed);
          setLastSaved(new Date());
        } catch {
          // ignore malformed data
        }
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcut for save
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setAutoSavedAt(new Date());
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  // ── Slash command detection ───────────────────────────────────────────────
  const filteredCmds = useMemo(
    () => SLASH_COMMANDS.filter(c => c.id.includes(slashQuery) || c.label.includes(slashQuery) || c.description.toLowerCase().includes(slashQuery)),
    [slashQuery]
  );

  const handleBodyChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    set('body', val);

    const cursor = e.target.selectionStart;
    const upToCursor = val.slice(0, cursor);
    const lineStart  = upToCursor.lastIndexOf('\n') + 1;
    const currentLine = upToCursor.slice(lineStart);

    if (currentLine.startsWith('/')) {
      const q = currentLine.slice(1);
      setSlashQuery(q);
      setSlashOpen(true);
      setSlashInsertAt(lineStart);
      setSlashIndex(0);
    } else {
      setSlashOpen(false);
    }
  }, []);

  const insertSlashCmd = useCallback((cmd: SlashCmd) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { value } = ta;
    const cursor = ta.selectionStart;
    const upToCursor = value.slice(0, cursor);
    const lineStart  = upToCursor.lastIndexOf('\n') + 1;
    const next = value.slice(0, lineStart) + cmd.snippet + value.slice(cursor);
    set('body', next);
    setSlashOpen(false);
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = lineStart + cmd.snippet.length;
      ta.focus();
    }, 0);
  }, []);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!slashOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, filteredCmds.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && filteredCmds[slashIndex]) { e.preventDefault(); insertSlashCmd(filteredCmds[slashIndex]); }
    if (e.key === 'Escape')    { setSlashOpen(false); }
  };

  const handlePublishAction = (action: 'publish' | 'review' | 'draft') => {
    setPendingAction(action);
  };

  const handleConfirmPublish = (_days: number | null) => {
    const status: KBStatus = pendingAction === 'publish' ? 'published' : pendingAction === 'review' ? 'in_review' : 'draft';
    set('status', status);
    setPendingAction(null);
    if (status === 'published') {
      setPublished(true);
      setTimeout(() => navigate('/kb'), 1200);
    }
  };

  const wordCount = useMemo(() => countWords(state.body), [state.body]);
  const readTime  = useMemo(() => estimateReadTime(state.body), [state.body]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="-mt-6 -mx-6 flex flex-col h-full min-h-screen bg-ois-surface">

      {/* ── TOP BAR ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-ois-border bg-ois-surface shrink-0 gap-4">
        {/* Left */}
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/kb')}
            className="flex items-center gap-1.5 text-xs font-medium text-ois-text-muted hover:text-ois-primary transition-colors shrink-0">
            <ArrowLeft size={14} /> KB
          </button>
          {isEditing && existingArticle && (
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-ois-border-strong shrink-0">·</span>
              <span className="text-xs text-ois-text-muted truncate">Editing: {existingArticle.publicId}</span>
              <span className="text-[10px] font-bold bg-ois-surface-muted border border-ois-border px-1.5 py-0.5 rounded text-ois-text-subtle shrink-0">
                v{existingArticle.version} (editing)
              </span>
            </div>
          )}
          {!isEditing && (
            <span className="text-xs text-ois-text-muted">New article</span>
          )}
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setAutoSavedAt(new Date()); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ois-border text-xs font-semibold text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text transition-colors"
          >
            <Save size={13} /> Save draft
          </button>
          <button
            onClick={() => setShowPreview(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors',
              showPreview
                ? 'border-ois-primary text-ois-primary bg-ois-primary-pale'
                : 'border-ois-border text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text',
            )}
          >
            {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
            {showPreview ? 'Editor' : 'Preview'}
          </button>
          <PublishMenu onAction={handlePublishAction} />
        </div>
      </div>

      {/* ── SCROLLABLE CONTENT ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">

          {/* ── METADATA FORM ───────────────────────────────────────── */}
          <div className="space-y-4 mb-6">
            {/* Title */}
            <div>
              <input
                type="text"
                value={state.title}
                onChange={e => set('title', e.target.value)}
                placeholder='e.g. "Runbook: Payment API restart procedure"'
                className="w-full text-2xl font-extrabold text-ois-text bg-transparent outline-none border-b-2 border-ois-border focus:border-ois-primary pb-2 placeholder:text-ois-text-subtle placeholder:font-normal placeholder:text-base transition-colors"
              />
            </div>

            {/* Dropdowns row */}
            <div className="grid grid-cols-3 gap-3">
              {/* Category */}
              <div>
                <label className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest block mb-1.5">Category</label>
                <FilterDropdown
                  value={state.categoryId}
                  onChange={v => set('categoryId', v)}
                  options={mockKBCategories.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Select category…"
                  fullWidth
                />
              </div>
              {/* Content type */}
              <div>
                <label className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest block mb-1.5">Content type</label>
                <FilterDropdown
                  value={state.contentType}
                  onChange={v => set('contentType', v as KBContentType)}
                  options={CONTENT_TYPES.map(ct => ({ value: ct.value, label: ct.label }))}
                  placeholder="Select type…"
                  fullWidth
                />
              </div>
              {/* Visibility */}
              <div>
                <label className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest block mb-1.5">Visibility</label>
                <FilterDropdown
                  value={state.visibility}
                  onChange={v => set('visibility', v as KBVisibility)}
                  options={VISIBILITIES.map(vis => ({ value: vis.value, label: vis.label }))}
                  placeholder="Select visibility…"
                  fullWidth
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest block mb-1.5">Tags</label>
              <TagInput
                tags={state.tags}
                onAdd={t => set('tags', [...state.tags, t])}
                onRemove={t => set('tags', state.tags.filter(x => x !== t))}
              />
            </div>

            {/* Linked items row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest block mb-1.5">Linked CIs (optional)</label>
                <ChipsInput
                  chips={state.linkedCIs}
                  onAdd={v => set('linkedCIs', [...state.linkedCIs, v])}
                  onRemove={v => set('linkedCIs', state.linkedCIs.filter(x => x !== v))}
                  placeholder="e.g. CI-APP-PAY-001"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest block mb-1.5">Linked problems / incidents</label>
                <ChipsInput
                  chips={state.linkedItems}
                  onAdd={v => set('linkedItems', [...state.linkedItems, v])}
                  onRemove={v => set('linkedItems', state.linkedItems.filter(x => x !== v))}
                  placeholder="e.g. PRB-2026-00018"
                />
              </div>
            </div>

            {/* Summary */}
            <div>
              <label className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest block mb-1.5">
                Summary <span className="text-ois-danger">*</span>
                <span className="font-normal normal-case text-ois-text-subtle ml-1">(1–2 sentences for search results)</span>
              </label>
              <textarea
                rows={2}
                value={state.summary}
                onChange={e => set('summary', e.target.value)}
                placeholder="Brief description shown in search results and article cards…"
                className="w-full rounded-lg border border-ois-border-strong px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
              />
            </div>
          </div>

          {/* ── EDITOR + PREVIEW ──────────────────────────────────────── */}
          <div className="border border-ois-border rounded-ois-card overflow-hidden">
            {/* Toolbar */}
            <EditorToolbar
              textareaRef={textareaRef}
              onBodyChange={val => set('body', val)}
              onSlashHelp={() => {
                const ta = textareaRef.current;
                if (!ta) return;
                const s = ta.selectionStart;
                const next = ta.value.slice(0, s) + '/' + ta.value.slice(s);
                set('body', next);
                setSlashOpen(true); setSlashQuery(''); setSlashIndex(0);
                setTimeout(() => { ta.selectionStart = ta.selectionEnd = s + 1; ta.focus(); }, 0);
              }}
            />

            {/* Editor/Preview panels */}
            <div className={cn('flex min-h-[420px]', showPreview ? 'divide-x divide-ois-border' : '')}>

              {/* Markdown pane */}
              <div className={cn('relative flex flex-col', showPreview ? 'w-1/2' : 'w-full')}>
                {!showPreview && (
                  <div className="px-3 py-1.5 border-b border-ois-border bg-ois-surface-muted">
                    <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Markdown</span>
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={state.body}
                  onChange={handleBodyChange}
                  onKeyDown={handleTextareaKeyDown}
                  spellCheck={false}
                  className="flex-1 w-full resize-none font-mono text-[13px] leading-relaxed text-ois-text bg-white px-5 py-4 outline-none"
                  style={{ minHeight: 400 }}
                />

                {/* Slash command palette */}
                {slashOpen && filteredCmds.length > 0 && (
                  <div className="absolute left-4 bottom-8 z-30 bg-ois-surface border border-ois-border rounded-lg shadow-ois-dropdown w-72 overflow-hidden">
                    <div className="px-3 py-2 border-b border-ois-border bg-ois-surface-muted">
                      <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Slash commands</span>
                      {slashQuery && <span className="text-[10px] text-ois-text-muted ml-2">/{slashQuery}</span>}
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1">
                      {filteredCmds.map((cmd, idx) => {
                        const Icon = cmd.icon;
                        return (
                          <button
                            key={cmd.id}
                            onClick={() => insertSlashCmd(cmd)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                              idx === slashIndex ? 'bg-ois-primary-pale' : 'hover:bg-ois-surface-muted',
                            )}
                          >
                            <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', idx === slashIndex ? 'bg-ois-primary text-white' : 'bg-ois-surface-muted text-ois-text-muted')}>
                              <Icon size={13} />
                            </div>
                            <div>
                              <div className={cn('text-xs font-bold', idx === slashIndex ? 'text-ois-primary' : 'text-ois-text')}>{cmd.label}</div>
                              <div className="text-[10px] text-ois-text-subtle">{cmd.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="px-3 py-2 border-t border-ois-border bg-ois-surface-muted">
                      <span className="text-[10px] text-ois-text-subtle">↑↓ navigate · Enter select · Esc dismiss</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview pane */}
              {showPreview && (
                <div className="w-1/2 flex flex-col">
                  <div className="px-3 py-1.5 border-b border-ois-border bg-ois-surface-muted">
                    <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Preview</span>
                  </div>
                  <div className="flex-1 px-6 py-5 overflow-y-auto bg-white">
                    {state.title && (
                      <h1 className="text-2xl font-extrabold text-ois-text mb-4">{state.title}</h1>
                    )}
                    <PreviewRenderer body={state.body} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── FOOTER ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between mt-3 px-1">
            <div className="flex items-center gap-3 text-[11px] text-ois-text-subtle">
              <span>{wordCount.toLocaleString()} words</span>
              <span>·</span>
              <span>{readTime} min read</span>
              {autoSavedAt && (
                <>
                  <span>·</span>
                  <span className="text-ois-success flex items-center gap-1">
                    <Check size={10} /> Auto-saved {Math.round((Date.now() - autoSavedAt.getTime()) / 1000)}s ago
                  </span>
                </>
              )}
              {!autoSavedAt && (
                <>
                  <span>·</span>
                  <span className="text-ois-text-subtle">Auto-saves every 10s</span>
                </>
              )}
              {lastSaved && (
                <>
                  <span>·</span>
                  <span className="text-xs text-ois-text-subtle">
                    Draft saved {formatRelative(lastSaved.toISOString())}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-ois-text-subtle">
              <span className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-semibold',
                state.status === 'published' ? 'bg-ois-success-pale text-ois-success' :
                state.status === 'in_review' ? 'bg-ois-warning-pale text-ois-warning' :
                'bg-ois-surface-muted text-ois-text-subtle',
              )}>
                {state.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {pendingAction && (
        <ReviewReminderModal
          action={pendingAction}
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirmPublish}
        />
      )}

      {/* Published toast */}
      {published && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-ois-success text-white text-xs font-bold px-5 py-3 rounded-full shadow-ois-modal">
          <Check size={14} /> Article published — redirecting to KB…
        </div>
      )}
    </div>
  );
};
