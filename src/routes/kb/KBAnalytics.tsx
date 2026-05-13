import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Clock, Download, Eye, ThumbsUp, Users, ArrowRight } from 'lucide-react';
import { knowledgeService, useResource } from '@/src/services';
import { cn } from '@/src/lib/utils';
import type { KBArticle } from '@/src/types/knowledge';

// ── helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-05-09T10:00:00Z');

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - NOW.getTime()) / 86_400_000);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtViews(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// Per-article helpful stats derived from feedback mock
type FeedbackItem = { articleId: string; isHelpful: boolean };
function useArticleHelpfulness(feedback: FeedbackItem[]) {
  return useMemo(() => {
    const map: Record<string, { helpful: number; total: number }> = {};
    for (const fb of feedback) {
      if (!map[fb.articleId]) map[fb.articleId] = { helpful: 0, total: 0 };
      map[fb.articleId].total++;
      if (fb.isHelpful) map[fb.articleId].helpful++;
    }
    return map;
  }, [feedback]);
}

// Synthetic view trends (compare first/last 15 days of the 30-day window)
function viewTrendFrom(series: { views: number }[]): { pct: number; dir: 'up' | 'down' | 'flat' } {
  const half = Math.floor(series.length / 2);
  const prev = series.slice(0, half).reduce((s, d) => s + d.views, 0);
  const curr = series.slice(half).reduce((s, d) => s + d.views, 0);
  const pct = prev === 0 ? 0 : Math.round(((curr - prev) / prev) * 100);
  return { pct, dir: pct > 2 ? 'up' : pct < -2 ? 'down' : 'flat' };
}

// ── sub-components ───────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  dir: 'up' | 'down' | 'flat';
  good?: boolean; // up is good (default true)
}

function KpiCard({ icon, label, value, delta, dir, good = true }: KpiCardProps) {
  const isPositive = dir === 'flat' ? null : (dir === 'up') === good;
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="p-2 rounded-lg bg-gray-50 text-gray-400">{icon}</span>
      </div>
      <div className="text-3xl font-semibold text-gray-900 tabular-nums">{value}</div>
      <div className={cn(
        'flex items-center gap-1 text-xs font-medium',
        isPositive === null ? 'text-gray-400' : isPositive ? 'text-emerald-600' : 'text-red-500'
      )}>
        {dir === 'up' ? <TrendingUp className="w-3.5 h-3.5" /> :
         dir === 'down' ? <TrendingDown className="w-3.5 h-3.5" /> :
         <Minus className="w-3.5 h-3.5" />}
        {delta}
      </div>
    </div>
  );
}

// ── Views over time SVG chart ────────────────────────────────────────────────

function ViewsChart({ series }: { series: { date: string; views: number }[] }) {
  const W = 760, H = 140, PAD = { t: 12, r: 16, b: 28, l: 40 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const maxV = Math.max(...series.map(d => d.views));
  const minV = Math.min(...series.map(d => d.views));
  const range = maxV - minV || 1;

  const x = (i: number) => PAD.l + (i / (series.length - 1)) * innerW;
  const y = (v: number) => PAD.t + innerH - ((v - minV) / range) * innerH;

  const pathD = series
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.views).toFixed(1)}`)
    .join(' ');

  const areaD = pathD + ` L ${x(series.length - 1).toFixed(1)} ${(PAD.t + innerH).toFixed(1)} L ${PAD.l} ${(PAD.t + innerH).toFixed(1)} Z`;

  // label every ~7 days
  const labelIdxs = [0, 7, 14, 21, 28, series.length - 1].filter(i => i < series.length);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1F4FD4" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#1F4FD4" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grid lines */}
      {[0, 0.5, 1].map((t) => {
        const yg = PAD.t + innerH * (1 - t);
        const val = Math.round(minV + range * t);
        return (
          <g key={t}>
            <line x1={PAD.l} y1={yg} x2={W - PAD.r} y2={yg} stroke="#E5E7EB" strokeWidth="1" />
            <text x={PAD.l - 6} y={yg + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">{val}</text>
          </g>
        );
      })}

      {/* area fill */}
      <path d={areaD} fill="url(#chart-fill)" />

      {/* line */}
      <path d={pathD} fill="none" stroke="#1F4FD4" strokeWidth="2" strokeLinejoin="round" />

      {/* dots on peak days */}
      {series.map((d, i) => {
        if (d.views < maxV * 0.9 && !labelIdxs.includes(i)) return null;
        return (
          <circle key={i} cx={x(i)} cy={y(d.views)} r="3" fill="#1F4FD4" />
        );
      })}

      {/* x-axis labels */}
      {labelIdxs.map(i => (
        <text key={i} x={x(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#9CA3AF">
          {new Date(series[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </text>
      ))}
    </svg>
  );
}

// ── Trend indicator ──────────────────────────────────────────────────────────

function TrendBadge({ pct, isNew }: { pct?: number; isNew?: boolean }) {
  if (isNew) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
      <TrendingUp className="w-3 h-3" /> NEW
    </span>
  );
  if (pct === undefined || pct === 0) return <Minus className="w-3.5 h-3.5 text-gray-300" />;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', pct > 0 ? 'text-emerald-600' : 'text-red-500')}>
      {pct > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function KBAnalytics() {
  const { data: analyticsData } = useResource(() => knowledgeService.analytics(), []);
  const { data: articlesData } = useResource(() => knowledgeService.articles(), []);
  const { data: feedbackData } = useResource(() => knowledgeService.feedback(), []);

  const kbAnalytics = analyticsData ?? {
    totalViews: 0, totalSearches: 0, helpfulRate: 0,
    viewsTimeSeries: [] as { date: string; views: number }[],
    topViewed: [] as string[], topHelpful: [] as string[],
    needsReview: [] as string[],
    contentGaps: [] as { searchTerm: string; count: number; suggestedAction: string; linkedItemId?: string }[],
    topSearches: [] as { term: string; count: number; hasMatchingArticle: boolean; matchingArticleSlug?: string }[],
  };
  const mockKBArticles = articlesData ?? [];
  const mockKBFeedback = (feedbackData ?? []) as FeedbackItem[];

  const getArticleBySlug = (slug: string): KBArticle | undefined =>
    mockKBArticles.find(a => a.slug === slug);

  const helpMap = useArticleHelpfulness(mockKBFeedback);
  const viewTrend = viewTrendFrom(kbAnalytics.viewsTimeSeries);

  // Resolve topViewed slugs → articles with synthetic view counts from mock
  const topViewed = useMemo(() => {
    return kbAnalytics.topViewed.map(slug => {
      const a = getArticleBySlug(slug);
      return a ?? null;
    }).filter(Boolean) as KBArticle[];
  }, [kbAnalytics.topViewed, mockKBArticles]);

  // Resolve topHelpful slugs → articles + stats
  const topHelpful = useMemo(() => {
    return kbAnalytics.topHelpful.map(slug => {
      const a = getArticleBySlug(slug);
      if (!a) return null;
      const stats = helpMap[a.id] ?? { helpful: 0, total: 0 };
      return { article: a, ...stats };
    }).filter(Boolean) as Array<{ article: KBArticle; helpful: number; total: number }>;
  }, [kbAnalytics.topHelpful, mockKBArticles, helpMap]);

  // Resolve needsReview slugs
  const reviewItems = useMemo(() => {
    return kbAnalytics.needsReview.map(slug => {
      const a = getArticleBySlug(slug);
      if (!a || !a.reviewDueAt) return null;
      return { article: a, days: daysUntil(a.reviewDueAt) };
    }).filter(Boolean) as Array<{ article: KBArticle; days: number }>;
  }, [kbAnalytics.needsReview, mockKBArticles]);

  // Also pull all published articles that have reviewDueAt and aren't already in needsReview
  const allReviewItems = useMemo(() => {
    const inList = new Set(kbAnalytics.needsReview);
    const extras = mockKBArticles
      .filter(a => a.reviewDueAt && !inList.has(a.slug) && a.status === 'published')
      .sort((a, b) => new Date(a.reviewDueAt!).getTime() - new Date(b.reviewDueAt!).getTime())
      .slice(0, 3)
      .map(a => ({ article: a, days: daysUntil(a.reviewDueAt!) }));
    return [...reviewItems, ...extras].sort((a, b) => a.days - b.days);
  }, [reviewItems, mockKBArticles, kbAnalytics.needsReview]);

  // Synthetic view trends: assign fixed deltas per article for demo purposes
  const viewDeltas: Record<string, number | 'new'> = {
    'troubleshooting-payment-api-5xx-errors': 28,
    'ssh-access-via-bastion': 0,
    'payment-api-restart-procedure': 12,
    'pci-dss-data-handling': -5,
    'oncall-handover-checklist': 8,
    'db-read-access-best-practices': 44,
    'ois-platform-overview': 0,
    'troubleshooting-slack-notifications': 0,
    'laptop-onboarding': 0,
    'es-cluster-yellow-recovery': 'new',
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            Last 30d <span className="text-gray-400">▾</span>
          </button>
          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-4 gap-4">
          <KpiCard
            icon={<Eye className="w-4 h-4" />}
            label="Total views"
            value={kbAnalytics.totalViews.toLocaleString()}
            delta={`+${viewTrend.pct}% prev 30d`}
            dir={viewTrend.dir}
          />
          <KpiCard
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" /></svg>}
            label="Searches"
            value={kbAnalytics.totalSearches.toLocaleString()}
            delta="+12% prev 30d"
            dir="up"
          />
          <KpiCard
            icon={<ThumbsUp className="w-4 h-4" />}
            label="Helpful rate"
            value={`${Math.round(kbAnalytics.helpfulRate * 100)}%`}
            delta="↔ same as prev 30d"
            dir="flat"
          />
          <KpiCard
            icon={<Users className="w-4 h-4" />}
            label="Active authors"
            value="6"
            delta="+1 prev 30d"
            dir="up"
          />
        </div>

        {/* ── Hero: Content gaps ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <h2 className="text-base font-semibold text-amber-900">
              {kbAnalytics.contentGaps.length} content gaps detected
            </h2>
            <span className="text-sm text-amber-700 ml-1">Top searches without matching articles:</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {kbAnalytics.contentGaps.map(gap => (
              <div
                key={gap.searchTerm}
                className="bg-white border border-amber-200 rounded-lg p-4 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-sm font-semibold text-gray-800">
                    &ldquo;{gap.searchTerm}&rdquo;
                  </span>
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {gap.count} searches
                  </span>
                </div>
                <p className="text-xs text-gray-600">{gap.suggestedAction}</p>
                {gap.linkedItemId && (
                  <p className="text-xs text-gray-400">
                    Linked: <span className="font-mono text-gray-500">{gap.linkedItemId}</span>
                  </p>
                )}
                <div className="flex justify-end mt-1">
                  <Link
                    to={`/kb/editor?title=${encodeURIComponent(gap.searchTerm)}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1F4FD4] hover:underline"
                  >
                    Create article <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-start">
            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-800 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors">
              + Bulk create suggested articles
            </button>
          </div>
        </div>

        {/* ── Views over time ── */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Views over time (last 30 days)</h2>
          <ViewsChart series={kbAnalytics.viewsTimeSeries} />
        </div>

        {/* ── Two-column: Top viewed + Most helpful ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Top viewed */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Top viewed (last 30d)</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 w-8">#</th>
                  <th className="px-2 py-2.5 text-left text-xs font-medium text-gray-400">Article</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">Views</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">Trend</th>
                </tr>
              </thead>
              <tbody>
                {topViewed.map((art, i) => {
                  const delta = viewDeltas[art.slug];
                  return (
                    <tr key={art.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                      <td className="px-2 py-3">
                        <Link
                          to={`/kb/${art.slug}`}
                          className="text-sm text-gray-800 hover:text-[#1F4FD4] hover:underline line-clamp-1"
                        >
                          {art.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right text-sm font-medium text-gray-700 tabular-nums">
                        {fmtViews(art.viewCount)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {delta === 'new'
                          ? <TrendBadge isNew />
                          : <TrendBadge pct={delta as number} />
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Most helpful */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Most helpful <span className="text-gray-400 font-normal">(min 5 votes)</span></h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Article</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">Helpful</th>
                  <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {topHelpful
                  .filter(r => r.total >= 5)
                  .map(r => {
                    const pct = r.total > 0 ? Math.round((r.helpful / r.total) * 100) : 0;
                    return (
                      <tr key={r.article.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <Link
                            to={`/kb/${r.article.slug}`}
                            className="text-sm text-gray-800 hover:text-[#1F4FD4] hover:underline line-clamp-1"
                          >
                            {r.article.title}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={cn(
                            'text-sm font-semibold tabular-nums',
                            pct >= 95 ? 'text-emerald-600' : pct >= 80 ? 'text-amber-600' : 'text-red-500'
                          )}>
                            {pct}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-sm text-gray-500 tabular-nums">{r.total}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Top search terms ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Top search terms</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Term</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">Searches</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400 pl-8">Has matching article?</th>
              </tr>
            </thead>
            <tbody>
              {kbAnalytics.topSearches.map(s => {
                const isGap = !s.hasMatchingArticle;
                const matchingArt = s.matchingArticleSlug ? getArticleBySlug(s.matchingArticleSlug) : null;
                return (
                  <tr
                    key={s.term}
                    className={cn(
                      'border-b border-gray-50 last:border-0 transition-colors',
                      isGap ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'
                    )}
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm text-gray-800">{s.term}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-medium text-gray-700 tabular-nums">{s.count}</td>
                    <td className="px-5 py-3 pl-8">
                      {isGap ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          No — CONTENT GAP
                          <Link
                            to={`/kb/editor?title=${encodeURIComponent(s.term)}`}
                            className="ml-2 text-[#1F4FD4] hover:underline"
                          >
                            Create →
                          </Link>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Yes
                          {matchingArt && (
                            <Link
                              to={`/kb/${matchingArt.slug}`}
                              className="ml-1 font-mono text-gray-500 hover:text-[#1F4FD4] hover:underline"
                            >
                              {matchingArt.publicId}
                            </Link>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Articles needing review ── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Reviews overdue or upcoming</h2>
            <span className="text-xs text-gray-400">{allReviewItems.length} articles</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Article</th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-gray-400">Status</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400">Next review</th>
                <th className="px-5 py-2.5 text-right text-xs font-medium text-gray-400"></th>
              </tr>
            </thead>
            <tbody>
              {allReviewItems.map(({ article, days }) => {
                const isOverdue = days <= 0;
                const isDueSoon = days > 0 && days <= 14;
                return (
                  <tr key={article.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        to={`/kb/${article.slug}`}
                        className="text-sm text-gray-800 hover:text-[#1F4FD4] hover:underline"
                      >
                        {article.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                          <Clock className="w-3.5 h-3.5" /> Overdue
                        </span>
                      ) : isDueSoon ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                          <Clock className="w-3.5 h-3.5" /> Due in {days}d
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" /> Upcoming
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right text-sm text-gray-500">
                      {article.reviewDueAt ? fmtDate(article.reviewDueAt) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/kb/editor/${article.slug}`}
                        className="text-xs font-medium text-[#1F4FD4] hover:underline"
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
