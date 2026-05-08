import React, { useState, useMemo } from 'react';
import { 
  Pause, Play, Download, Search, Filter, 
  RotateCcw, List, LayoutDashboard, ChevronDown, 
  Activity, CheckCircle2, Clock, AlertTriangle, 
  MessageSquare, MoreHorizontal, ExternalLink,
  BarChart3, Database, Shield, Zap, Bell, Layers,
  Globe, Hash, Mail, Users, User, ArrowRight,
  TrendingUp, Circle, X
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { EventCard } from '../../components/monitoring/EventCard';
import { EventStreamStatsRail } from '../../components/monitoring/EventStreamStatsRail';
import { mockEvents, mockCIs, mockMonitoringRules, mockUsers } from '../../mocks';
import { Event, EventStatus, EventType, EventSource } from '../../types/monitoring';
import { Severity } from '../../types/common';
import { cn } from '../../lib/utils';

export const EventStream: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<EventSource | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all');
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(25);
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);

  // Filter Logic
  const filteredEvents = useMemo(() => {
    let result = [...mockEvents].sort((a, b) => new Date(b.firedAt).getTime() - new Date(a.firedAt).getTime());

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        e.title.toLowerCase().includes(q) || 
        e.message.toLowerCase().includes(q) || 
        e.publicId.toLowerCase().includes(q) ||
        e.affectedCIPublicIds.some(id => id.toLowerCase().includes(q))
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(e => e.status === statusFilter);
    }

    if (severityFilter !== 'all') {
      result = result.filter(e => e.severity === severityFilter);
    }

    if (sourceFilter !== 'all') {
      result = result.filter(e => e.source === sourceFilter);
    }

    if (typeFilter !== 'all') {
      result = result.filter(e => e.type === typeFilter);
    }

    // Apply Quick Filters
    if (activeQuickFilter === 'active-p1p2') {
      result = result.filter(e => (e.severity === 'P1' || e.severity === 'P2') && (e.status === 'open' || e.status === 'acknowledged'));
    } else if (activeQuickFilter === 'exceptions') {
      result = result.filter(e => e.type === 'exception');
    } else if (activeQuickFilter === 'warnings') {
      result = result.filter(e => e.type === 'warning');
    } else if (activeQuickFilter === 'info') {
      result = result.filter(e => e.type === 'informational');
    } else if (activeQuickFilter === 'last24h') {
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      result = result.filter(e => new Date(e.firedAt) > oneDayAgo);
    }

    return result;
  }, [searchQuery, statusFilter, severityFilter, sourceFilter, typeFilter, activeQuickFilter]);

  const displayedEvents = filteredEvents.slice(0, visibleCount);

  // Grouped by Date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, Event[]> = {};
    displayedEvents.forEach(e => {
      const dateKey = format(parseISO(e.firedAt), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(e);
    });
    return groups;
  }, [displayedEvents]);

  // Stats Logic
  const stats = useMemo(() => {
    const last24h = new Date();
    last24h.setDate(last24h.getDate() - 1);
    const recentEvents = mockEvents.filter(e => new Date(e.firedAt) > last24h);

    const sourceCounts: Record<string, number> = {};
    recentEvents.forEach(e => {
      sourceCounts[e.source] = (sourceCounts[e.source] || 0) + 1;
    });

    const ruleFires: Record<string, number> = {};
    recentEvents.forEach(e => {
      if (e.rulePublicId) {
        ruleFires[e.rulePublicId] = (ruleFires[e.rulePublicId] || 0) + 1;
      }
    });

    const ciEvents: Record<string, number> = {};
    recentEvents.forEach(e => {
      e.affectedCIPublicIds.forEach(id => {
        ciEvents[id] = (ciEvents[id] || 0) + 1;
      });
    });

    return {
      total24h: recentEvents.length,
      active24h: recentEvents.filter(e => e.status === 'open' || e.status === 'acknowledged').length,
      p1_24h: recentEvents.filter(e => e.severity === 'P1').length,
      p2_24h: recentEvents.filter(e => e.severity === 'P2').length,
      autoResolved24h: recentEvents.filter(e => e.resolvedBy === 'system').length,
      sources: (Object.entries(sourceCounts) as [string, number][]).sort((a, b) => b[1] - a[1]),
      noisyRules: (Object.entries(ruleFires) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 3),
      topCIs: (Object.entries(ciEvents) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 4)
    };
  }, []);

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

  const toggleQuickFilter = (id: string) => {
    setActiveQuickFilter(activeQuickFilter === id ? null : id);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ois-text">Event Stream</h1>
          <div className="flex items-center gap-3 mt-1 text-sm font-medium text-ois-text-muted">
            <span>{mockEvents.length} events in last 7 days</span>
            <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
            <span>{mockEvents.filter(e => e.status === 'open').length} active</span>
            <span className="w-1 h-1 rounded-full bg-ois-border-strong" />
            <span className="text-ois-danger">5 P1/P2 unacknowledged</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 h-9"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play size={14} className="fill-current" /> : <Pause size={14} className="fill-current" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <div className="relative group">
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <Clock size={14} /> Last 7d <ChevronDown size={14} />
            </Button>
          </div>
          <Button variant="outline" size="sm" className="gap-2 h-9">
            <Download size={14} /> Export
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="lg:hidden gap-2 h-9"
            onClick={() => setShowStatsDrawer(true)}
          >
            <BarChart3 size={14} /> Stats
          </Button>
        </div>
      </div>

      {/* Sticky Pause Banner */}
      <AnimatePresence>
        {isPaused && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="sticky top-0 z-20 mb-4 overflow-hidden"
          >
            <div className="bg-ois-primary text-white py-2 px-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3 text-sm font-medium">
                <Pause size={16} />
                <span>Stream paused at {format(new Date(), 'HH:mm')} UTC. 3 new events available.</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white/20 h-7 text-xs font-bold"
                onClick={() => setIsPaused(false)}
              >
                Resume
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-6 items-start">
        {/* Main Stream Area */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Filters Card */}
          <Card className="p-4 border-ois-border">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ois-text-subtle" size={16} />
                <Input 
                  placeholder="Search title, message, payload, CI..." 
                  className="pl-10 h-10 bg-ois-bg/50 border-ois-border-strong focus:bg-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select 
                  className="h-10 px-3 pr-8 rounded-md border border-ois-border-strong bg-ois-bg/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ois-primary/20 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m3%205%203%203%203-3%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_10px_center] bg-no-repeat"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="all">Any Status</option>
                  <option value="open">Open</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="resolved">Resolved</option>
                  <option value="suppressed">Suppressed</option>
                </select>
                <select 
                   className="h-10 px-3 pr-8 rounded-md border border-ois-border-strong bg-ois-bg/50 text-xs font-medium appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m3%205%203%203%203-3%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[position:right_10px_center] bg-no-repeat"
                   value={severityFilter}
                   onChange={(e) => setSeverityFilter(e.target.value as any)}
                >
                  <option value="all">Any Severity</option>
                  <option value="P1">P1 — Critical</option>
                  <option value="P2">P2 — High</option>
                  <option value="P3">P3 — Medium</option>
                  <option value="P4">P4 — Low</option>
                </select>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-10 text-ois-text-muted hover:text-ois-danger"
                  onClick={resetFilters}
                >
                  <RotateCcw size={14} className="mr-2" /> Reset
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-ois-border">
              {[
                { id: 'active-p1p2', label: 'Active P1/P2', icon: AlertTriangle, count: 5, color: 'text-ois-danger' },
                { id: 'exceptions', label: 'Exceptions', icon: Activity, count: 10 },
                { id: 'warnings', label: 'Warnings', icon: AlertTriangle, count: 25 },
                { id: 'info', label: 'Informational', icon: MessageSquare, count: 15 },
                { id: 'last24h', label: 'Last 24h', icon: Clock, count: 18 }
              ].map(chip => (
                <button
                  key={chip.id}
                  onClick={() => toggleQuickFilter(chip.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
                    activeQuickFilter === chip.id 
                      ? "bg-ois-primary text-white border-ois-primary" 
                      : "bg-white text-ois-text-muted border-ois-border hover:border-ois-border-strong hover:bg-ois-bg"
                  )}
                >
                  <chip.icon size={12} className={cn(activeQuickFilter === chip.id ? "text-white" : chip.color)} />
                  {chip.label}
                  <span className={cn(
                    "ml-1 opacity-60",
                    activeQuickFilter === chip.id ? "text-white" : ""
                  )}>({chip.count})</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Event Stream List */}
          <div className="space-y-8">
            {filteredEvents.length === 0 ? (
              <Card className="p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-ois-border bg-ois-bg/30">
                <div className="p-4 bg-ois-surface rounded-full shadow-sm mb-4">
                  <List size={32} className="text-ois-text-subtle" />
                </div>
                <h3 className="text-lg font-bold text-ois-text">No events found</h3>
                <p className="text-sm text-ois-text-muted mt-1 max-w-sm">
                  Try adjusting your filters or search terms. Your current criteria don't match any events in the stream.
                </p>
                <Button variant="outline" size="sm" className="mt-6 font-bold" onClick={resetFilters}>
                  <RotateCcw size={14} className="mr-2" /> Reset all filters
                </Button>
              </Card>
            ) : (
              (Object.entries(groupedEvents) as [string, Event[]][]).map(([date, events]) => (
                <div key={date} className="space-y-4">
                  <div className="flex items-center gap-4 py-2 sticky top-0 z-10 bg-ois-bg/80 backdrop-blur-sm">
                    <div className="flex-1 h-px bg-ois-border-strong" />
                    <span className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest whitespace-nowrap">
                      {formatDateHeader(date)}
                    </span>
                    <div className="flex-1 h-px bg-ois-border-strong" />
                  </div>

                  {events.map((event) => (
                    <EventCard 
                      key={event.id} 
                      event={event} 
                      onClick={() => navigate(`/events/${event.publicId}`)}
                    />
                  ))}
                </div>
              ))
            )}

            {filteredEvents.length > visibleCount && (
              <div className="pt-4 text-center">
                <Button 
                  variant="outline" 
                  className="font-bold border-ois-border-strong w-full sm:w-auto h-11 px-8"
                  onClick={() => setVisibleCount(prev => prev + 25)}
                >
                  Load 25 more events
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Right Rail — Live Stats */}
        <div className="hidden lg:block w-[300px] sticky top-6">
          <EventStreamStatsRail stats={stats} />
        </div>
      </div>

      {/* Stats Drawer Overlay for Mobile/Tablet */}
      <AnimatePresence>
        {showStatsDrawer && (
          <>
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setShowStatsDrawer(false)}
               className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            />
            <motion.div 
               initial={{ x: '100%' }}
               animate={{ x: 0 }}
               exit={{ x: '100%' }}
               className="fixed right-0 top-0 bottom-0 w-[300px] bg-ois-bg z-50 lg:hidden shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-ois-text">Live Stats</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowStatsDrawer(false)}>
                  <X size={20} />
                </Button>
              </div>
              <div className="space-y-6">
                 {/* Reusing existing cards design here but simplified for drawer */}
                 <div className="space-y-4">
                    <Card className="p-4">
                       <h3 className="text-xs font-bold text-ois-text mb-4 uppercase tracking-widest text-ois-text-subtle">Last 24h Summary</h3>
                       <div className="space-y-3">
                          <StatRow label="Total events" value={stats.total24h} />
                          <StatRow label="Active" value={stats.active24h} />
                          <StatRow label="P1" value={stats.p1_24h} color="text-ois-danger" />
                          <StatRow label="P2" value={stats.p2_24h} color="text-ois-warning" />
                        </div>
                    </Card>
                    
                    <Card className="p-4">
                       <h3 className="text-xs font-bold text-ois-text mb-4 uppercase tracking-widest text-ois-text-subtle">Noisy Rules</h3>
                       <div className="space-y-3">
                          {stats.noisyRules.map(([rule, count]) => (
                            <StatRow key={rule} label={rule} value={`${count} fires`} />
                          ))}
                       </div>
                    </Card>
                 </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatRow: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color }) => (
  <div className="flex items-center justify-between group">
    <span className="text-xs font-medium text-ois-text-muted">{label}</span>
    <span className={cn("text-xs font-bold text-ois-text", color)}>{value}</span>
  </div>
);
