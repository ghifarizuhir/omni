import React, { useState, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import {
  Search, X, Plus, BarChart2, BookOpen, Wrench, ListChecks,
  FileText, HelpCircle, Microscope, Rocket, Eye, ThumbsUp,
  Clock, SlidersHorizontal, SearchX, ChevronDown, ChevronRight,
  Tag, Check, Edit3,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { mockKBArticles } from '@/src/mocks/kbArticles';
import { mockKBCategories } from '@/src/mocks/kbCategories';
import { KBArticle, KBStatus, KBContentType } from '@/src/types/knowledge';

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_TYPE_META: Record<KBContentType, { label: string; icon: React.FC<{ size?: number; className?: string }>; color: string; bg: string }> = {
  how_to:              { label: 'How-To',       icon: ListChecks,  color: 'text-ois-primary',  bg: 'bg-ois-primary-pale' },
  troubleshooting:     { label: 'Troubleshoot', icon: Wrench,      color: 'text-ois-warning',  bg: 'bg-ois-warning-pale' },
  runbook:             { label: 'Runbook',       icon: BookOpen,    color: 'text-ois-success',  bg: 'bg-ois-success-pale' },
  reference:           { label: 'Reference',     icon: FileText,    color: 'text-ois-info',     bg: 'bg-ois-info-pale' },
  faq:                 { label: 'FAQ',           icon: HelpCircle,  color: 'text-purple-600',   bg: 'bg-purple-50' },
  incident_postmortem: { label: 'Postmortem',    icon: Microscope,  color: 'text-ois-danger',   bg: 'bg-ois-danger-pale' },
};

const STATUS_META: Record<KBStatus, { label: string; dot: string; text: string }> = {
  published:  { label: 'Published',  dot: 'bg-ois-success',      text: 'text-ois-success' },
  draft:      { label: 'Draft',      dot: 'bg-ois-text-subtle',  text: 'text-ois-text-muted' },
  in_review:  { label: 'In Review',  dot: 'bg-ois-warning',      text: 'text-ois-warning' },
  archived:   { label: 'Archived',   dot: 'bg-ois-text-subtle',  text: 'text-ois-text-muted' },
  expired:    { label: 'Expired',    dot: 'bg-ois-danger',       text: 'text-ois-danger' },
};

const LUCIDE_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  Rocket: Rocket, BookOpen: BookOpen, Wrench: Wrench, ListChecks: ListChecks,
  FileText: FileText, Microscope: Microscope,
};

type SortKey = 'recent' | 'viewed' | 'helpful' | 'alpha';

// ── Helpers ───────────────────────────────────────────────────────────────────

function helpfulRate(a: KBArticle): number {
  const total = a.helpfulCount + a.unhelpfulCount;
  return total > 0 ? Math.round((a.helpfulCount / total) * 100) : 0;
}

function readTime(seconds: number): string {
  if (seconds < 60) return '<1 min read';
  return `${Math.ceil(seconds / 60)} min read`;
}

function sortArticles(articles: KBArticle[], sort: SortKey): KBArticle[] {
  return [...articles].sort((a, b) => {
    if (sort === 'recent')  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (sort === 'viewed')  return b.viewCount - a.viewCount;
    if (sort === 'helpful') {
      const minVotes = 5;
      const aRate = (a.helpfulCount + a.unhelpfulCount) >= minVotes ? helpfulRate(a) : -1;
      const bRate = (b.helpfulCount + b.unhelpfulCount) >= minVotes ? helpfulRate(b) : -1;
      return bRate - aRate;
    }
    if (sort === 'alpha')   return a.title.localeCompare(b.title);
    return 0;
  });
}

/** Extract a ~140-char snippet around the first match */
function extractSnippet(text: string, query: string): string {
  if (!query.trim()) return text.slice(0, 160);
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text.slice(0, 160);
  const start = Math.max(0, idx - 60);
  const end   = Math.min(text.length, idx + query.length + 80);
  const snippet = text.slice(start, end);
  return (start > 0 ? '…' : '') + snippet + (end < text.length ? '…' : '');
}

/** Highlight occurrences of query inside text */
function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    regex.test(part)
      ? <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5 not-italic font-semibold">{part}</mark>
      : part
  );
}

// ── Article card (list view) ──────────────────────────────────────────────────

const ArticleCard: React.FC<{ article: KBArticle; query: string; showSnippet?: boolean }> = ({
  article, query, showSnippet = false,
}) => {
  const ctMeta = CONTENT_TYPE_META[article.contentType];
  const CtIcon = ctMeta.icon;
  const stMeta = STATUS_META[article.status];
  const rate   = helpfulRate(article);
  const totalVotes = article.helpfulCount + article.unhelpfulCount;

  const snippet = showSnippet
    ? extractSnippet(
        article.summary + ' ' + article.body.replace(/[#*`>\-]/g, '').slice(0, 400),
        query
      )
    : '';

  return (
    <Link
      to={`/kb/${article.slug}`}
      className="group block bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:-translate-y-px hover:border-ois-primary/20 transition-all duration-150 p-5"
    >
      <div className="flex items-start gap-3">
        {/* Content-type icon */}
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', ctMeta.bg)}>
          <CtIcon size={16} className={ctMeta.color} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start gap-2 justify-between flex-wrap">
            <h3 className="text-sm font-bold text-ois-text group-hover:text-ois-primary transition-colors leading-snug flex-1 min-w-0">
              {query ? highlight(article.title, query) : article.title}
            </h3>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                stMeta.text, article.status !== 'published' ? 'bg-ois-surface-muted' : '',
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full', stMeta.dot)} />
                {stMeta.label}
              </span>
              <span className="font-mono text-[10px] text-ois-text-subtle">{article.publicId}</span>
            </div>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ois-text-subtle flex-wrap">
            <span>{article.authorName}</span>
            <span>·</span>
            <span>Updated {formatRelative(article.updatedAt)}</span>
            {article.viewCount > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Eye size={10} /> {article.viewCount.toLocaleString()}</span>
              </>
            )}
            {totalVotes >= 5 && (
              <>
                <span>·</span>
                <span className={cn('flex items-center gap-0.5 font-semibold', rate >= 80 ? 'text-ois-success' : rate >= 60 ? 'text-ois-warning' : 'text-ois-danger')}>
                  <ThumbsUp size={10} /> {rate}%
                </span>
              </>
            )}
            {article.averageReadTimeSeconds > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Clock size={10} /> {readTime(article.averageReadTimeSeconds)}</span>
              </>
            )}
          </div>

          {/* Snippet or summary */}
          {showSnippet && snippet ? (
            <p className="text-xs text-ois-text-muted mt-2 leading-relaxed">
              {highlight(snippet, query)}
            </p>
          ) : (
            <p className="text-xs text-ois-text-muted mt-2 leading-relaxed line-clamp-2">{article.summary}</p>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1 mt-2.5 flex-wrap">
            <span className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full', ctMeta.bg, ctMeta.color)}>
              <CtIcon size={9} /> {ctMeta.label}
            </span>
            {article.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-ois-surface-muted text-ois-text-subtle border border-ois-border">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
};

// ── Sort dropdown ─────────────────────────────────────────────────────────────

const SortDropdown: React.FC<{ value: SortKey; onChange: (v: SortKey) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const options: { value: SortKey; label: string }[] = [
    { value: 'recent',  label: 'Most recent' },
    { value: 'viewed',  label: 'Most viewed' },
    { value: 'helpful', label: 'Most helpful' },
    { value: 'alpha',   label: 'Alphabetical' },
  ];
  const current = options.find(o => o.value === value)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ois-border bg-ois-surface text-xs font-medium text-ois-text hover:bg-ois-surface-muted transition-colors"
      >
        <SlidersHorizontal size={12} className="text-ois-text-muted" />
        Sort: {current.label}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-ois-surface border border-ois-border rounded-lg shadow-ois-dropdown min-w-[160px] py-1">
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between',
                value === opt.value
                  ? 'text-ois-primary font-semibold bg-ois-primary-pale'
                  : 'text-ois-text hover:bg-ois-surface-muted',
              )}
            >
              {opt.label}
              {value === opt.value && <Check size={12} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const KBBrowse: React.FC = () => {
  const navigate = useNavigate();

  const [query,       setQuery]       = useState('');
  const [catFilter,   setCatFilter]   = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<Set<KBStatus>>(new Set());
  const [tagFilter,   setTagFilter]   = useState<string | null>(null);
  const [sort,        setSort]        = useState<SortKey>('recent');

  const allArticles = mockKBArticles;

  // ── Aggregates ──────────────────────────────────────────────────────────────

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<KBStatus, number>> = {};
    allArticles.forEach(a => { counts[a.status] = (counts[a.status] ?? 0) + 1; });
    return counts;
  }, []);

  const allTags = useMemo(() => {
    const counts: Record<string, number> = {};
    allArticles.forEach(a => a.tags.forEach(t => { counts[t] = (counts[t] ?? 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 12);
  }, []);

  const catCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allArticles.forEach(a => { counts[a.categoryId] = (counts[a.categoryId] ?? 0) + 1; });
    return counts;
  }, []);

  // ── Filtering + search ──────────────────────────────────────────────────────

  const results = useMemo(() => {
    let r = allArticles;

    if (catFilter !== 'all') r = r.filter(a => a.categoryId === catFilter);

    if (statusFilter.size > 0) r = r.filter(a => statusFilter.has(a.status));

    if (tagFilter) r = r.filter(a => a.tags.includes(tagFilter));

    if (query.trim()) {
      const q = query.toLowerCase();
      r = r.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.body.toLowerCase().includes(q) ||
        a.tags.some(t => t.includes(q)) ||
        a.publicId.toLowerCase().includes(q) ||
        a.authorName.toLowerCase().includes(q)
      );
    }

    return sortArticles(r, sort);
  }, [query, catFilter, statusFilter, tagFilter, sort]);

  const isFiltering = query.trim() !== '' || catFilter !== 'all' || statusFilter.size > 0 || tagFilter !== null;

  const toggleStatus = (s: KBStatus) => {
    setStatusFilter(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const clearAll = () => {
    setQuery(''); setCatFilter('all');
    setStatusFilter(new Set()); setTagFilter(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full pb-16">

      {/* ── PAGE HEADER ───────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ois-text tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-ois-text-muted mt-1">
            <span className="font-semibold text-ois-text">{allArticles.length}</span> articles across{' '}
            <span className="font-semibold text-ois-text">{mockKBCategories.filter(c => catCounts[c.id] > 0).length}</span> categories
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => navigate('/kb/analytics')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ois-border text-xs font-semibold text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text transition-colors"
          >
            <BarChart2 size={14} /> Analytics
          </button>
          <button
            onClick={() => navigate('/kb/editor')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-ois-primary text-white text-xs font-semibold hover:bg-ois-primary-hover transition-colors active:scale-95"
          >
            <Plus size={14} /> New article
          </button>
        </div>
      </div>

      {/* ── SEARCH BAR ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center bg-ois-surface rounded-xl border border-ois-border shadow-ois-card transition-all focus-within:ring-2 focus-within:ring-ois-primary/25 focus-within:border-ois-primary focus-within:shadow-ois-card-hover overflow-hidden">
          <Search size={16} className="ml-4 shrink-0 text-ois-text-subtle" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search articles, runbooks, troubleshooting guides…"
            className="flex-1 px-3 py-3 text-sm bg-transparent outline-none text-ois-text placeholder:text-ois-text-subtle"
          />
          {query && (
            <button onClick={() => setQuery('')} className="mr-3 p-1.5 rounded text-ois-text-subtle hover:text-ois-text hover:bg-ois-surface-muted transition-colors">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── TWO-COLUMN LAYOUT ─────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
        <aside className="w-56 shrink-0 sticky top-4 space-y-1">

          {/* Categories */}
          <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden">
            <div className="px-3 py-2.5 border-b border-ois-border">
              <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Categories</p>
            </div>
            <div className="py-1">
              {/* All */}
              <button
                onClick={() => setCatFilter('all')}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-xs transition-colors',
                  catFilter === 'all'
                    ? 'text-ois-primary font-bold bg-ois-primary-pale'
                    : 'text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text',
                )}
              >
                <span>All articles</span>
                <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', catFilter === 'all' ? 'bg-ois-primary text-white' : 'bg-ois-surface-muted text-ois-text-subtle')}>
                  {allArticles.length}
                </span>
              </button>

              <div className="my-1 border-t border-ois-border" />

              {/* Per category */}
              {mockKBCategories.map(cat => {
                const CatIcon = LUCIDE_ICONS[cat.iconName] ?? BookOpen;
                const count   = catCounts[cat.id] ?? 0;
                const active  = catFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCatFilter(active ? 'all' : cat.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors',
                      active
                        ? 'text-ois-primary font-bold bg-ois-primary-pale'
                        : count > 0
                        ? 'text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text'
                        : 'text-ois-text-subtle opacity-50 cursor-not-allowed',
                    )}
                    disabled={count === 0}
                  >
                    <CatIcon size={12} className={active ? 'text-ois-primary' : 'text-ois-text-subtle'} />
                    <span className="flex-1 text-left">{cat.name}</span>
                    <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', active ? 'bg-ois-primary text-white' : 'bg-ois-surface-muted text-ois-text-subtle')}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status filter */}
          <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden">
            <div className="px-3 py-2.5 border-b border-ois-border">
              <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Status</p>
            </div>
            <div className="p-3 space-y-1">
              {(Object.keys(STATUS_META) as KBStatus[]).map(s => {
                const count   = statusCounts[s] ?? 0;
                const checked = statusFilter.has(s);
                const meta    = STATUS_META[s];
                if (count === 0) return null;
                return (
                  <label key={s} className="flex items-center gap-2.5 cursor-pointer group py-1">
                    <div
                      onClick={() => toggleStatus(s)}
                      className={cn(
                        'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0',
                        checked ? 'bg-ois-primary border-ois-primary' : 'border-ois-border-strong group-hover:border-ois-primary/50',
                      )}
                    >
                      {checked && <Check size={9} className="text-white" />}
                    </div>
                    <span className={cn('flex-1 text-xs', checked ? 'font-semibold text-ois-text' : 'text-ois-text-muted')}>{meta.label}</span>
                    <span className="text-[10px] text-ois-text-subtle">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Tags */}
          <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden">
            <div className="px-3 py-2.5 border-b border-ois-border">
              <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Tags</p>
            </div>
            <div className="p-3 flex flex-wrap gap-1.5">
              {allTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={cn(
                    'text-[10px] px-2 py-1 rounded-full border transition-all',
                    tagFilter === tag
                      ? 'bg-ois-primary text-white border-ois-primary font-semibold'
                      : 'bg-ois-surface-muted text-ois-text-subtle border-ois-border hover:border-ois-primary/40 hover:text-ois-primary',
                  )}
                >
                  {tag} <span className="opacity-70">({count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Clear all */}
          {isFiltering && (
            <button
              onClick={clearAll}
              className="w-full text-xs text-ois-danger font-semibold px-3 py-2 rounded-lg border border-ois-danger/30 hover:bg-ois-danger-pale transition-colors flex items-center justify-center gap-1"
            >
              <X size={12} /> Clear all filters
            </button>
          )}
        </aside>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Results header */}
          <div className="flex items-center justify-between mb-4">
            {query.trim() ? (
              <p className="text-sm text-ois-text-muted">
                <span className="font-semibold text-ois-text">{results.length}</span>{' '}
                result{results.length !== 1 ? 's' : ''} for{' '}
                <span className="font-semibold text-ois-text">"{query}"</span>
                {catFilter !== 'all' && (
                  <> in <span className="font-semibold text-ois-text">
                    {mockKBCategories.find(c => c.id === catFilter)?.name ?? catFilter}
                  </span></>
                )}
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-ois-text-muted uppercase tracking-wider">
                  {catFilter !== 'all'
                    ? mockKBCategories.find(c => c.id === catFilter)?.name
                    : statusFilter.size > 0
                    ? `Filtered · ${results.length} articles`
                    : tagFilter
                    ? `Tagged: ${tagFilter}`
                    : 'All articles'}
                </p>
              </div>
            )}
            <SortDropdown value={sort} onChange={setSort} />
          </div>

          {/* Article list */}
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-14 h-14 rounded-xl bg-ois-surface-muted flex items-center justify-center mb-4">
                <SearchX size={24} className="text-ois-text-subtle" />
              </div>
              <h3 className="text-sm font-bold text-ois-text mb-1">No articles found</h3>
              <p className="text-xs text-ois-text-muted max-w-xs mb-4">
                {query ? `No articles match "${query}".` : 'No articles match your current filters.'}
              </p>
              <div className="flex items-center gap-3">
                {isFiltering && (
                  <button onClick={clearAll} className="text-xs font-semibold text-ois-primary hover:underline">
                    Clear filters
                  </button>
                )}
                {query && (
                  <>
                    <span className="text-ois-border-strong">·</span>
                    <button
                      onClick={() => navigate(`/kb/editor?title=${encodeURIComponent(query)}`)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-ois-primary hover:underline"
                    >
                      <Edit3 size={11} /> Suggest article
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(article => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  query={query}
                  showSnippet={!!query.trim()}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
