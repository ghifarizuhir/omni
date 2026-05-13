import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import {
  Search, X, Clock, ArrowRight, Package,
  SearchX, ChevronDown, Zap, Star, CalendarClock, Sparkles,
  Key, Laptop, Download, Mail, Users, Folder, SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { requestsService, useResource } from '@/src/services';
import { CatalogItem, CatalogCategory } from '@/src/types/request';

// ── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<CatalogCategory, { label: string; icon: React.FC<{ size?: number; className?: string }>; color: string; bg: string }> = {
  access:        { label: 'Access',        icon: Key,      color: 'text-ois-primary',   bg: 'bg-ois-primary-pale' },
  equipment:     { label: 'Equipment',     icon: Laptop,   color: 'text-ois-info',      bg: 'bg-ois-info-pale' },
  software:      { label: 'Software',      icon: Download, color: 'text-purple-600',    bg: 'bg-purple-50' },
  communication: { label: 'Communication', icon: Mail,     color: 'text-ois-success',   bg: 'bg-ois-success-pale' },
  personnel:     { label: 'Personnel',     icon: Users,    color: 'text-ois-warning',   bg: 'bg-ois-warning-pale' },
  general:       { label: 'General',       icon: Folder,   color: 'text-ois-text-muted', bg: 'bg-ois-surface-muted' },
};

const SORT_OPTIONS = [
  { value: 'relevant',   label: 'Most relevant' },
  { value: 'popular',    label: 'Most popular' },
  { value: 'fastest',    label: 'Fastest delivery' },
  { value: 'newest',     label: 'Recently added' },
] as const;
type SortValue = typeof SORT_OPTIONS[number]['value'];

const SUGGESTIONS = ['laptop', 'github', 'database', 'vpn', 'slack', 'monitor', 'software'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function getLucideIcon(name: string, size = 18, cls = '') {
  const Icon = (LucideIcons as Record<string, React.FC<{ size?: number; className?: string }>>)[name];
  if (!Icon) return <Package size={size} className={cls} />;
  return <Icon size={size} className={cls} />;
}

function etaLabel(days: number) {
  if (days === 0) return 'Same day';
  if (days === 1) return '~1 day';
  return `~${days} days`;
}

function scoreItem(item: CatalogItem, q: string): number {
  const lower = q.toLowerCase();
  let score = 0;
  if (item.name.toLowerCase().includes(lower)) score += 10;
  if (item.shortDescription.toLowerCase().includes(lower)) score += 5;
  if (item.tags.some(t => t.includes(lower))) score += 4;
  if (item.category.includes(lower)) score += 3;
  if (item.description.toLowerCase().includes(lower)) score += 2;
  return score;
}

function filterAndSort(items: CatalogItem[], q: string, cat: CatalogCategory | 'all', sort: SortValue) {
  let result = items.filter(i => i.enabled);

  if (cat !== 'all') result = result.filter(i => i.category === cat);

  if (q.trim()) {
    const lower = q.toLowerCase();
    result = result.filter(i =>
      i.name.toLowerCase().includes(lower) ||
      i.shortDescription.toLowerCase().includes(lower) ||
      i.description.toLowerCase().includes(lower) ||
      i.tags.some(t => t.includes(lower)) ||
      i.category.includes(lower) ||
      i.publicId.toLowerCase().includes(lower)
    );
  }

  result = [...result].sort((a, b) => {
    if (q.trim() && sort === 'relevant') return scoreItem(b, q) - scoreItem(a, q);
    if (sort === 'popular')  return b.popularity - a.popularity;
    if (sort === 'fastest')  return a.estimatedFulfillmentDays - b.estimatedFulfillmentDays;
    if (sort === 'newest')   return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return b.popularity - a.popularity;
  });

  return result;
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Detailed result card shown in search mode */
const ResultCard: React.FC<{ item: CatalogItem; query: string }> = ({ item, query }) => {
  const catMeta = CATEGORY_META[item.category];
  const CatIcon = catMeta.icon;

  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-yellow-100 text-yellow-800 rounded px-0.5 not-italic font-medium">{part}</mark>
        : part
    );
  };

  return (
    <div className="group bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:border-ois-primary/30 transition-all duration-150 p-5">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5', catMeta.bg)}>
          {getLucideIcon(item.iconName, 22, catMeta.color)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-ois-text group-hover:text-ois-primary transition-colors">
                {highlight(item.name)}
              </h3>
              <span className="font-mono text-[10px] text-ois-text-subtle">{item.publicId}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', catMeta.bg, catMeta.color)}>
                <CatIcon size={10} />
                {catMeta.label}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-ois-surface-muted text-ois-text-muted">
                <Clock size={10} />
                {etaLabel(item.estimatedFulfillmentDays)}
              </span>
              {item.cost && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-ois-warning-pale text-ois-warning">
                  {item.cost.currency} {item.cost.amount.toLocaleString()}+
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-ois-text-muted mt-2 leading-relaxed">
            {highlight(item.shortDescription)}
          </p>

          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            {item.tags.slice(0, 5).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-ois-surface-muted text-ois-text-subtle border border-ois-border">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          to={`/portal/catalog/${item.id}`}
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ois-primary text-white text-xs font-semibold hover:bg-ois-primary-hover transition-colors active:scale-95 mt-0.5"
        >
          Request <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
};

/** Recommended card (2-col grid, no-search state) */
const RecommendedCard: React.FC<{ item: CatalogItem }> = ({ item }) => {
  const catMeta = CATEGORY_META[item.category];
  const CatIcon = catMeta.icon;

  return (
    <Link
      to={`/portal/catalog/${item.id}`}
      className="group bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card hover:shadow-ois-card-hover hover:-translate-y-0.5 hover:border-ois-primary/30 transition-all duration-150 p-5 flex gap-4"
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', catMeta.bg)}>
        {getLucideIcon(item.iconName, 22, catMeta.color)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-bold text-ois-text group-hover:text-ois-primary transition-colors leading-snug">
              {item.name}
            </div>
            <div className="text-xs text-ois-text-muted mt-0.5 leading-snug line-clamp-2">{item.shortDescription}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2.5">
          <span className="flex items-center gap-1 text-[10px] text-ois-text-subtle">
            <Clock size={9} /> {etaLabel(item.estimatedFulfillmentDays)}
          </span>
          {item.cost && (
            <span className="flex items-center gap-1 text-[10px] text-ois-warning">
              {item.cost.currency} {item.cost.amount.toLocaleString()}+
            </span>
          )}
          <span className="ml-auto text-[11px] font-semibold text-ois-primary group-hover:underline flex items-center gap-1">
            Request <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </Link>
  );
};

/** Category browse tile */
const CategoryTile: React.FC<{
  category: CatalogCategory;
  count: number;
  items: CatalogItem[];
  active: boolean;
  onClick: () => void;
}> = ({ category, count, items, active, onClick }) => {
  const meta = CATEGORY_META[category];
  const CatIcon = meta.icon;
  const preview = items.slice(0, 3).map(i => i.name.split('(')[0].trim()).join(' · ');

  return (
    <button
      onClick={onClick}
      className={cn(
        'group text-left bg-ois-surface border rounded-ois-card shadow-ois-card p-4 transition-all duration-150',
        active
          ? 'border-ois-primary bg-ois-primary-pale shadow-ois-card-hover'
          : 'border-ois-border hover:shadow-ois-card-hover hover:border-ois-primary/30 hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', active ? 'bg-ois-primary' : meta.bg)}>
          <CatIcon size={15} className={active ? 'text-white' : meta.color} />
        </div>
        <div>
          <div className={cn('text-xs font-bold', active ? 'text-ois-primary' : 'text-ois-text')}>{meta.label}</div>
          <div className="text-[10px] text-ois-text-subtle">{count} item{count !== 1 ? 's' : ''}</div>
        </div>
      </div>
      {preview && (
        <div className="text-[10px] text-ois-text-subtle leading-relaxed line-clamp-2">{preview}</div>
      )}
    </button>
  );
};

// ── Sort dropdown ─────────────────────────────────────────────────────────────

const SortDropdown: React.FC<{ value: SortValue; onChange: (v: SortValue) => void }> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = SORT_OPTIONS.find(o => o.value === value)?.label ?? 'Sort';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-ois-border-strong bg-ois-surface text-xs font-medium text-ois-text hover:bg-ois-surface-muted transition-colors"
      >
        <SlidersHorizontal size={13} className="text-ois-text-muted" />
        Sort: {label}
        <ChevronDown size={13} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-ois-surface border border-ois-border rounded-lg shadow-ois-dropdown min-w-[160px] py-1">
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs transition-colors',
                value === opt.value
                  ? 'text-ois-primary font-semibold bg-ois-primary-pale'
                  : 'text-ois-text hover:bg-ois-surface-muted',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const Catalog: React.FC = () => {
  const [searchParams] = useSearchParams();

  const [query,     setQuery]     = useState(() => searchParams.get('q') ?? '');
  const [catFilter, setCatFilter] = useState<CatalogCategory | 'all'>('all');
  const [sort,      setSort]      = useState<SortValue>('relevant');
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync URL param on mount
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) { setQuery(q); inputRef.current?.focus(); }
  }, []);

  const { data: catalogData } = useResource(() => requestsService.catalog(), []);
  const mockCatalogItems = catalogData ?? [];
  const allEnabled = useMemo(() => mockCatalogItems.filter(i => i.enabled), [mockCatalogItems]);

  const categoryCounts = useMemo(() =>
    Object.fromEntries(
      (Object.keys(CATEGORY_META) as CatalogCategory[]).map(cat => [
        cat,
        allEnabled.filter(i => i.category === cat).length,
      ])
    ) as Record<CatalogCategory, number>,
  [allEnabled]);

  const recommended = useMemo(
    () => [...mockCatalogItems].sort((a, b) => b.popularity - a.popularity).slice(0, 6),
    [mockCatalogItems]
  );

  const results = useMemo(
    () => filterAndSort(allEnabled, query, catFilter, sort),
    [allEnabled, query, catFilter, sort]
  );

  const isSearching = query.trim() !== '' || catFilter !== 'all';

  const handleCategoryClick = (cat: CatalogCategory) => {
    setCatFilter(prev => prev === cat ? 'all' : cat);
  };

  const clearAll = () => { setQuery(''); setCatFilter('all'); };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full pb-16 p-6">
      <div className="mb-6">
        <p className="text-sm text-ois-text-muted">
          Request services, equipment, software, and access.{' '}
          <span className="font-medium text-ois-text">{allEnabled.length} items available.</span>
        </p>
      </div>

      {/* ── SEARCH BAR ──────────────────────────────────────────────────── */}
      <div className="max-w-2xl mb-6">
        <div className="flex items-center bg-ois-surface rounded-xl border border-ois-border shadow-ois-card transition-all focus-within:ring-2 focus-within:ring-ois-primary/25 focus-within:border-ois-primary focus-within:shadow-ois-card-hover overflow-hidden">
          <Search size={17} className="ml-4 shrink-0 text-ois-text-subtle" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSort('relevant'); }}
            placeholder="Search catalog…"
            className="flex-1 px-3 py-3 text-sm bg-transparent outline-none text-ois-text placeholder:text-ois-text-subtle"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="mr-2 p-1.5 rounded text-ois-text-subtle hover:text-ois-text hover:bg-ois-surface-muted transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Suggestion chips (only when empty) */}
        {!query && (
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-[11px] text-ois-text-subtle font-medium">Suggestions:</span>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="text-[11px] px-2 py-0.5 rounded-full border border-ois-border bg-ois-surface text-ois-text-muted hover:text-ois-primary hover:border-ois-primary/40 transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CATEGORY FILTER STRIP (always visible) ────────────────────── */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setCatFilter('all')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
            catFilter === 'all'
              ? 'bg-ois-primary text-white border-ois-primary'
              : 'bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary/40 hover:text-ois-primary',
          )}
        >
          All ({allEnabled.length})
        </button>
        {(Object.keys(CATEGORY_META) as CatalogCategory[]).filter(c => categoryCounts[c] > 0).map(cat => {
          const meta = CATEGORY_META[cat];
          const CatIcon = meta.icon;
          const active = catFilter === cat;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                active
                  ? `${meta.bg} ${meta.color} border-current`
                  : 'bg-ois-surface text-ois-text-muted border-ois-border hover:border-ois-primary/40 hover:text-ois-primary',
              )}
            >
              <CatIcon size={11} />
              {meta.label} ({categoryCounts[cat]})
            </button>
          );
        })}
        {isSearching && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-ois-danger border border-ois-danger/30 hover:bg-ois-danger-pale transition-colors ml-auto"
          >
            <X size={11} /> Clear filters
          </button>
        )}
      </div>

      {/* ── CONTENT AREA ────────────────────────────────────────────────── */}

      {!isSearching ? (
        /* ── DEFAULT (no search, no category filter) ─────────────────── */
        <div className="space-y-10">

          {/* Recommended */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-ois-primary" />
              <h2 className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest">Recommended for you</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {recommended.map(item => <RecommendedCard key={item.id} item={item} />)}
            </div>
          </section>

          {/* Browse by category */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xs font-bold text-ois-text-subtle uppercase tracking-widest">Browse by category</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {(Object.keys(CATEGORY_META) as CatalogCategory[]).map(cat => (
                <CategoryTile
                  key={cat}
                  category={cat}
                  count={categoryCounts[cat]}
                  items={allEnabled.filter(i => i.category === cat)}
                  active={catFilter === cat}
                  onClick={() => handleCategoryClick(cat)}
                />
              ))}
            </div>
          </section>
        </div>
      ) : results.length === 0 ? (
        /* ── EMPTY STATE ──────────────────────────────────────────────── */
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-xl bg-ois-surface-muted flex items-center justify-center mb-4">
            <SearchX size={24} className="text-ois-text-subtle" />
          </div>
          <h3 className="text-sm font-bold text-ois-text mb-1">
            No catalog items match{query ? ` "${query}"` : ' your filters'}
          </h3>
          <p className="text-xs text-ois-text-muted max-w-xs">
            Try fewer keywords, or browse all categories.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={clearAll}
              className="text-xs font-semibold text-ois-primary hover:underline"
            >
              Browse all categories
            </button>
            <span className="text-ois-border-strong">·</span>
            <a href="mailto:itservicedesk@acme.io" className="text-xs font-semibold text-ois-primary hover:underline">
              Contact Service Desk
            </a>
          </div>
        </div>
      ) : (
        /* ── SEARCH / FILTERED RESULTS ───────────────────────────────── */
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-ois-text-muted">
              <span className="font-semibold text-ois-text">{results.length}</span>{' '}
              result{results.length !== 1 ? 's' : ''}
              {query && <> for <span className="font-semibold text-ois-text">"{query}"</span></>}
              {catFilter !== 'all' && <> in <span className="font-semibold text-ois-text">{CATEGORY_META[catFilter].label}</span></>}
            </p>
            <SortDropdown value={sort} onChange={setSort} />
          </div>

          <div className="space-y-3">
            {results.map(item => <ResultCard key={item.id} item={item} query={query} />)}
          </div>
        </div>
      )}
    </div>
  );
};
