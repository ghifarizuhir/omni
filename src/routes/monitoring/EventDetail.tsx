import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { 
  ArrowLeft, Activity, Clock, User, Shield, 
  ExternalLink, AlertTriangle, CheckCircle2, 
  Terminal, Database, History, Share2, 
  FileJson, Zap, MoreVertical, MessageSquare,
  ChevronDown, ChevronUp, Copy, RefreshCw,
  Search, Info, BarChart2, Filter, Layers,
  Construction, Globe
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { EventStatusPill } from '../../components/monitoring/EventStatusPill';
import { EventSeverityBadge } from '../../components/monitoring/EventSeverityBadge';
import { EventTimeline } from '../../components/monitoring/EventTimeline';
import { mockEvents, mockCIs, mockMonitoringRules, mockUsers, mockIncidents } from '../../mocks';
import { cn } from '../../lib/utils';
import { EventStatus } from '../../types/monitoring';

interface ResolveEventModalProps {
  linkedIncidentId: string;
  onResolveOnly: () => void;
  onResolveAndOpen: () => void;
  onClose: () => void;
}

const ResolveEventModal: React.FC<ResolveEventModalProps> = ({
  linkedIncidentId,
  onResolveOnly,
  onResolveAndOpen,
  onClose,
}) => {
  return (
    <Modal isOpen={true} onClose={onClose} title="Resolve event" size="sm">
      <div className="py-4 space-y-6">
        <p className="text-sm text-ois-text-muted">
          This event is linked to incident{' '}
          <span className="font-bold font-mono text-ois-danger">{linkedIncidentId}</span>.
          How do you want to proceed?
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-end pb-2">
          <Button variant="outline" className="font-bold border-ois-border-strong bg-white" onClick={onResolveOnly}>
            Resolve event only
          </Button>
          <Button variant="primary" className="font-bold" onClick={onResolveAndOpen}>
            Resolve event + open incident
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export const EventDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State for simulated interactions
  const foundEvent = mockEvents.find(e => e.id === id || e.publicId === id);
  const [event, setEvent] = useState(foundEvent);
  const [showRawPayload, setShowRawPayload] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{ id: string; user: string; text: string; date: string }[]>([]);

  if (!event) {
    return (
      <div className="py-20 text-center">
        <Construction size={48} className="mx-auto text-ois-text-subtle mb-4" />
        <h2 className="text-xl font-bold text-ois-text">Event Not Found</h2>
        <p className="text-ois-text-muted mt-2">The event ID {id} does not exist in the stream.</p>
        <Button variant="outline" className="mt-6" onClick={() => navigate('/events')}>
          Back to Events
        </Button>
      </div>
    );
  }

  // Derived Data
  const affectedCIs = mockCIs.filter(ci => event.affectedCIPublicIds.includes(ci.publicId));
  const rule = mockMonitoringRules.find(r => r.publicId === event.rulePublicId);
  const incident = mockIncidents.find(inc => inc.id === event.linkedIncidentId);
  const relatedEvents = mockEvents
    .filter(e => e.correlationKey === event.correlationKey)
    .sort((a, b) => new Date(b.firedAt).getTime() - new Date(a.firedAt).getTime());

  const ackUser = event.acknowledgedBy ? mockUsers.find(u => u.id === event.acknowledgedBy) : null;

  // Timeline Events
  const timelineEvents = useMemo(() => {
    const items: Array<{ timestamp: string; type: 'log' | 'status_change' | 'comment' | 'action' | 'system'; user?: string; message: string; payload?: Record<string, unknown> }> = [
      {
        type: 'log',
        message: 'Event fired',
        timestamp: event.firedAt,
        payload: { breach: `${event.payload?.metric_value ?? '0.024'} > ${event.payload?.threshold ?? '0.01'}`, source: `${event.source} · job=${event.payload?.job ?? 'unknown'}` }
      },
      {
        type: 'system',
        message: 'Notification routed',
        timestamp: event.firedAt,
        payload: { route: 'ROUTE-CRITICAL-PROD', channels: 'SMS, Slack, Email', recipients: 3 }
      }
    ];

    if (event.linkedIncidentId) {
      items.push({
        type: 'log',
        message: `Linked to incident ${event.linkedIncidentId}`,
        timestamp: event.firedAt,
        payload: { action: 'auto-created from this event' }
      });
    }

    if (event.status === 'acknowledged' || event.status === 'resolved') {
      items.push({
        type: 'status_change',
        message: 'Status: Acknowledged',
        timestamp: event.acknowledgedAt || event.firedAt,
        user: ackUser?.name || 'A user',
      });
    }

    comments.forEach(c => {
      items.push({
        type: 'comment',
        message: c.text,
        timestamp: c.date,
        user: c.user,
      });
    });

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [event, ackUser, comments]);

  // Handlers
  const handleAcknowledge = () => {
    setEvent({
      ...event,
      status: 'acknowledged',
      acknowledgedBy: 'u-001', // Sarah Chen
      acknowledgedAt: new Date().toISOString()
    });
  };

  const handleResolve = () => {
    if (event.linkedIncidentId) {
      setResolveModalOpen(true);
    } else {
      setEvent({
        ...event,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        resolvedBy: 'Sarah Chen'
      });
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    setComments([
      {
        id: Math.random().toString(36).substr(2, 9),
        user: 'Sarah Chen',
        text: newComment,
        date: new Date().toISOString()
      },
      ...comments
    ]);
    setNewComment('');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      {/* Header Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link to="/events" className="flex items-center gap-2 text-sm font-bold text-ois-text-muted hover:text-ois-primary transition-colors">
          <ArrowLeft size={16} /> Back to events
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
             <MoreVertical size={18} />
          </Button>
          {event.status === 'open' && (
            <Button variant="primary" size="sm" className="h-9 px-6 font-bold" onClick={handleAcknowledge}>
              Acknowledge
            </Button>
          )}
          {(event.status === 'open' || event.status === 'acknowledged') && (
            <Button variant="outline" size="sm" className="h-9 px-6 font-bold bg-white border-ois-border-strong hover:bg-ois-bg" onClick={handleResolve}>
              Resolve
            </Button>
          )}
          {event.status === 'resolved' && (
             <Button variant="outline" size="sm" className="h-9 px-6 font-bold bg-white border-ois-border-strong" onClick={() => setEvent({...event, status: 'open'})}>
                Reopen
             </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border-ois-border">
         <div className={cn(
            "h-1",
            event.severity === 'P1' && 'bg-ois-sev-p1',
            event.severity === 'P2' && 'bg-ois-sev-p2',
            event.severity === 'P3' && 'bg-ois-warning',
            event.severity === 'P4' && 'bg-ois-success'
         )} />
         <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
               <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                     <Badge variant="neutral" className="bg-ois-surface-muted text-ois-text-muted text-[10px] uppercase font-bold border-ois-border">
                        {event.type}
                     </Badge>
                     <span className="text-xs font-bold text-ois-text-subtle uppercase tracking-wider">{event.source}</span>
                     <span className="text-xs font-mono font-bold text-ois-text-subtle">·</span>
                     <span className="text-xs font-mono font-bold text-ois-text-subtle">{event.publicId}</span>
                  </div>
                  <h1 className="text-2xl font-bold text-ois-text tracking-tight mb-4">
                     {event.title}
                  </h1>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-2">
                       <div className={cn(
                          "w-2 h-2 rounded-full",
                          event.status === 'open' && "bg-ois-danger",
                          event.status === 'acknowledged' && "bg-ois-warning",
                          event.status === 'resolved' && "bg-ois-success",
                          event.status === 'suppressed' && "bg-ois-text-subtle"
                       )} />
                       <span className="text-xs font-bold text-ois-text">
                          Status: {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                          {event.status === 'acknowledged' && ` · Acked by ${ackUser?.name || 'User'} ${formatDistanceToNow(parseISO(event.acknowledgedAt || event.firedAt))} ago`}
                          {event.status === 'resolved' && ` · Resolved ${formatDistanceToNow(parseISO(event.resolvedAt || event.firedAt))} ago`}
                       </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-medium text-ois-text-muted">
                       <span className="flex items-center gap-1.5"><Clock size={12} /> Fired: {format(parseISO(event.firedAt), 'yyyy-MM-dd HH:mm:ss')} UTC ({formatDistanceToNow(parseISO(event.firedAt))} ago)</span>
                       <span className="flex items-center gap-1.5"><RefreshCw size={12} /> Last seen: {formatDistanceToNow(parseISO(event.lastSeenAt))} ago</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-4 px-6 py-4 bg-ois-bg rounded-xl border border-ois-border self-start">
                  <div className="text-center px-4 border-r border-ois-border">
                     <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider mb-1">Severity</p>
                     <EventSeverityBadge severity={event.severity} />
                  </div>
                  <div className="text-center px-4">
                     <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-wider mb-1">Impacted CIs</p>
                     <span className="text-xl font-bold text-ois-text">{event.affectedCIPublicIds.length}</span>
                  </div>
               </div>
            </div>
         </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Left Column — Context & Lineage (60%) */}
        <div className="lg:col-span-6 space-y-6">
          {/* Affected CIs Card */}
          <Card className="border-ois-border overflow-hidden">
             <CardHeader className="bg-ois-surface-muted/30 border-b border-ois-border px-5 py-4">
                <h3 className="text-sm font-bold text-ois-text flex items-center gap-2 leading-none">
                   <Database size={16} className="text-ois-primary" /> Affected Infrastructure ({affectedCIs.length})
                </h3>
             </CardHeader>
             <CardBody className="p-0">
                <div className="divide-y divide-ois-border">
                   {affectedCIs.map(ci => (
                      <div key={ci.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-ois-surface-muted/30 transition-colors">
                         <div className="flex items-center gap-4">
                            <div className="p-3 bg-ois-bg rounded-lg border border-ois-border">
                               <Database size={20} className="text-ois-text-muted" />
                            </div>
                            <div>
                               <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-sm font-bold text-ois-text">{ci.name}</h4>
                                  <Badge variant="neutral" className="text-[10px] bg-ois-bg text-ois-text-muted border-ois-border font-mono">{ci.publicId}</Badge>
                               </div>
                               <div className="flex flex-wrap gap-x-4 gap-y-1">
                                  <span className="text-[11px] font-medium text-ois-text-muted flex items-center gap-1"><Layers size={10} /> {ci.type.replace('_', ' ')}</span>
                                  <span className="text-[11px] font-medium text-ois-text-muted flex items-center gap-1 uppercase tracking-tighter"><Globe size={10} /> {ci.environment}</span>
                                  <span className={cn(
                                    "text-[11px] font-bold flex items-center gap-1 capitalize",
                                    ci.criticality === 'critical' ? 'text-ois-danger' : 'text-ois-text-muted'
                                  )}>
                                     <Activity size={10} /> {ci.criticality.replace('_', ' ')}
                                  </span>
                               </div>
                            </div>
                         </div>
                         <Link to={`/cmdb/${ci.publicId}`}>
                            <Button variant="outline" size="sm" className="h-8 text-[11px] font-bold bg-white gap-2">
                               Explore in CMDB <ExternalLink size={12} />
                            </Button>
                         </Link>
                      </div>
                   ))}
                </div>
                <div className="p-4 bg-ois-bg/30 border-t border-ois-border text-center">
                   <Button variant="ghost" size="sm" className="text-[11px] font-bold text-ois-primary gap-2">
                      View full CMDB dependency graph <BarChart2 size={14} />
                   </Button>
                </div>
             </CardBody>
          </Card>

          {/* Triggered by Rule Card */}
          <Card className="border-ois-border">
            <CardHeader className="bg-ois-surface-muted/30 border-b border-ois-border px-5 py-4 flex items-center justify-between">
                <h3 className="text-sm font-bold text-ois-text flex items-center gap-2 leading-none">
                   <Shield size={16} className="text-ois-primary" /> Triggered by Monitoring Rule
                </h3>
                {rule && <Badge variant="neutral" className="bg-emerald-50 text-emerald-700 border-emerald-100">{rule.enabled ? 'Active' : 'Disabled'}</Badge>}
            </CardHeader>
            <CardBody className="p-5">
               {rule ? (
                 <div className="space-y-6">
                    <div className="flex items-start justify-between">
                       <div>
                          <p className="text-xs font-mono font-bold text-ois-text-subtle mb-1">{rule.publicId}</p>
                          <h4 className="text-lg font-bold text-ois-text mb-1">{rule.name}</h4>
                          <p className="text-sm text-ois-text-muted">{rule.description}</p>
                       </div>
                       <Link to={`/monitoring/rules/${rule.publicId}`}>
                          <Button variant="outline" size="sm" className="h-9 font-bold bg-white border-ois-border-strong px-4">Open rule</Button>
                       </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-ois-bg rounded-lg border border-ois-border">
                       <div>
                          <p className="text-[10px] font-bold text-ois-text-subtle uppercase mb-1">Type</p>
                          <span className="text-xs font-bold text-ois-text capitalize">{rule.type}</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-ois-text-subtle uppercase mb-1">Default Sev</p>
                          <EventSeverityBadge severity={rule.severity} />
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-ois-text-subtle uppercase mb-1">Cooldown</p>
                          <span className="text-xs font-bold text-ois-text">30 min</span>
                       </div>
                       <div>
                          <p className="text-[10px] font-bold text-ois-text-subtle uppercase mb-1">Fires (24h)</p>
                          <span className="text-xs font-bold text-ois-text">12 times</span>
                       </div>
                    </div>

                    <div>
                       <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-ois-text-subtle uppercase tracking-widest">Query Expression (PromQL)</p>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-ois-primary p-0">Copy query</Button>
                       </div>
                       <div className="bg-slate-900 rounded-lg p-3 font-mono text-emerald-400 text-xs shadow-inner">
                          {event.payload?.promql || `sum(rate(http_requests_total{job="payment-api", status=~"5.."}[5m])) / sum(rate(http_requests_total{job="payment-api"}[5m])) > 0.01`}
                       </div>
                    </div>
                 </div>
               ) : (
                 <div className="text-center py-6">
                    <Info size={32} className="mx-auto text-ois-text-subtle mb-3" />
                    <p className="text-sm font-medium text-ois-text-muted">No specific rule metadata available for this event ID.</p>
                 </div>
               )}
            </CardBody>
          </Card>

          {/* Linked Incident Card */}
          <Card className="border-ois-border">
             <CardHeader className="bg-ois-surface-muted/30 border-b border-ois-border px-5 py-4">
                <h3 className="text-sm font-bold text-ois-text flex items-center gap-2 leading-none">
                   <AlertTriangle size={16} className="text-ois-danger" /> Linked Incident
                </h3>
             </CardHeader>
             <CardBody className="p-5">
                {incident ? (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                     <div className="flex items-center gap-4">
                        <div className="p-4 bg-ois-danger-pale rounded-xl border border-ois-danger/10">
                           <AlertTriangle size={24} className="text-ois-danger" />
                        </div>
                        <div>
                           <p className="text-xs font-mono font-bold text-ois-danger mb-1">{incident.id}</p>
                           <h4 className="text-base font-bold text-ois-text mb-2 truncate max-w-[300px]">{incident.title}</h4>
                           <div className="flex flex-wrap gap-4">
                              <span className="flex items-center gap-1.5 text-xs font-medium text-ois-text-muted">
                                 <User size={12} /> Assignee: <span className="font-bold text-ois-text">{mockUsers.find(u => u.id === incident.assigneeId)?.name || 'Unassigned'}</span>
                              </span>
                              <span className="flex items-center gap-1.5 text-xs font-medium text-ois-text-muted">
                                 <Clock size={12} /> Created: {formatDistanceToNow(parseISO(incident.createdAt))} ago
                              </span>
                           </div>
                        </div>
                     </div>
                     <Link to={`/incidents/${incident.publicId}`}>
                        <Button variant="primary" className="h-10 px-6 font-bold gap-2">
                           Open incident <ExternalLink size={16} />
                        </Button>
                     </Link>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-6 bg-ois-bg/30 rounded-lg border-2 border-dashed border-ois-border">
                     <p className="text-sm font-medium text-ois-text-muted mb-4 text-center max-w-sm">
                        This event is currently an isolated alert. Link it to an incident to track operational response.
                     </p>
                     <Button variant="outline" className="h-10 px-6 font-bold gap-2 bg-white border-ois-border-strong text-ois-danger hover:bg-ois-danger-pale">
                        <AlertTriangle size={16} /> Create Incident from alert
                     </Button>
                  </div>
                )}
             </CardBody>
          </Card>

          {/* Related Events Card */}
          <Card className="border-ois-border">
             <CardHeader className="bg-ois-surface-muted/30 border-b border-ois-border px-5 py-4">
                <h3 className="text-sm font-bold text-ois-text flex items-center gap-2 leading-none">
                   <Layers size={16} className="text-ois-primary" /> Related Events
                </h3>
             </CardHeader>
             <CardBody className="p-0">
                <div className="p-4 bg-ois-primary-pale border-b border-ois-border">
                   <p className="text-xs font-bold text-ois-primary flex items-center gap-2">
                      <BarChart2 size={14} /> Showing {relatedEvents.length} events grouped under correlationKey: "{event.correlationKey}"
                   </p>
                </div>
                <div className="divide-y divide-ois-border">
                   {relatedEvents.slice(0, 5).map(e => (
                      <div 
                        key={e.id} 
                        className={cn(
                          "p-4 flex items-center justify-between gap-4 transition-colors",
                          e.id === event.id ? "bg-ois-bg" : "hover:bg-ois-surface-muted/30"
                        )}
                      >
                         <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              e.severity === 'P1' ? 'bg-ois-danger' : e.severity === 'P2' ? 'bg-ois-warning' : 'bg-slate-300'
                            )} />
                            <div>
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold text-ois-text-subtle uppercase">{e.publicId}</span>
                                  {e.id === event.id && <Badge variant="neutral" className="text-[9px] bg-ois-primary text-white border-none py-0 px-1.5 h-4">THIS EVENT</Badge>}
                               </div>
                               <p className={cn("text-xs font-bold", e.id === event.id ? "text-ois-primary" : "text-ois-text")}>{e.title}</p>
                            </div>
                         </div>
                         <span className="text-[11px] font-medium text-ois-text-subtle whitespace-nowrap">{formatDistanceToNow(parseISO(e.firedAt))} ago</span>
                      </div>
                   ))}
                </div>
                {relatedEvents.length > 5 && (
                  <div className="p-3 text-center border-t border-ois-border">
                     <Button variant="ghost" size="sm" className="text-[11px] font-bold text-ois-text-muted">
                        Show {relatedEvents.length - 5} more events
                     </Button>
                  </div>
                )}
             </CardBody>
          </Card>
        </div>

        {/* Right Column — Timeline & Raw Data (40%) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Event Timeline Card */}
          <Card className="border-ois-border">
             <CardHeader className="bg-ois-surface-muted/30 border-b border-ois-border px-5 py-4">
                <h3 className="text-sm font-bold text-ois-text flex items-center gap-2 leading-none">
                   <History size={16} className="text-ois-primary" /> Event Timeline
                </h3>
             </CardHeader>
             <CardBody className="p-6">
                <EventTimeline entries={timelineEvents} />

                <form onSubmit={handleAddComment} className="mt-8 pt-6 border-t border-ois-border">
                   <div className="relative">
                      <MessageSquare className="absolute left-3 top-3 text-ois-text-subtle" size={16} />
                      <textarea 
                        className="w-full bg-ois-bg border border-ois-border-strong rounded-lg p-2.5 pl-10 text-xs focus:ring-2 focus:ring-ois-primary/20 focus:border-ois-primary outline-none transition-all placeholder:text-ois-text-subtle"
                        placeholder="Add a comment or internal note..."
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                      />
                   </div>
                   <div className="flex justify-end mt-2">
                      <Button type="submit" variant="primary" size="sm" className="h-8 font-bold text-[11px] px-4">
                         Post comment
                      </Button>
                   </div>
                </form>
             </CardBody>
          </Card>

          {/* Raw Payload Card */}
          <Card className="border-ois-border overflow-hidden">
             <div 
               role="button"
               tabIndex={0}
               className="w-full bg-ois-surface-muted/30 border-b border-ois-border px-5 py-4 flex items-center justify-between hover:bg-ois-surface-muted/50 transition-colors cursor-pointer"
               onClick={() => setShowRawPayload(!showRawPayload)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' || e.key === ' ') {
                   e.preventDefault();
                   setShowRawPayload(!showRawPayload);
                 }
               }}
             >
                <div className="flex items-center gap-2">
                   <FileJson size={16} className="text-ois-primary" />
                   <h3 className="text-sm font-bold text-ois-text">Raw event payload</h3>
                </div>
                <div className="flex items-center gap-3">
                   <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-ois-primary p-0 hover:bg-transparent" onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(JSON.stringify(event.payload, null, 2));
                   }}>
                      <Copy size={12} className="mr-1.5" /> Copy JSON
                   </Button>
                   {showRawPayload ? <ChevronUp size={16} className="text-ois-text-subtle" /> : <ChevronDown size={16} className="text-ois-text-subtle" />}
                </div>
             </div>
             {showRawPayload && (
               <CardBody className="p-0">
                  <div className="bg-slate-900 overflow-auto max-h-[400px]">
                     <pre className="p-5 font-mono text-xs text-blue-300 leading-relaxed">
                        {JSON.stringify(event.payload, null, 2)}
                     </pre>
                  </div>
               </CardBody>
             )}
          </Card>

          {/* Tags Card */}
          <Card className="p-5 border-ois-border">
             <h3 className="text-xs font-bold text-ois-text-subtle uppercase mb-4 tracking-widest flex items-center gap-2">
                <Layers size={14} /> Tags & Metadata
             </h3>
             <div className="flex flex-wrap gap-2">
                {event.tags.map(tag => (
                   <Badge key={tag} variant="neutral" className="bg-white text-ois-text-muted border-ois-border hover:bg-ois-bg transition-colors font-bold text-[10px] py-1 px-2.5">
                      {tag}
                   </Badge>
                ))}
                <Button variant="ghost" size="sm" className="h-6 p-1 border border-dashed border-ois-border rounded text-[10px] font-bold text-ois-text-subtle">
                   + Add tag
                </Button>
             </div>
          </Card>
        </div>
      </div>

      {resolveModalOpen && event.linkedIncidentId && (
        <ResolveEventModal
          linkedIncidentId={event.linkedIncidentId}
          onResolveOnly={() => {
            setEvent({ ...event, status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: 'Sarah Chen' });
            setResolveModalOpen(false);
          }}
          onResolveAndOpen={() => {
            setEvent({ ...event, status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: 'Sarah Chen' });
            setResolveModalOpen(false);
            navigate(`/incidents/${event.linkedIncidentId}`);
          }}
          onClose={() => setResolveModalOpen(false)}
        />
      )}
    </div>
  );
};
