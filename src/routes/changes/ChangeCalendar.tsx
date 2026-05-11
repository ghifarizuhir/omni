import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, LayoutGrid, List, Calendar, AlertTriangle, Clock, ChevronRight, CheckCircle2, Lock, Search,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';
import { mockChanges } from '../../mocks';
import { ChangeCalendar as CalendarView } from '../../components/changes/ChangeCalendar/ChangeCalendar';
import { ChangeBoard } from '../../components/changes/ChangeBoard/ChangeBoard';
import { ChangeRow } from '../../components/changes/ChangeRow';
import { ChangeStatusPill } from '../../components/changes/ChangeStatusPill';
import { ChangeTypeChip } from '../../components/changes/ChangeTypeChip';
import { RiskBadge } from '../../components/changes/RiskBadge';
import { formatDate } from '../../lib/format';
import { Change, ChangeStatus, RiskLevel } from '../../types/change';

type ViewMode = 'calendar' | 'board' | 'list';

// Today in our mock world
const TODAY = new Date('2026-05-09T00:00:00Z');
const WEEK_END = new Date('2026-05-15T23:59:59Z');

function getThisWeekChanges(changes: Change[]) {
  return changes
    .filter((c) => {
      const s = new Date(c.plannedStart);
      return s >= TODAY && s <= WEEK_END &&
        !['closed_successful', 'closed_failed', 'rejected', 'cancelled'].includes(c.status);
    })
    .sort((a, b) => new Date(a.plannedStart).getTime() - new Date(b.plannedStart).getTime());
}

function groupByDay(changes: Change[]) {
  const groups: Record<string, Change[]> = {};
  changes.forEach((c) => {
    const key = formatDate(c.plannedStart, 'EEE, MMM d');
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  return groups;
}

export const ChangeCalendar: React.FC = () => {
  const [view, setView] = useState<ViewMode>('calendar');
  const [listSearch, setListSearch] = useState('');
  const [listStatusFilter, setListStatusFilter] = useState<ChangeStatus | ''>('');
  const [listRiskFilter, setListRiskFilter] = useState<RiskLevel | ''>('');
  const navigate = useNavigate();

  const activeChanges = useMemo(
    () => mockChanges.filter(
      (c) => !['closed_successful', 'closed_failed', 'rejected', 'cancelled'].includes(c.status),
    ),
    [],
  );

  const thisWeekChanges = useMemo(() => getThisWeekChanges(mockChanges), []);
  const weekByDay = useMemo(() => groupByDay(thisWeekChanges), [thisWeekChanges]);

  const awaitingApproval = useMemo(
    () => mockChanges.filter(
      (c) => c.status === 'in_review' &&
        c.approvals.some((a) => a.approverId === 'u-001' && a.decision === 'pending'),
    ),
    [],
  );

  const activeConflicts = useMemo(
    () => mockChanges.filter((c) => c.conflicts.some((cf) => !cf.resolvedAt)),
    [],
  );

  const implementingThisWeek = mockChanges.filter((c) => c.status === 'implementing').length;
  const totalConflicts = mockChanges.reduce((n, c) => n + c.conflicts.filter((cf) => !cf.resolvedAt).length, 0);

  const filteredListChanges = useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    return mockChanges
      .filter((c) => !['closed_successful', 'closed_failed', 'rejected', 'cancelled'].includes(c.status))
      .filter((c) => {
        if (query && !c.title.toLowerCase().includes(query) && !c.publicId.toLowerCase().includes(query)) return false;
        if (listStatusFilter && c.status !== listStatusFilter) return false;
        if (listRiskFilter && c.risk !== listRiskFilter) return false;
        return true;
      });
  }, [listSearch, listStatusFilter, listRiskFilter]);

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ois-text">Change Calendar</h1>
            <p className="text-sm text-ois-text-muted mt-0.5">
              {activeChanges.length} changes ·{' '}
              {mockChanges.filter((c) => c.status === 'in_review').length} awaiting approval ·{' '}
              {implementingThisWeek > 0 ? `${implementingThisWeek} implementing` : '0 implementing'} this week ·{' '}
              {totalConflicts > 0
                ? <span className="text-ois-warning font-semibold">{totalConflicts} conflicts detected</span>
                : 'no conflicts'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex rounded-lg border border-ois-border overflow-hidden">
              {(['calendar', 'board', 'list'] as ViewMode[]).map((v) => {
                const Icon = v === 'calendar' ? Calendar : v === 'board' ? LayoutGrid : List;
                return (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors',
                      view === v
                        ? 'bg-ois-primary text-white'
                        : 'bg-white text-ois-text-muted hover:text-ois-text',
                    )}
                  >
                    <Icon size={13} />
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                );
              })}
            </div>
            <Button
              size="sm"
              className="gap-1.5 h-8"
              onClick={() => navigate('/changes/new')}
            >
              <Plus size={14} />
              New change
            </Button>
          </div>
        </div>

        {/* Calendar view */}
        {view === 'calendar' && (
          <Card className="overflow-hidden">
            <CardBody className="p-4">
              <CalendarView changes={activeChanges} />
            </CardBody>
          </Card>
        )}

        {/* Board view */}
        {view === 'board' && (
          <Card>
            <CardBody className="p-4 overflow-x-auto">
              <ChangeBoard changes={mockChanges} />
            </CardBody>
          </Card>
        )}

        {/* List view */}
        {view === 'list' && (
          <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by title or ID…"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-ois-border bg-white text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
                />
              </div>
              <select
                value={listStatusFilter}
                onChange={(e) => setListStatusFilter(e.target.value as ChangeStatus | '')}
                className="text-xs rounded-lg border border-ois-border bg-white text-ois-text px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
              >
                <option value="">All statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="in_review">In review</option>
                <option value="approved">Approved</option>
                <option value="scheduled">Scheduled</option>
                <option value="implementing">Implementing</option>
                <option value="implemented">Implemented</option>
              </select>
              <select
                value={listRiskFilter}
                onChange={(e) => setListRiskFilter(e.target.value as RiskLevel | '')}
                className="text-xs rounded-lg border border-ois-border bg-white text-ois-text px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-ois-primary/30"
              >
                <option value="">All risk levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-ois-border bg-ois-bg">
                      {['ID', 'Title', 'Type', 'Status', 'Risk', 'Owner', 'Window', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredListChanges.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-xs text-ois-text-subtle italic">
                          No changes match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredListChanges.map((c) => <ChangeRow key={c.id} change={c} />)
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="w-72 shrink-0 space-y-4">
        {/* This week */}
        <Card>
          <div className="px-4 py-3 border-b border-ois-border">
            <h3 className="text-xs font-bold text-ois-text uppercase tracking-wider flex items-center gap-2">
              <Clock size={12} className="text-ois-text-subtle" />
              This Week
            </h3>
          </div>
          <CardBody className="p-0">
            {Object.keys(weekByDay).length === 0 ? (
              <p className="px-4 py-4 text-xs text-ois-text-subtle italic">No changes this week</p>
            ) : (
              <div className="divide-y divide-ois-border">
                {Object.entries(weekByDay).map(([day, changes]: [string, Change[]]) => (
                  <div key={day} className="px-4 py-3">
                    <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider mb-2">
                      {day}
                    </p>
                    <div className="space-y-2">
                      {changes.map((c) => (
                        <Link
                          key={c.id}
                          to={`/changes/${c.publicId}`}
                          className="block group"
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                              c.risk === 'high' ? 'bg-red-500' :
                              c.risk === 'medium' ? 'bg-amber-500' : 'bg-emerald-500',
                            )} />
                            <span className="text-[11px] font-mono font-bold text-ois-primary group-hover:underline">
                              {c.publicId.replace('CHG-2026-', 'CHG-')}
                            </span>
                          </div>
                          <p className="text-[11px] text-ois-text-muted ml-3.5 leading-snug">{c.title}</p>
                          <p className="text-[10px] text-ois-text-subtle ml-3.5">
                            {c.type.charAt(0).toUpperCase() + c.type.slice(1)} · {formatDate(c.plannedStart, 'HH:mm')} UTC
                          </p>
                          {c.conflicts.some((cf) => !cf.resolvedAt) && (
                            <p className="text-[10px] text-ois-warning font-semibold ml-3.5 flex items-center gap-1">
                              <AlertTriangle size={9} className="text-ois-warning shrink-0" /> Conflict
                            </p>
                          )}
                          {c.freezeWindow && (
                            <p className="text-[10px] text-ois-warning font-semibold ml-3.5 flex items-center gap-1">
                              <Lock size={9} className="text-ois-warning shrink-0" /> Freeze window
                            </p>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Awaiting your approval */}
        {awaitingApproval.length > 0 && (
          <Card>
            <div className="px-4 py-3 border-b border-ois-border">
              <h3 className="text-xs font-bold text-ois-text uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={12} className="text-ois-warning" />
                Awaiting Your Approval
              </h3>
            </div>
            <CardBody className="p-0">
              <div className="divide-y divide-ois-border">
                {awaitingApproval.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link
                        to={`/changes/${c.publicId}`}
                        className="text-[11px] font-mono font-bold text-ois-primary hover:underline"
                      >
                        {c.publicId}
                      </Link>
                      <RiskBadge risk={c.risk} size="sm" />
                    </div>
                    <p className="text-[11px] text-ois-text font-medium leading-snug mb-2">{c.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ois-text-subtle">Due {formatDate(c.plannedStart, 'EEE MMM d')}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 text-xs w-full gap-1"
                      onClick={() => navigate(`/changes/${c.publicId}`)}
                    >
                      Review <ChevronRight size={11} />
                    </Button>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Active conflicts */}
        {activeConflicts.length > 0 && (
          <Card>
            <div className="px-4 py-3 border-b border-ois-border">
              <h3 className="text-xs font-bold text-ois-text uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={12} className="text-ois-danger" />
                Active Conflicts
              </h3>
            </div>
            <CardBody className="p-0">
              <div className="divide-y divide-ois-border">
                {activeConflicts.map((c) =>
                  c.conflicts.filter((cf) => !cf.resolvedAt).map((cf) => (
                    <div key={cf.id} className="px-4 py-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={11} className="text-ois-warning shrink-0" />
                        <Link
                          to={`/changes/${c.publicId}`}
                          className="text-[11px] font-mono font-bold text-ois-primary hover:underline"
                        >
                          {c.publicId}
                        </Link>
                      </div>
                      <p className="text-[11px] text-ois-text-muted leading-snug">{cf.description}</p>
                      <Badge
                        variant={cf.severity === 'blocking' ? 'danger' : 'warning'}
                        className="mt-1.5 text-[9px]"
                      >
                        {cf.severity}
                      </Badge>
                    </div>
                  )),
                )}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
};
