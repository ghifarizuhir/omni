import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Share2, MoreHorizontal, ThumbsUp, ThumbsDown,
  BookOpen, Eye, Clock, Tag, AlertTriangle, FileWarning,
  ChevronRight, Copy, Check, X, ExternalLink, Send,
  Server, AlertCircle, BookMarked, Info, Lightbulb, ShieldAlert,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatDate, formatRelative } from '@/src/lib/format';
import { knowledgeService, useResource } from '@/src/services';
import { Can } from '@/src/lib/rbac';
import { Modal } from '@/src/components/ui/Modal';
import { KBArticle, KBContentType, KBStatus } from '@/src/types/knowledge';

type ArticleLookup = (publicId: string) => KBArticle | undefined;

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_TYPE_META: Record<KBContentType, { label: string; color: string; bg: string; stripe: string }> = {
  how_to:              { label: 'How-To',       color: 'text-ois-primary',  bg: 'bg-ois-primary-pale',  stripe: '#1F4FD4' },
  troubleshooting:     { label: 'Troubleshoot', color: 'text-ois-warning',  bg: 'bg-ois-warning-pale',  stripe: '#F79009' },
  runbook:             { label: 'Runbook',       color: 'text-ois-success',  bg: 'bg-ois-success-pale',  stripe: '#12B76A' },
  reference:           { label: 'Reference',     color: 'text-ois-info',     bg: 'bg-ois-info-pale',     stripe: '#0BA5EC' },
  faq:                 { label: 'FAQ',           color: 'text-purple-600',   bg: 'bg-purple-50',         stripe: '#7C3AED' },
  incident_postmortem: { label: 'Postmortem',    color: 'text-ois-danger',   bg: 'bg-ois-danger-pale',   stripe: '#F04438' },
};

// ── ToC helpers ───────────────────────────────────────────────────────────────

interface TocEntry { level: number; text: string; id: string }

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractToc(body: string): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^(#{2,4})\s+(.+)/);
    if (m) entries.push({ level: m[1].length, text: m[2].trim(), id: slugify(m[2].trim()) });
  }
  return entries;
}

// ── Inline renderer ───────────────────────────────────────────────────────────

/** Map KB/INC/PRB/CHG public IDs to hrefs */
function makeRefHref(lookup: ArticleLookup) {
  return (ref: string): string => {
    if (ref.startsWith('KB-')) {
      const a = lookup(ref);
      return a ? `/kb/${a.slug}` : '/kb';
    }
    if (ref.startsWith('INC-')) return `/incidents`;
    if (ref.startsWith('PRB-')) return `/problems`;
    if (ref.startsWith('CHG-')) return `/changes`;
    if (ref.startsWith('CAT-')) return `/portal/catalog`;
    return '#';
  };
}

function renderInline(text: string, refHref: (ref: string) => string): React.ReactNode[] {
  // Patterns: **bold**, `code`, KB-XXXXX, INC-XXXX-XXXXX, PRB-..., CHG-...
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|(?:KB|INC|PRB|CHG|CAT)-[\w-]+)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} className="font-semibold text-ois-text">{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="bg-ois-surface-muted text-ois-text font-mono text-[12px] px-1.5 py-0.5 rounded border border-ois-border">{p.slice(1, -1)}</code>;
    if (/^(KB|INC|PRB|CHG|CAT)-/.test(p))
      return <Link key={i} to={refHref(p)} className="text-ois-primary hover:underline font-mono text-[13px]">{p}</Link>;
    return p;
  });
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

interface CodeBlockProps { lang: string; code: string }
const CodeBlock: React.FC<CodeBlockProps> = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="relative group my-6 rounded-lg overflow-hidden border border-ois-border">
      {lang && (
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#181825] border-b border-white/10">
          <span className="text-[11px] font-mono text-white/50">{lang}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1 text-[11px] text-white/40 hover:text-white/80 transition-colors"
          >
            {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
          </button>
        </div>
      )}
      <pre className="bg-[#1e1e2e] text-[#cdd6f4] text-[13px] leading-relaxed px-5 py-5 overflow-x-auto font-mono m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
};

type CalloutType = 'note' | 'warning' | 'danger' | 'tip';

const CALLOUT_META: Record<CalloutType, { label: string; border: string; bg: string; iconCls: string; Icon: React.FC<{ size?: number }> }> = {
  note:    { label: 'NOTE',    border: '#1F4FD4', bg: 'bg-ois-primary-pale', iconCls: 'text-ois-primary', Icon: Info },
  warning: { label: 'WARNING', border: '#F79009', bg: 'bg-ois-warning-pale', iconCls: 'text-ois-warning', Icon: AlertTriangle },
  danger:  { label: 'DANGER',  border: '#F04438', bg: 'bg-ois-danger-pale',  iconCls: 'text-ois-danger',  Icon: ShieldAlert },
  tip:     { label: 'TIP',     border: '#12B76A', bg: 'bg-ois-success-pale', iconCls: 'text-ois-success', Icon: Lightbulb },
};

function detectCalloutType(firstLine: string): CalloutType {
  if (/^\*\*(Warning|Caution)/i.test(firstLine)) return 'warning';
  if (/^\*\*(Danger|Critical|Do NOT)/i.test(firstLine)) return 'danger';
  if (/^\*\*(Tip|Recommended)/i.test(firstLine)) return 'tip';
  return 'note';
}

function renderMarkdown(body: string, refHref: (ref: string) => string): React.ReactNode[] {
  const lines = body.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let listBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="my-4 space-y-2 pl-0">
        {listBuffer.map((item, j) => (
          <li key={j} className="flex items-start gap-3">
            <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-ois-primary shrink-0" />
            <span className="text-[15px] leading-[1.8] text-ois-text-muted">{renderInline(item, refHref)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      flushList();
      const lang = fenceMatch[1];
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(<CodeBlock key={`code-${nodes.length}`} lang={lang} code={codeLines.join('\n')} />);
      i++;
      continue;
    }

    // ── Heading
    const headingMatch = line.match(/^(#{1,4})\s+(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      const text  = headingMatch[2];
      const id    = slugify(text);
      const cls =
        level === 1 ? 'text-2xl font-extrabold text-ois-text mt-10 mb-4 scroll-mt-20' :
        level === 2 ? 'text-[19px] font-bold text-ois-text mt-10 mb-4 scroll-mt-20 border-b border-ois-border pb-3' :
        level === 3 ? 'text-[16px] font-semibold text-ois-text mt-7 mb-3 scroll-mt-20 border-l-4 border-ois-primary pl-3' :
                      'text-[13px] font-bold uppercase tracking-widest text-ois-text-subtle mt-5 mb-2 scroll-mt-20';
      const Tag = (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4');
      nodes.push(
        <Tag key={`h-${nodes.length}`} id={id} className={cls}>
          {renderInline(text, refHref)}
        </Tag>
      );
      i++;
      continue;
    }

    // ── Blockquote (callout)
    if (line.startsWith('> ')) {
      flushList();
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      const calloutType = detectCalloutType(quoteLines[0] ?? '');
      const cm = CALLOUT_META[calloutType];
      const CalloutIcon = cm.Icon;
      nodes.push(
        <div
          key={`bq-${nodes.length}`}
          className={cn('border-l-4 rounded-r-lg px-4 py-3.5 my-5', cm.bg)}
          style={{ borderLeftColor: cm.border }}
        >
          <div className={cn('flex items-center gap-1.5 mb-1.5', cm.iconCls)}>
            <CalloutIcon size={13} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{cm.label}</span>
          </div>
          <div className="space-y-1">
            {quoteLines.map((ql, j) => (
              <p key={j} className="text-[13.5px] leading-relaxed text-ois-text">{renderInline(ql, refHref)}</p>
            ))}
          </div>
        </div>
      );
      continue;
    }

    // ── List item
    if (line.match(/^[-*]\s+/)) {
      listBuffer.push(line.replace(/^[-*]\s+/, ''));
      i++;
      continue;
    }

    // ── Ordered list
    if (line.match(/^\d+\.\s+/)) {
      flushList();
      const orderedItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        orderedItems.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="my-4 pl-0">
          {orderedItems.map((item, j) => (
            <li key={j} className="relative flex items-start gap-4 pb-5">
              {j < orderedItems.length - 1 && (
                <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-ois-border" />
              )}
              <span className="w-6 h-6 rounded-full bg-ois-primary text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 z-10">
                {j + 1}
              </span>
              <span className="text-[15px] leading-[1.8] text-ois-text-muted flex-1 pt-0.5">
                {renderInline(item, refHref)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Horizontal rule
    if (line.match(/^---+$/)) {
      flushList();
      nodes.push(
        <div key={`hr-${nodes.length}`} className="my-8 flex items-center gap-4">
          <div className="flex-1 h-px bg-ois-border" />
          <span className="text-ois-text-subtle text-xs">·</span>
          <div className="flex-1 h-px bg-ois-border" />
        </div>
      );
      i++;
      continue;
    }

    // ── Table
    if (line.startsWith('|')) {
      flushList();
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const parseRow = (row: string) =>
        row.split('|').slice(1, -1).map(cell => cell.trim());
      const headers = parseRow(tableLines[0] ?? '');
      const dataRows = tableLines.slice(2).map(parseRow);
      nodes.push(
        <div key={`tbl-${nodes.length}`} className="overflow-x-auto my-6 rounded-lg border border-ois-border">
          <table className="w-full text-[13.5px] border-collapse">
            <thead>
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="bg-ois-surface-muted text-ois-text-subtle font-semibold uppercase text-[10px] tracking-widest px-4 py-2.5 text-left border-b border-ois-border whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ois-border">
              {dataRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 1 ? 'bg-ois-surface-muted/40' : ''}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-ois-text">
                      {renderInline(cell, refHref)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // ── Blank line
    if (line.trim() === '') {
      flushList();
      i++;
      continue;
    }

    // ── Paragraph
    flushList();
    nodes.push(
      <p key={`p-${nodes.length}`} className="text-[15px] text-ois-text-muted leading-[1.8] my-4">
        {renderInline(line, refHref)}
      </p>
    );
    i++;
  }
  flushList();
  return nodes;
}

// ── Unhelpful feedback modal ──────────────────────────────────────────────────

const UnhelpfulModal: React.FC<{
  onSubmit: (comment: string) => void;
  onClose: () => void;
  articleSlug: string;
}> = ({ onSubmit, onClose, articleSlug }) => {
  const navigate = useNavigate();
  const [comment, setComment] = useState('');
  return (
    <Modal isOpen onClose={onClose} title="What could be improved?" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-ois-text-muted">
          Your feedback helps us keep articles accurate. Comment is optional.
        </p>
        <textarea
          rows={4}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="e.g. Step 3 didn't work in our environment…"
          className="w-full rounded-lg border border-ois-border-strong px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary"
        />
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => navigate(`/kb/editor/${articleSlug}?source=feedback`)}
            className="text-xs text-ois-primary hover:underline flex items-center gap-1"
          >
            <Edit3 size={11} /> Suggest an edit
          </button>
          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-lg border border-ois-border-strong text-xs font-semibold text-ois-text hover:bg-ois-surface-muted transition-colors">
              Cancel
            </button>
            <button onClick={() => onSubmit(comment)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ois-primary text-white text-xs font-semibold hover:bg-ois-primary-hover transition-colors">
              <Send size={12} /> Submit
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ── Table of contents ─────────────────────────────────────────────────────────

const TableOfContents: React.FC<{ entries: TocEntry[]; activeId: string }> = ({ entries, activeId }) => {
  if (!entries.length) return null;
  return (
    <div className="space-y-0.5">
      {entries.map(entry => (
        <a
          key={entry.id}
          href={`#${entry.id}`}
          onClick={e => {
            e.preventDefault();
            document.getElementById(entry.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className={cn(
            'block text-[11px] leading-snug py-1 transition-colors',
            entry.level === 2 ? 'pl-0' : entry.level === 3 ? 'pl-3' : 'pl-5',
            activeId === entry.id
              ? 'text-ois-primary font-semibold'
              : 'text-ois-text-subtle hover:text-ois-primary',
          )}
        >
          {entry.text}
        </a>
      ))}
    </div>
  );
};

// ── Side card ─────────────────────────────────────────────────────────────────

const SideCard: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
  <div className={cn('border border-ois-border rounded-lg bg-ois-surface overflow-hidden', className)}>
    <div className="px-3 py-2.5 border-b border-ois-border bg-ois-surface-muted">
      <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">{title}</p>
    </div>
    <div className="p-3">{children}</div>
  </div>
);

// ── Status banner ─────────────────────────────────────────────────────────────

const StatusBanner: React.FC<{ status: KBStatus; relatedSlug?: string }> = ({ status, relatedSlug }) => {
  if (status === 'published') return null;
  const isArchived = status === 'archived';
  const isDraft    = status === 'draft';
  const isReview   = status === 'in_review';
  return (
    <div className={cn(
      'flex items-start gap-3 px-5 py-3.5 rounded-lg border mb-6 text-sm',
      isArchived ? 'bg-ois-warning-pale border-ois-warning/30 text-ois-warning' :
      isDraft    ? 'bg-ois-surface-muted border-ois-border text-ois-text-muted' :
      isReview   ? 'bg-ois-info-pale border-ois-info/20 text-ois-info' :
      'bg-ois-danger-pale border-ois-danger/20 text-ois-danger',
    )}>
      <AlertTriangle size={16} className="shrink-0 mt-0.5" />
      <div>
        {isArchived && (
          <><span className="font-bold">ARCHIVED</span> — This article is no longer current.{relatedSlug && <> See <Link to={`/kb/${relatedSlug}`} className="underline font-semibold">{relatedSlug}</Link> for the current version.</>}</>
        )}
        {isDraft && (
          <><span className="font-bold">DRAFT</span> — This article has not been published yet. Visible to authors and reviewers only.</>
        )}
        {isReview && (
          <><span className="font-bold">IN REVIEW</span> — This article is being reviewed for accuracy. Content may change.</>
        )}
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const ArticleView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: articleData } = useResource(() => knowledgeService.article(slug!).catch(async () => {
    try {
      const list = await knowledgeService.articles({ q: slug });
      return list.find(a => a.slug === slug) ?? list[0] ?? null;
    } catch {
      return null;
    }
  }) as any, [slug]);
  const article = (articleData as unknown as KBArticle) ?? null;
  const { data: articlesData } = useResource(() => knowledgeService.articles(), []);
  const { data: categoriesData } = useResource(() => knowledgeService.categories(), []);
  const allArticles = articlesData ?? [];
  const categories = categoriesData ?? [];

  const articleByPublicId = useMemo<ArticleLookup>(
    () => (id: string) => allArticles.find(a => a.publicId === id),
    [allArticles]
  );
  const refHref = useMemo(() => makeRefHref(articleByPublicId), [articleByPublicId]);

  const [helpful,       setHelpful]       = useState<boolean | null>(null);
  const [helpfulCount,  setHelpfulCount]  = useState(article?.helpfulCount ?? 0);
  const [unhelpfulCount, setUnhelpfulCount] = useState(article?.unhelpfulCount ?? 0);
  const [showUnhelpful, setShowUnhelpful] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [toast,         setToast]         = useState('');
  const [activeId,      setActiveId]      = useState('');
  const [copied,        setCopied]        = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  const toc     = useMemo(() => article ? extractToc(article.body) : [], [article]);
  const related = useMemo(() => {
    if (!article) return [];
    const slugs = article.relatedArticleSlugs;
    return slugs.map(s => allArticles.find(a => a.slug === s)).filter(Boolean) as KBArticle[];
  }, [article, allArticles]);

  const category = useMemo(() =>
    article ? categories.find(c => c.id === article.categoryId) : null,
  [article, categories]);

  // Scroll-spy via IntersectionObserver
  useEffect(() => {
    if (!toc.length) return;
    const obs = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
    );
    toc.forEach(e => { const el = document.getElementById(e.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [toc]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleHelpful = async (val: boolean) => {
    if (helpful !== null || savingFeedback) return;
    if (!article) return;
    setSavingFeedback(true);
    try {
      await knowledgeService.submitFeedback(article.publicId, val);
      setHelpful(val);
      if (val) {
        setHelpfulCount(n => n + 1);
        setToast('Thanks for your feedback!');
      } else {
        setUnhelpfulCount(n => n + 1);
        setShowUnhelpful(true);
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleUnhelpfulSubmit = (_comment: string) => {
    setShowUnhelpful(false);
    setToast('Thanks! Your feedback helps us improve.');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    setToast('Link copied to clipboard.');
  };

  // Must be declared before any early return so hook order stays stable.
  const rendered    = useMemo(
    () => article ? renderMarkdown(article.body, refHref) : null,
    [article, refHref],
  );

  if (!article) {
    if (!articlesData) return <div className="p-6 text-sm text-ois-text-muted">Loading…</div>;
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <BookOpen size={32} className="text-ois-text-subtle mb-3" />
        <h2 className="text-lg font-bold text-ois-text mb-1">Article not found</h2>
        <Link to="/kb" className="text-sm text-ois-primary hover:underline flex items-center gap-1 mt-1">
          <ArrowLeft size={14} /> Back to Knowledge Base
        </Link>
      </div>
    );
  }

  const ctMeta      = CONTENT_TYPE_META[article.contentType];
  const totalVotes  = helpfulCount + unhelpfulCount;
  const helpfulPct  = totalVotes > 0 ? Math.round((helpfulCount / totalVotes) * 100) : null;

  return (
    <div className="-m-6 flex flex-col bg-ois-bg" style={{ height: 'calc(100vh - 3.5rem)' }}>

      {/* ─── Top header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-ois-border shrink-0 z-30">

        {/* Nav row */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-ois-border">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate('/kb')}
              className="flex items-center gap-1.5 text-sm text-ois-text-muted hover:text-ois-text transition-colors shrink-0"
            >
              <ArrowLeft size={15} /> Knowledge Base
            </button>
            {category && (
              <>
                <span className="text-ois-border-strong shrink-0">/</span>
                <span className="text-sm text-ois-text-muted shrink-0 truncate max-w-[160px]">{category.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Can module="knowledge" action="author">
              <button
                onClick={() => navigate(`/kb/editor/${article.slug}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ois-border text-xs font-semibold text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text transition-colors"
              >
                <Edit3 size={13} /> Edit
              </button>
            </Can>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ois-border text-xs font-semibold text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text transition-colors"
            >
              {copied ? <><Check size={13} className="text-ois-success" /> Copied</> : <><Share2 size={13} /> Share</>}
            </button>
            <button className="p-1.5 rounded-lg border border-ois-border text-ois-text-muted hover:bg-ois-surface-muted transition-colors">
              <MoreHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* Article header — content-type stripe + metadata */}
        <div className="flex items-start gap-0">
          <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: ctMeta.stripe }} />
          <div className="flex-1 px-6 py-4">
            {/* Content type + status badges */}
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full', ctMeta.bg, ctMeta.color)}>
                <BookMarked size={9} /> {ctMeta.label}
              </span>
              {article.status !== 'published' && (
                <span className={cn(
                  'inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  article.status === 'archived'  ? 'bg-ois-warning-pale text-ois-warning' :
                  article.status === 'draft'      ? 'bg-ois-surface-muted text-ois-text-muted border border-ois-border' :
                  article.status === 'in_review'  ? 'bg-ois-info-pale text-ois-info' :
                  'bg-ois-danger-pale text-ois-danger'
                )}>
                  {article.status.replace('_', ' ').toUpperCase()}
                </span>
              )}
            </div>
            {/* ID + title */}
            <p className="font-mono text-xs text-ois-text-subtle mb-1">{article.publicId}</p>
            <h1 className="text-xl font-bold text-ois-text leading-tight">{article.title}</h1>
            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2">
                {article.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 text-[11px] font-medium text-ois-text-subtle bg-ois-surface-muted border border-ois-border px-2 py-0.5 rounded-full">
                    <Tag size={9} />{tag}
                  </span>
                ))}
              </div>
            )}
            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2.5 text-xs text-ois-text-subtle flex-wrap">
              <span>By <span className="font-medium text-ois-text">{article.authorName}</span></span>
              <span>· Updated {formatDate(article.updatedAt, 'MMM d, yyyy')}</span>
              {article.averageReadTimeSeconds > 0 && (
                <span className="flex items-center gap-1">
                  · <Clock size={11} /> {Math.ceil(article.averageReadTimeSeconds / 60)} min read
                </span>
              )}
              {article.viewCount > 0 && (
                <span className="flex items-center gap-1">
                  · <Eye size={11} /> {article.viewCount.toLocaleString()} views
                </span>
              )}
              {article.version > 1 && <span>· v{article.version}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Body: two independent-scroll columns ─────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Main article content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-[740px] mx-auto">
            <StatusBanner status={article.status} />
            <div ref={articleRef}>
              {rendered}
            </div>
          </div>
        </div>

        {/* ── Right rail ────────────────────────────────────────────────── */}
        <aside className="w-[240px] shrink-0 border-l border-ois-border overflow-y-auto py-5 px-4 space-y-4 bg-white">

          {/* Was this helpful? */}
          <SideCard title="Was this helpful?">
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handleHelpful(true)}
                  disabled={helpful !== null || savingFeedback}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-all',
                    helpful === true
                      ? 'bg-ois-success border-ois-success text-white'
                      : helpful !== null
                      ? 'opacity-40 cursor-not-allowed border-ois-border text-ois-text-muted'
                      : 'border-ois-border text-ois-text-muted hover:border-ois-success hover:text-ois-success hover:bg-ois-success-pale',
                  )}
                >
                  <ThumbsUp size={13} /> Yes
                </button>
                <button
                  onClick={() => handleHelpful(false)}
                  disabled={helpful !== null || savingFeedback}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-semibold transition-all',
                    helpful === false
                      ? 'bg-ois-danger border-ois-danger text-white'
                      : helpful !== null
                      ? 'opacity-40 cursor-not-allowed border-ois-border text-ois-text-muted'
                      : 'border-ois-border text-ois-text-muted hover:border-ois-danger hover:text-ois-danger hover:bg-ois-danger-pale',
                  )}
                >
                  <ThumbsDown size={13} /> No
                </button>
              </div>
              {helpful !== null && (
                <p className="text-xs text-ois-success text-center font-medium">Thanks for your feedback!</p>
              )}
              {helpfulPct !== null && totalVotes >= 3 && (
                <p className="text-[11px] text-ois-text-muted text-center">
                  <span className="font-semibold text-ois-text">{helpfulPct}%</span> found this helpful
                  <br /><span className="text-ois-text-subtle">({helpfulCount} of {totalVotes} votes)</span>
                </p>
              )}
            </div>
          </SideCard>

          {/* Table of contents */}
          {toc.length > 0 && (
            <SideCard title="Table of contents">
              <TableOfContents entries={toc} activeId={activeId} />
            </SideCard>
          )}

          {/* Related articles */}
          {related.length > 0 && (
            <SideCard title="Related articles">
              <div className="space-y-2">
                {related.map(rel => (
                  <Link
                    key={rel.id}
                    to={`/kb/${rel.slug}`}
                    className="flex items-start gap-2 py-1 group"
                  >
                    <BookOpen size={12} className="text-ois-success shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-ois-text group-hover:text-ois-primary transition-colors leading-snug">{rel.title}</div>
                      <div className="font-mono text-[10px] text-ois-text-subtle">{rel.publicId}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </SideCard>
          )}

          {/* References */}
          {(article.relatedCIPublicIds.length > 0 || article.linkedProblemIds.length > 0 || article.linkedIncidentIds.length > 0) && (
            <SideCard title="References">
              <div className="space-y-2">
                {article.relatedCIPublicIds.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-1">Linked CIs</p>
                    {article.relatedCIPublicIds.map(ci => (
                      <Link key={ci} to={`/cmdb`} className="flex items-center gap-1.5 text-[11px] text-ois-primary hover:underline py-0.5">
                        <Server size={10} className="shrink-0" /> {ci}
                      </Link>
                    ))}
                  </div>
                )}
                {article.linkedProblemIds.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-1">Linked problems</p>
                    {article.linkedProblemIds.map(pid => (
                      <Link key={pid} to={`/problems`} className="flex items-center gap-1.5 text-[11px] text-ois-primary hover:underline font-mono py-0.5">
                        <AlertCircle size={10} className="shrink-0" /> {pid.replace('prb-', 'PRB-').toUpperCase()}
                      </Link>
                    ))}
                  </div>
                )}
                {article.linkedIncidentIds.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-1">Linked incidents</p>
                    {article.linkedIncidentIds.map(iid => (
                      <Link key={iid} to={`/incidents`} className="flex items-center gap-1.5 text-[11px] text-ois-primary hover:underline font-mono py-0.5">
                        <AlertTriangle size={10} className="shrink-0" /> {iid}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </SideCard>
          )}

          {/* Article details */}
          <SideCard title="Article details">
            <dl className="space-y-2 text-[11px]">
              {[
                { label: 'Author',  val: article.authorName },
                { label: 'Created', val: article.createdAt ? formatDate(article.createdAt, 'MMM d, yyyy') : '—' },
                { label: 'Updated', val: article.updatedAt ? formatDate(article.updatedAt, 'MMM d, yyyy') : '—' },
                { label: 'Version', val: `v${article.version}${article.previousVersions ? ` (+${article.previousVersions} prev)` : ''}` },
                { label: 'Status',  val: article.status.charAt(0).toUpperCase() + article.status.slice(1).replace('_', ' ') },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-start gap-2">
                  <dt className="text-ois-text-subtle w-14 shrink-0">{label}</dt>
                  <dd className="text-ois-text font-medium flex-1">{val}</dd>
                </div>
              ))}
            </dl>
          </SideCard>
        </aside>
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-ois-text text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-ois-modal animate-in slide-in-from-bottom-3 duration-200">
          <Check size={13} className="text-ois-success" /> {toast}
        </div>
      )}

      {/* ── Unhelpful modal ────────────────────────────────────────────── */}
      {showUnhelpful && (
        <UnhelpfulModal
          articleSlug={article.slug}
          onClose={() => setShowUnhelpful(false)}
          onSubmit={handleUnhelpfulSubmit}
        />
      )}
    </div>
  );
};
