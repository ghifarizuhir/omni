import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KPICard } from '../components/ui/KPICard';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusBadge, SeverityBadge } from '../components/ui/StatusSeverityBadges';
import { Avatar } from '../components/ui/Avatar';
import { cn } from '@/src/lib/utils';
import {
  AlertCircle, Activity, Clock, ArrowRight, CheckCircle2,
  ExternalLink, Calendar, RefreshCw, ChevronDown,
  AlertTriangle, CheckCircle, Info, Heart, Zap, Lock,
  MoreVertical, ShieldCheck, TrendingUp, Siren,
} from 'lucide-react';
import {
  mockServices,
  mockIncidents,
  mockUsers,
  mockInboxItems,
  mockChanges,
  mockTeams
} from '@/src/mocks';
import { getMajorIncidents, getActiveIncidents } from '@/src/mocks/incidents';
import { formatRelative, formatDate } from '@/src/lib/format';
import { ServiceHealthStatus, Severity } from '../types';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const activeIncidents = getActiveIncidents();
  const majorIncidents = getMajorIncidents().filter(i => !['resolved', 'closed'].includes(i.status));
  
  // Section A Logic
  const getStatusColor = (status: ServiceHealthStatus) => {
    switch (status) {
      case 'operational': return 'bg-ois-success';
      case 'degraded': return 'bg-ois-warning';
      case 'partial_outage': return 'bg-orange-500';
      case 'major_outage': return 'bg-ois-danger';
      case 'maintenance': return 'bg-ois-info';
      default: return 'bg-ois-text-subtle';
    }
  };

  // Section C Logic: Top 3 inbox items (urgent first, then normal by oldest dueAt)
  const sortedInbox = [...mockInboxItems].sort((a, b) => {
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  }).slice(0, 3);

  // Section D Logic: Group changes by day
  const today = new Date('2026-05-08');
  const getDayLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    if (d.toDateString() === today.toDateString()) return 'TODAY';
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === tomorrow.toDateString()) return 'TOMORROW';
    return formatDate(dateStr, 'EEE MMM dd').toUpperCase();
  };

  const groupedChanges = mockChanges.reduce((acc, change) => {
    const label = getDayLabel(change.startTime);
    if (!acc[label]) acc[label] = [];
    acc[label].push(change);
    return acc;
  }, {} as Record<string, typeof mockChanges>);

  return (
    <div className="space-y-6 pb-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-ois-text">Operational Pulse</h1>
          <p className="text-sm text-ois-text-muted mt-1">
            Tuesday, May 8 2026, 08:42 UTC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2 h-9 border-ois-border-strong">
            Last 24h <ChevronDown size={14} />
          </Button>
          <Button variant="outline" size="sm" className="gap-2 h-9 border-ois-border-strong">
            Refresh <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {/* Section A: Service Health Strip */}
      <Card>
        <CardHeader className="flex items-center justify-between border-b border-ois-border px-5 py-3">
          <div className="flex items-center gap-2 text-xs font-bold text-ois-text-muted uppercase tracking-wider">
            <Activity size={16} className="text-ois-primary" />
            Service Health
          </div>
          <Link to="/status" className="text-xs font-bold text-ois-primary hover:underline flex items-center gap-1">
            View status page <ArrowRight size={12} />
          </Link>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-ois-border">
          {mockServices.map(service => (
            <div 
              key={service.id} 
              onClick={() => navigate('/availability')}
              className="p-4 hover:bg-ois-surface-muted transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-ois-text group-hover:text-ois-primary transition-colors">
                  {service.name}
                </span>
                <span className={cn("w-1.5 h-1.5 rounded-full ring-4 ring-opacity-20", 
                  getStatusColor(service.currentHealth).replace('bg-', 'ring-')
                )} />
              </div>
              <div className="flex items-center gap-2 mb-2">
                 <div className={cn("w-2 h-2 rounded-full", getStatusColor(service.currentHealth))} />
                 <span className="text-xs font-medium capitalize text-ois-text-muted">
                   {service.currentHealth.replace('_', ' ')}
                 </span>
              </div>
              <div className="text-[11px] font-mono font-bold text-ois-text-subtle">
                {service.uptime30d}% <span className="opacity-40 px-1">/</span> {service.slaTarget}%
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Section B: KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          label="Open Incidents" 
          value={activeIncidents.length} 
          trend={2} 
          trendLabel="+2 from yest" 
          trendBetter="low"
          subDetail={`${activeIncidents.filter(i => i.severity === 'P1').length} P1 · ${activeIncidents.filter(i => i.severity === 'P2').length} P2`}
          icon={<AlertCircle className="w-5 h-5" />} 
        />
        <KPICard 
          label="MTTR (24h)" 
          value="28m" 
          trend={-7} 
          trendLabel="-7m vs 7d avg" 
          trendBetter="low"
          subDetail="Target: 30m"
          icon={<Clock className="w-5 h-5" />} 
        />
        <KPICard 
          label="SLA Compliance" 
          value="99.4%" 
          trend={0.2} 
          trendLabel="+0.2% vs week" 
          trendBetter="high"
          subDetail="8 services"
          icon={<ShieldCheck className="w-5 h-5" />} 
        />
        <KPICard 
          label="Pending Approvals" 
          value="3" 
          trend={2} 
          trendLabel="2 urgent" 
          trendBetter="neutral"
          subDetail="Due in 24h"
          icon={<CheckCircle2 className="w-5 h-5" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Section C - Left: Active Incidents Feed (60%) */}
        {/* Major incident banner */}
        {majorIncidents.length > 0 && (
          <div className="lg:col-span-3 rounded-xl border-2 border-red-300 bg-red-50 px-5 py-3 flex items-center gap-4">
            <Siren size={20} className="text-ois-danger animate-pulse shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-ois-danger mb-0.5">Major Incident in Progress</p>
              <p className="text-sm font-semibold text-ois-text truncate">
                <span className="font-mono mr-2">{majorIncidents[0].publicId}</span>
                {majorIncidents[0].title}
              </p>
              <p className="text-xs text-ois-text-muted mt-0.5">
                IC: {mockUsers.find(u => u.id === majorIncidents[0].incidentCommander)?.name ?? '—'} · Started {formatRelative(majorIncidents[0].createdAt)}
              </p>
            </div>
            <Link
              to={`/incidents/major/${majorIncidents[0].publicId}`}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-ois-danger text-white text-xs font-bold hover:bg-red-700 transition-colors"
            >
              Open war room →
            </Link>
          </div>
        )}

        <Card className="lg:col-span-3">
          <CardHeader className="flex items-center justify-between border-b border-ois-border">
            <div className="flex items-center gap-2 font-bold text-ois-text">
              Active Incidents
              <Badge variant="neutral" className="ml-1 bg-ois-surface-muted text-ois-text-muted">
                {activeIncidents.length}
              </Badge>
            </div>
            <Link to="/incidents" className="text-xs font-bold text-ois-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <div className="divide-y divide-ois-border">
            {activeIncidents.slice(0, 5).map(incident => (
              <div 
                key={incident.id} 
                onClick={() => navigate(`/incidents/${incident.publicId}`)}
                className="p-4 hover:bg-ois-surface-muted transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <SeverityBadge severity={incident.severity} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono font-bold text-ois-text-subtle">{incident.publicId}</span>
                      <span className="text-sm font-semibold text-ois-text truncate group-hover:text-ois-primary transition-colors">
                        {incident.title}
                      </span>
                    </div>
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-ois-text-muted font-medium">
                      <span>Assigned to {mockUsers.find(u => u.id === incident.assigneeId)?.name}</span>
                      <span className="flex items-center gap-1.5">
                         <div className="w-1 h-1 rounded-full bg-ois-border-strong" />
                         <span className="capitalize">{incident.status.replace('_', ' ')}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                         <div className="w-1 h-1 rounded-full bg-ois-border-strong" />
                         {formatRelative(incident.createdAt)}
                      </span>
                      {(incident.slaResponseStatus === 'breached' || incident.slaResolveStatus === 'breached') && (
                        <span className="flex items-center gap-1 text-ois-danger font-bold">
                          <AlertTriangle size={12} />
                          SLA
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section C - Right: Action Required Preview (40%) */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between border-b border-ois-border">
            <div className="flex items-center gap-2 font-bold text-ois-text">
              Action Required
            </div>
            <button className="text-xs font-bold text-ois-primary hover:underline flex items-center gap-1">
              Open Inbox <ArrowRight size={12} />
            </button>
          </CardHeader>
          <div className="p-3 bg-ois-surface-muted/50 border-b border-ois-border">
            <div className="text-xs font-medium text-ois-text-muted">
              {mockInboxItems.filter(i => i.priority === 'urgent').length} urgent · {mockInboxItems.filter(i => i.priority === 'normal').length} normal
            </div>
          </div>
          <div className="divide-y divide-ois-border">
            {sortedInbox.map(item => (
              <div key={item.id} className="p-4 hover:bg-ois-surface-muted transition-colors border-l-2 border-l-transparent data-[urgent=true]:border-l-ois-danger" data-urgent={item.priority === 'urgent'}>
                <div className="flex items-center gap-2 mb-1">
                   {item.priority === 'urgent' && (
                     <span className="text-[10px] font-bold text-ois-danger uppercase tracking-tight">Urgent</span>
                   )}
                   <span className="text-[13px] font-semibold text-ois-text leading-tight">{item.title}</span>
                </div>
                <div className="text-xs font-mono font-bold text-ois-text-subtle mb-3">
                  {item.sourceRef} · <span className={cn(
                    new Date(item.dueAt) < new Date(new Date().getTime() + 3600000) ? "text-ois-danger" : ""
                  )}>Due {formatRelative(item.dueAt)}</span>
                </div>
                <div className="flex gap-2">
                   {item.type === 'approval' ? (
                     <>
                       <Button size="xs" variant="primary">Approve</Button>
                       <Button size="xs" variant="outline">Reject</Button>
                     </>
                   ) : item.type === 'sign_off' ? (
                     <Button size="xs" variant="primary">Sign off</Button>
                   ) : (
                     <Button size="xs" variant="primary">Acknowledge</Button>
                   )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section D - Left: Change Calendar */}
        <Card>
          <CardHeader className="flex items-center justify-between border-b border-ois-border">
            <div className="flex items-center gap-2 font-bold text-ois-text text-[14px]">
              Change Calendar — Next 7 days
            </div>
            <Link to="/changes/calendar" className="text-xs font-bold text-ois-primary hover:underline flex items-center gap-1">
              Calendar <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <div className="p-4 space-y-6">
            {Object.entries(groupedChanges).sort().map(([label, changes]) => (
              <div key={label}>
                <div className="text-[11px] font-bold text-ois-text-subtle tracking-wider mb-3">{label}</div>
                <div className="space-y-3">
                  {changes.map(change => (
                    <div key={change.id} className="group">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-3 h-3 rounded-full mt-1 shrink-0",
                          change.status === 'implementing' ? "ring-4 ring-ois-primary/20 bg-ois-primary" :
                          change.type === 'standard' ? "bg-ois-success" :
                          change.type === 'emergency' ? "bg-ois-danger" : "bg-ois-warning"
                        )} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-ois-text">
                              {formatDate(change.startTime, 'HH:mm')} — {change.id}
                            </span>
                            <span className="text-xs font-medium text-ois-text-muted group-hover:text-ois-primary transition-colors">
                              {change.title}
                            </span>
                            <Badge variant="neutral" className="text-[10px] h-4 py-0 leading-none">
                              {change.type}
                            </Badge>
                          </div>
                          {change.conflict && (
                            <div className="flex items-center gap-1.5 text-xs text-ois-warning font-semibold mt-1">
                              <AlertTriangle size={12} />
                              Conflict: 2 changes target {mockServices.find(s => s.id === change.serviceId)?.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section D - Right: On-Call + Improvements */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex items-center justify-between border-b border-ois-border">
              <div className="flex items-center gap-2 font-bold text-ois-text text-[14px]">
                On-Call Right Now
              </div>
              <Link to="/oncall" className="text-xs font-bold text-ois-primary hover:underline flex items-center gap-1">
                View schedule <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <div className="p-4 space-y-4">
              {[
                { svc: 'Payment Service', user: 'David Okafor' },
                { svc: 'Auth Service', user: 'Yuki Tanaka' },
                { svc: 'Search Service', user: 'Aisha Khan' }
              ].map(row => (
                <div key={row.svc} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ois-text-muted">{row.svc}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ois-text">{row.user}</span>
                    <span className="text-[10px] font-bold text-ois-text-subtle uppercase opacity-60">(primary)</span>
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t border-ois-border flex items-center justify-between text-xs font-semibold">
                <span className="text-ois-text-muted">Next handover: 18:00 UTC</span>
                <span className="text-ois-primary flex items-center gap-1">
                  <ArrowRight size={10} /> Sarah Chen
                </span>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between border-b border-ois-border">
              <div className="flex items-center gap-2 font-bold text-ois-text text-[14px]">
                Improvements In Flight
              </div>
              <Link to="/improvement/kanban" className="text-xs font-bold text-ois-primary hover:underline flex items-center gap-1">
                View board <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <div className="p-4">
              <div className="flex items-center gap-4 mb-4 text-[11px] font-bold text-ois-text-muted uppercase tracking-wider">
                 <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-ois-primary rounded-sm" /> 4 in progress</span>
                 <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-ois-success rounded-sm" /> 2 verified</span>
                 <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-ois-border-strong rounded-sm" /> 8 ideas</span>
              </div>
              <div className="bg-ois-surface-muted p-3 rounded-lg border border-ois-border">
                <div className="text-xs font-bold text-ois-text mb-1">Top: "Reduce P2 MTTR for Payment by 30%"</div>
                <div className="text-[11px] text-ois-text-subtle font-medium">
                  Linked to <span className="font-mono text-ois-primary">PRB-2026-00021</span> · Owner: Helena V.
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-ois-border mt-8 text-[11px] text-ois-text-subtle font-medium">
        <div>Last data refresh: 2 min ago</div>
        <div className="flex items-center gap-4">
          <span>Powered by OIS</span>
          <span>v0.1.0</span>
        </div>
      </div>
    </div>
  );
};

