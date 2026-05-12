import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Share2, MoreHorizontal, ThumbsUp, ThumbsDown,
  BookOpen, Eye, Clock, Tag, AlertTriangle, FileWarning,
  ChevronRight, Copy, Check, X, ExternalLink, Send,
  Server, AlertCircle, BookMarked,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatDate, formatRelative } from '@/src/lib/format';
import { getArticleBySlug, getRelatedArticles, mockKBArticles } from '@/src/mocks/kbArticles';
import { mockKBCategories } from '@/src/mocks/kbCategories';
import { Modal } from '@/src/components/ui/Modal';
import { KBArticle, KBContentType, KBStatus } from '@/src/types/knowledge';

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTENT_TYPE_META: Record<KBContentType, { label: string; color: string; bg: string }> = {
  how_to:              { label: 'How-To',       color: 'text-ois-primary',  bg: 'bg-ois-primary-pale' },
  troubleshooting:     { label: 'Troubleshoot', color: 'text-ois-warning',  bg: 'bg-ois-warning-pale' },
  runbook:             { label: 'Runbook',       color: 'text-ois-success',  bg: 'bg-ois-success-pale' },
  reference:           { label: 'Reference',     color: 'text-ois-info',     bg: 'bg-ois-info-pale' },
  faq:                 { label: 'FAQ',           color: 'text-purple-600',   bg: 'bg-purple-50' },
  incident_postmortem: { label: 'Postmortem',    color: 'text-ois-danger',   bg: 'bg-ois-danger-pale' },
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
function refHref(ref: string): string {
  if (ref.startsWith('KB-')) {
    const a = mockKBArticles.find(a => a.publicId === ref);
    return a ? `/kb/${a.slug}` : '/kb';
  }
  if (ref.startsWith('INC-')) return `/incidents`;
  if (ref.startsWith('PRB-')) return `/problems`;
  if (ref.startsWith('CHG-')) return `/changes`;
  if (ref.startsWith('CAT-')) return `/portal/catalog`;
  return '#';
}

function renderInline(text: string): React.ReactNode[] {
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
    <div className="relative group my-5 rounded-lg overflow-hidden border border-ois-border">
      {lang && (
        <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e2e] border-b border-white/10">
          <span className="text-[11px] font-mono text-white/50">{lang}</span>
          <button
            onClick={copy}
            className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80 transition-colors"
          >
            {copied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy</>}
          </button>
        </div>
      )}
      <pre className="bg-[#1e1e2e] text-[#cdd6f4] text-[12.5px] leading-relaxed px-5 py-4 overflow-x-auto font-mono m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
};

function renderMarkdown(body: string): React.ReactNode[] {
  const lines = body.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let listBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="my-3 space-y-1.5 pl-1">
        {listBuffer.map((item, j) => (
          <li key={j} className="flex items-start gap-2.5 text-[14.5px] text-ois-text-muted leading-relaxed">
            <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-ois-primary shrink-0" />
            <span>{renderInline(item)}</span>
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
        level === 1 ? 'text-2xl font-extrabold text-ois-text mt-8 mb-3 scroll-mt-20' :
        level === 2 ? 'text-[17px] font-bold text-ois-text mt-7 mb-2.5 scroll-mt-20 border-b border-ois-border pb-2' :
        level === 3 ? 'text-[15px] font-bold text-ois-text mt-5 mb-2 scroll-mt-20' :
                      'text-sm font-bold text-ois-text mt-4 mb-1.5 scroll-mt-20';
      const Tag = (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4');
      nodes.push(
        <Tag key={`h-${nodes.length}`} id={id} className={cls}>
          {renderInline(text)}
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
      const isNote    = quoteLines.some(l => l.startsWith('**Note') || l.startsWith('**When') || l.startsWith('**ARCHIVED') || l.startsWith('**DRAFT'));
      const isWarning = quoteLines.some(l => l.startsWith('**Note:') || l.includes('ARCHIVED') || l.includes('DRAFT'));
      nodes.push(
        <blockquote key={`bq-${nodes.length}`} className={cn(
          'my-4 pl-4 border-l-4 rounded-r-lg py-3 pr-4',
          isWarning ? 'border-ois-warning bg-ois-warning-pale' : 'border-ois-primary bg-ois-primary-pale',
        )}>
          {quoteLines.map((ql, j) => (
            <p key={j} className="text-sm text-ois-text leading-relaxed">{renderInline(ql)}</p>
          ))}
        </blockquote>
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
        <ol key={`ol-${nodes.length}`} className="my-3 space-y-1.5 pl-1">
          {orderedItems.map((item, j) => (
            <li key={j} className="flex items-start gap-2.5 text-[14.5px] text-ois-text-muted leading-relaxed">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-ois-primary-pale text-ois-primary text-[10px] font-bold flex items-center justify-center shrink-0">{j + 1}</span>
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // ── Horizontal rule
    if (line.match(/^---+$/)) {
      flushList();
      nodes.push(<hr key={`hr-${nodes.length}`} className="my-6 border-ois-border" />);
      i++;
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
      <p key={`p-${nodes.length}`} className="text-[14.5px] text-ois-text-muted leading-relaxed my-2">
        {renderInline(line)}
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

  const article = useMemo(() => getArticleBySlug(slug ?? ''), [slug]);

  const [helpful,       setHelpful]       = useState<boolean | null>(null);
  const [helpfulCount,  setHelpfulCount]  = useState(article?.helpfulCount ?? 0);
  const [unhelpfulCount, setUnhelpfulCount] = useState(article?.unhelpfulCount ?? 0);
  const [showUnhelpful, setShowUnhelpful] = useState(false);
  const [toast,         setToast]         = useState('');
  const [activeId,      setActiveId]      = useState('');
  const [copied,        setCopied]        = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  const toc     = useMemo(() => article ? extractToc(article.body) : [], [article]);
  const related = useMemo(() =>
    article ? getRelatedArticles(article.relatedArticleSlugs) : [],
  [article]);

  const category = useMemo(() =>
    article ? mockKBCategories.find(c => c.id === article.categoryId) : null,
  [article]);

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

  const handleHelpful = (val: boolean) => {
    if (helpful !== null) return;
    setHelpful(val);
    if (val) {
      setHelpfulCount(n => n + 1);
      setToast('Thanks for your feedback!');
    } else {
      setUnhelpfulCount(n => n + 1);
      setShowUnhelpful(true);
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

  if (!article) {
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
  const rendered    = useMemo(() => renderMarkdown(article.body), [article.body]);

  return (
    <div className="-mt-6 -mx-6 flex flex-col min-h-full">

      {/* ── STICKY TOP BAR ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 bg-ois-surface border-b border-ois-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/kb')}
            className="flex items-center gap-1.5 text-xs font-medium text-ois-text-muted hover:text-ois-primary transition-colors shrink-0"
          >
            <ArrowLeft size={14} /> KB
          </button>
          <span className="text-ois-border-strong shrink-0">/</span>
          {category && <span className="text-xs text-ois-text-muted shrink-0">{category.name}</span>}
          <span className="text-ois-border-strong shrink-0">/</span>
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', ctMeta.bg, ctMeta.color)}>
            {ctMeta.label}
          </span>
          <span className="font-mono text-[10px] text-ois-text-subtle shrink-0">{article.publicId}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => navigate(`/kb/editor/${article.slug}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ois-border text-xs font-semibold text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text transition-colors"
          >
            <Edit3 size={13} /> Edit
          </button>
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

      {/* ── BODY ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Article column */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-[720px] mx-auto">

            {/* Status banners */}
            <StatusBanner status={article.status} />

            {/* Title */}
            <h1 className="text-[28px] font-extrabold text-ois-text leading-tight mb-4 tracking-tight">
              {article.title}
            </h1>

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-3 text-xs text-ois-text-muted mb-3">
              <span>By <span className="font-semibold text-ois-text">{article.authorName}</span></span>
              <span>·</span>
              <span>Last updated {formatDate(article.updatedAt, 'MMM d, yyyy')}</span>
              {article.reviewedAt && (
                <>
                  <span>·</span>
                  <span>Reviewed {formatDate(article.reviewedAt, 'MMM d')}</span>
                </>
              )}
              {article.reviewDueAt && (
                <>
                  <span>·</span>
                  <span>Next review {formatDate(article.reviewDueAt, 'MMM d')}</span>
                </>
              )}
            </div>

            {/* Engagement row */}
            <div className="flex items-center gap-4 text-xs text-ois-text-subtle mb-3 flex-wrap">
              {article.viewCount > 0 && (
                <span className="flex items-center gap-1"><Eye size={12} /> {article.viewCount.toLocaleString()} views</span>
              )}
              {totalVotes > 0 && (
                <span className="flex items-center gap-1">
                  <ThumbsUp size={12} />
                  {helpfulCount} helpful · {unhelpfulCount} unhelpful
                </span>
              )}
              {article.averageReadTimeSeconds > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {Math.ceil(article.averageReadTimeSeconds / 60)} min read
                </span>
              )}
              {article.version > 1 && (
                <span>v{article.version}</span>
              )}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1.5 flex-wrap mb-6">
              {article.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-ois-surface-muted border border-ois-border text-ois-text-subtle">
                  {tag}
                </span>
              ))}
            </div>

            <hr className="border-ois-border mb-6" />

            {/* Rendered markdown body */}
            <div ref={articleRef} className="prose-sm max-w-none">
              {rendered}
            </div>

          </div>
        </div>

        {/* ── RIGHT RAIL ────────────────────────────────────────────────── */}
        <aside className="w-[240px] shrink-0 border-l border-ois-border overflow-y-auto py-5 px-4 space-y-4">

          {/* Was this helpful? */}
          <SideCard title="Was this helpful?">
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => handleHelpful(true)}
                  disabled={helpful !== null}
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
                  disabled={helpful !== null}
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
