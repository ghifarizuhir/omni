import React, { useState, useMemo } from 'react';
import {
  Pause, Play, Download, Search,
  RotateCcw, List, ChevronDown,
  Activity, Clock, AlertTriangle,
  MessageSquare, BarChart3, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO, subDays, isAfter } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { EventCard } from '../../components/monitoring/EventCard';
import { EventStreamStatsRail } from '../../components/monitoring/EventStreamStatsRail';
import { eventsService, useResource } from '../../services';
import { Event, EventStatus, EventType, EventSource } from '../../types/monitoring';
import { Severity } from '../../types/common';
import { cn } from '../../lib/utils';
import { FilterDropdown } from '../../components/ui/FilterDropdown';

type TimeRange = '24h' | '7d' | '30d';
const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  '24h': 'Last 24h',
  '7d':  'Last 7 days',
  '30d': 'Last 30 days',
};

export const EventStream: React.FC = () => {
  const navigate = useNavigate();
  const { data: eventsData } = useResource(() => eventsService.list(), []);
  const mockEvents = eventsData ?? [];
  const [isPaused, setIsPaused] = useState(false);
  const [frozenEvents, setFrozenEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<EventSource | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(25);
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [timeRangeOpen, setTimeRangeOpen] = useState(false);

  const filteredEvents = useMemo(() => {
    const referenceDate = new Date('2026-05-09');
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;
    const cutoff = subDays(referenceDate, days);

    let result = (isPaused ? frozenEvents : mockEvents)
      .filter(e => isAfter(parseISO(e.firedAt), cutoff))
      .sort((a, b) => new Date(b.firedAt).getTime() - new Date(a.firedAt).getTime());

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        e.publicId.toLowerCase().includes(q) ||
        e.affectedCIPublicIds.some(id => id.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'all') result = result.filter(e => e.status === statusFilter);
    if (severityFilter !== 'all') result = result.filter(e => e.severity === severityFilter);
    if (sourceFilter !== 'all') result = result.filter(e => e.source === sourceFilter);
    if (typeFilter !== 'all') result = result.filter(e => e.type === typeFilter);

    if (activeQuickFilter === 'active-p1p2') {
      result = result.filter(e => (e.severity === 'P1' || e.severity === 'P2') && (e.status === 'open' || e.status === 'acknowledged'));
    } else if (activeQuickFilter === 'exceptions') {
      result = result.filter(e => e.type === 'exception');
    } else if (activeQuickFilter === 'warnings') {
      result = result.filter(e => e.type === 'warning');
    } else if (activeQuickFilter === 'info') {
      result = result.filter(e => e.type === 'informational');
    } else if (activeQuickFilter === 'last24h') {
      result = result.filter(e => isAfter(parseISO(e.firedAt), subDays(new Date('2026-05-09'), 1)));
    }

    return result;
  }, [timeRange, searchQuery, statusFilter, severityFilter, sourceFilter, typeFilter, activeQuickFilter, isPaused, frozenEvents]);

  const togglePause = () => {
    if (!isPaused) setFrozenEvents([...filteredEvents]);
    else setFrozenEvents([]);
    setIsPaused(v => !v);
  };

  const activeEvents = isPaused ? frozenEvents : filteredEvents;
  const displayedEvents = activeEvents.slice(0, visibleCount);

  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    displayedEvents.forEach(e => {
      const dateKey = format(parseISO(e.firedAt), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(e);
    });
    return groups;
  }, [displayedEvents]);

  const stats = useMemo(() => {
    const events = isPaused ? frozenEvents : mockEvents;
    return {
      total: events.length,
      open: events.filter(e => e.status === 'open').length,
      acknowledged: events.filter(e => e.status === 'acknowledged').length,
      resolved: events.filter(e => e.status === 'resolved').length,
      exception: events.filter(e => e.type === 'exception').length,
      warning: events.filter(e => e.type === 'warning').length,
      informational: events.filter(e => e.type === 'informational').length,
    };
  }, [isPaused, frozenEvents]);

  const formatDateHeader = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return `TODAY · ${format(date, 'MMMM d, yyyy').toUpperCase()}`;
    if (isYesterday(date)) return `YESTERDAY · ${format(date, 'MMMM d, yyyy').toUpperCase()}`;
    return format(date, 'MMMM d, yyyy').toUpperCase();
  };

  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setSourceFilter('all');
    setTypeFilter('all');
    setActiveQuickFilter(null);
  };

  const openCount = mockEvents.filter(e => e.status === 'open').length;
  const p1p2Count = mockEvents.filter(e => (e.severity === 'P1' || e.severity === 'P2') && e.status === 'open').length;

  const handleExport = () => {
    const headers = ['ID', 'Title', 'Severity', 'Status', 'Source', 'Fired At', 'Tags'];
    const rows = filteredEvents.map(e => [
      e.publicId,
      `"${e.title.replace(/"/g, '""')}"`,
      e.severity,
      e.status,
      e.source,
      e.firedAt,
      `"${(e.tags ?? []).join(', ')}"`,
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Action row ── */}
      <div className="shrink-0 flex items-center justify-between px-6 py-2 border-b border-ois-border bg-ois-surface">
        <div className="flex items-center gap-3 text-xs text-ois-text-muted">
          <span>{mockEvents.length} events in {TIME_RANGE_LABELS[timeRange].toLowerCase()}</span>
          {p1p2Count > 0 && (
            <>
              <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
              <span className="font-semibold text-ois-danger">{p1p2Count} P1/P2 open</span>
            </>
          )}
          {isPaused && <span className="font-semibold text-ois-warning">· paused</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={togglePause}>
            {isPaused
              ? <><Play size={13} className="fill-current" /> Resume</>
              : <><Pause size={13} className="fill-current" /> Pause</>}
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setTimeRangeOpen(v => !v)}>
              {TIME_RANGE_LABELS[timeRange]}
              <ChevronDown size={13} className={cn('transition-transform', timeRangeOpen && 'rotate-180')} />
            </Button>
            {timeRangeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setTimeRangeOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg border border-ois-border shadow-ois-dropdown overflow-hidden min-w-[140px]">
                  {(Object.entries(TIME_RANGE_LABELS) as [TimeRange, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setTimeRange(key); setTimeRangeOpen(false); }}
                      className={cn(
                        'w-full text-left px-4 py-2.5 text-sm hover:bg-ois-surface-muted transition-colors',
                        timeRange === key ? 'font-semibold text-ois-primary' : 'text-ois-text'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download size={13} /> Export
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 lg:hidden" onClick={() => setShowStatsDrawer(true)}>
            <BarChart3 size={13} /> Stats
          </Button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">

        {/* Main scrollable column */}
        <div className="flex-1 min-w-0 overflow-y-auto">

          {/* Pause banner */}
          <AnimatePresence>
            {isPaused && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-ois-primary text-white py-2 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Pause size={14} />
                    Stream paused at {format(new Date(), 'HH:mm')} UTC · 3 new events available
                  </div>
                  <button
                    onClick={togglePause}
                    className="text-xs font-bold text-white/80 hover:text-white transition-colors"
                  >
                    Resume
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-6 py-5 space-y-5">
            {/* Filters */}
            <Card className="p-4">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={14} />
                  <Input
                    placeholder="Search title, message, CI ID…"
                    className="pl-9 h-9 text-sm"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <FilterDropdown
                    value={statusFilter}
                    onChange={v => setStatusFilter(v as EventStatus | 'all')}
                    options={[
                      { value: 'all', label: 'Any Status' },
                      { value: 'open', label: 'Open' },
                      { value: 'acknowledged', label: 'Acknowledged' },
                      { value: 'resolved', label: 'Resolved' },
                      { value: 'suppressed', label: 'Suppressed' },
                    ]}
                    placeholder="Status"
                  />
                  <FilterDropdown
                    value={severityFilter}
                    onChange={v => setSeverityFilter(v as Severity | 'all')}
                    options={[
                      { value: 'all', label: 'Any Severity' },
                      { value: 'P1', label: 'P1 — Critical' },
                      { value: 'P2', label: 'P2 — High' },
                      { value: 'P3', label: 'P3 — Medium' },
                      { value: 'P4', label: 'P4 — Low' },
                    ]}
                    placeholder="Severity"
                  />
                  <Button variant="ghost" size="sm" className="text-ois-text-muted hover:text-ois-danger gap-1.5" onClick={resetFilters}>
                    <RotateCcw size={13} /> Reset
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-ois-border">
                <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest self-center mr-1">Quick:</span>
                {[
                  { id: 'active-p1p2', label: 'Active P1/P2', icon: AlertTriangle, count: mockEvents.filter(e => (e.severity === 'P1' || e.severity === 'P2') && (e.status === 'open' || e.status === 'acknowledged')).length },
                  { id: 'exceptions',  label: 'Exceptions',   icon: Activity,       count: mockEvents.filter(e => e.type === 'exception').length },
                  { id: 'warnings',    label: 'Warnings',     icon: AlertTriangle,  count: mockEvents.filter(e => e.type === 'warning').length },
                  { id: 'info',        label: 'Informational',icon: MessageSquare,  count: mockEvents.filter(e => e.type === 'informational').length },
                  { id: 'last24h',     label: 'Last 24h',     icon: Clock,          count: mockEvents.filter(e => isAfter(parseISO(e.firedAt), subDays(new Date('2026-05-09'), 1))).length },
                ].map(chip => (
                  <button
                    key={chip.id}
                    onClick={() => setActiveQuickFilter(activeQuickFilter === chip.id ? null : chip.id)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium transition-colors',
                      activeQuickFilter === chip.id
                        ? 'bg-ois-primary text-white border-ois-primary'
                        : 'bg-white text-ois-text-muted border-ois-border hover:border-ois-border-strong hover:text-ois-text'
                    )}
                  >
                    <chip.icon size={11} />
                    {chip.label}
                    <span className="opacity-70 tabular-nums">{chip.count}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Event list */}
            <div className="space-y-5">
              {activeEvents.length === 0 ? (
                <div className="text-center py-12">
                  <List size={36} className="mx-auto text-ois-text-subtle mb-3" />
                  <p className="text-sm text-ois-text-muted">No events match your filters.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                    <RotateCcw size={13} className="mr-1.5" /> Reset filters
                  </Button>
                </div>
              ) : (
                (Object.entries(groupedEvents) as [string, Event[]][]).map(([date, events]) => (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center gap-3 sticky top-0 z-10 bg-ois-bg/90 backdrop-blur-sm py-1.5">
                      <div className="flex-1 h-px bg-ois-border" />
                      <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest whitespace-nowrap">
                        {formatDateHeader(date)}
                      </span>
                      <div className="flex-1 h-px bg-ois-border" />
                    </div>
                    {events.map(event => (
                      <EventCard key={event.id} event={event} onClick={() => navigate(`/monitoring/events/${event.publicId}`)} />
                    ))}
                  </div>
                ))
              )}

              {activeEvents.length > visibleCount && (
                <div className="pt-2 text-center">
                  <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => setVisibleCount(p => p + 25)}>
                    Load 25 more
                    <span className="ml-1.5 text-ois-text-subtle tabular-nums">({activeEvents.length - visibleCount} remaining)</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right stats rail */}
        <aside className="hidden lg:block w-[300px] shrink-0 border-l border-ois-border overflow-y-auto bg-ois-surface p-4">
          <EventStreamStatsRail stats={stats} />
        </aside>
      </div>

      {/* Mobile stats drawer */}
      <AnimatePresence>
        {showStatsDrawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowStatsDrawer(false)}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              className="fixed right-0 top-0 bottom-0 w-[300px] bg-ois-surface z-50 lg:hidden shadow-2xl overflow-y-auto"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-ois-border">
                <h2 className="text-sm font-bold text-ois-text">Live Stats</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowStatsDrawer(false)}>
                  <X size={18} />
                </Button>
              </div>
              <div className="p-4 space-y-4">
                <Card className="p-4">
                  <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-3">Status</p>
                  <div className="space-y-2.5">
                    <StatRow label="Total" value={stats.total} />
                    <StatRow label="Open" value={stats.open} color="text-ois-danger" />
                    <StatRow label="Acknowledged" value={stats.acknowledged} color="text-ois-warning" />
                    <StatRow label="Resolved" value={stats.resolved} color="text-ois-success" />
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-widest mb-3">By Type</p>
                  <div className="space-y-2.5">
                    <StatRow label="Exception" value={stats.exception} color="text-ois-danger" />
                    <StatRow label="Warning" value={stats.warning} color="text-ois-warning" />
                    <StatRow label="Informational" value={stats.informational} />
                  </div>
                </Card>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-ois-text-muted">{label}</span>
    <span className={cn('text-xs font-semibold text-ois-text tabular-nums', color)}>{value}</span>
  </div>
);
