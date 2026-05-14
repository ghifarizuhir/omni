import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, ShoppingBag, ClipboardList, BookOpen, MessageCircle,
  ArrowRight, ArrowUpRight, Clock, CheckCircle2, Circle,
  X, Phone, Mail, ChevronRight, Star, Zap, Shield,
  Users, Database, Laptop, Package, Key, Monitor,
  BookMarked, AlertCircle, Eye, ThumbsUp, Send, Loader2,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { formatRelative } from '@/src/lib/format';
import { useAuthSession } from '@/src/lib/auth/session';
import { requestsService, knowledgeService, useResource } from '@/src/services';
import { RequestStatus, WorkflowStepStatus } from '@/src/types/request';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_META: Record<RequestStatus, { label: string; dot: string; text: string }> = {
  draft:          { label: 'Draft',          dot: 'bg-ois-text-subtle',    text: 'text-ois-text-muted' },
  submitted:      { label: 'Submitted',      dot: 'bg-ois-info',           text: 'text-ois-info' },
  approved:       { label: 'Approved',       dot: 'bg-ois-success',        text: 'text-ois-success' },
  in_fulfillment: { label: 'In Fulfillment', dot: 'bg-ois-warning',        text: 'text-ois-warning' },
  pending_user:   { label: 'Pending You',    dot: 'bg-purple-500',         text: 'text-purple-600' },
  fulfilled:      { label: 'Fulfilled',      dot: 'bg-ois-success',        text: 'text-ois-success' },
  closed:         { label: 'Closed',         dot: 'bg-ois-text-subtle',    text: 'text-ois-text-muted' },
  rejected:       { label: 'Rejected',       dot: 'bg-ois-danger',         text: 'text-ois-danger' },
  cancelled:      { label: 'Cancelled',      dot: 'bg-ois-text-subtle',    text: 'text-ois-text-muted' },
};

function getLucideIcon(name: string, size = 18, className = '') {
  const Icon = (LucideIcons as Record<string, React.FC<{ size?: number; className?: string }>>)[name];
  if (!Icon) return <Package size={size} className={className} />;
  return <Icon size={size} className={className} />;
}

function getActiveStepLabel(steps: { status: WorkflowStepStatus; name: string; assigneeName?: string }[]) {
  const active = steps.find(s => s.status === 'active');
  if (!active) return null;
  if (active.assigneeName) return `${active.name} · ${active.assigneeName}`;
  return active.name;
}

// ── Mini workflow stepper ─────────────────────────────────────────────────────

interface MiniStepperProps {
  steps: { name: string; status: WorkflowStepStatus }[];
}

const MiniStepper: React.FC<MiniStepperProps> = ({ steps }) => (
  <div className="flex items-center gap-0.5 mt-3 flex-wrap">
    {steps.map((step, i) => (
      <React.Fragment key={step.name}>
        <div className="flex flex-col items-center gap-1">
          <div className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all',
            step.status === 'completed' && 'bg-ois-success text-white',
            step.status === 'active' && 'bg-ois-primary text-white ring-2 ring-ois-primary/30',
            step.status === 'pending' && 'bg-ois-surface border-2 border-ois-border-strong text-ois-text-subtle',
            step.status === 'rejected' && 'bg-ois-danger text-white',
            step.status === 'skipped' && 'bg-ois-border text-ois-text-subtle',
          )}>
            {step.status === 'completed' ? '✓' : step.status === 'rejected' ? '✗' : i + 1}
          </div>
          <span className={cn(
            'text-[9px] font-medium max-w-[52px] text-center leading-tight',
            step.status === 'active' ? 'text-ois-primary' : 'text-ois-text-subtle',
          )}>
            {step.name.length > 10 ? step.name.slice(0, 9) + '…' : step.name}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div className={cn(
            'h-px flex-1 min-w-[12px] max-w-[32px] mb-4 mx-0.5 transition-all',
            step.status === 'completed' ? 'bg-ois-success' : 'bg-ois-border-strong',
          )} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ── Popular searches ──────────────────────────────────────────────────────────

const POPULAR_SEARCHES = ['laptop', 'github access', 'vpn', 'slack channel', 'password reset'];

// ── Recommended articles (top 3 by viewCount, payment-related) ───────────────

const RECOMMENDED_SLUGS = [
  'payment-api-restart-procedure',
  'db-read-access-best-practices',
  'troubleshooting-payment-api-5xx-errors',
];

// ── Service Desk Chat Modal ───────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  text: string;
  timestamp: string;
}

const AGENT_NAME = 'Riley · Service Desk';

const agentGreeting = (firstName: string): string =>
  `Hi ${firstName}! I'm Riley from the Service Desk. What can I help you with today?`;

function generateAgentReply(userText: string): string {
  const t = userText.toLowerCase();
  if (/password|reset|login/.test(t)) {
    return 'For password resets, you can use the self-service portal at /portal/catalog → "Password reset". If that doesn\'t work, I can open a ticket for you — just confirm your username.';
  }
  if (/laptop|hardware|equipment/.test(t)) {
    return 'Hardware requests go through the catalog. Want me to start a request for you? Let me know which model you need.';
  }
  if (/vpn|access|github|slack/.test(t)) {
    return 'Access requests are typically fulfilled within 1 business day. I can route this to the appropriate approver — what system do you need access to?';
  }
  if (/incident|down|broken|not working/.test(t)) {
    return 'That sounds like an incident. I\'m escalating to the on-call engineer. Could you share what error you\'re seeing and which service is affected?';
  }
  if (/thank|thanks|thx/i.test(t)) {
    return 'Happy to help! Is there anything else I can do for you?';
  }
  return 'Thanks for reaching out. I\'ll look into that and get back to you shortly. In the meantime, is there a ticket number I should reference?';
}

const ServiceDeskModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const session = useAuthSession();
  const firstName = session?.user.name.split(' ')[0] ?? 'there';
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'm-greet',
      role: 'agent',
      text: agentGreeting(firstName),
      timestamp: new Date().toISOString(),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [agentTyping, setAgentTyping] = useState(false);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => { if (replyTimer.current) clearTimeout(replyTimer.current); };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, agentTyping]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    const userMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setDraft('');
    setAgentTyping(true);
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      const reply: ChatMessage = {
        id: `m-${Date.now()}-r`,
        role: 'agent',
        text: generateAgentReply(text),
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, reply]);
      setAgentTyping(false);
    }, 900 + Math.random() * 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ois-surface rounded-ois-modal shadow-ois-modal w-full max-w-md h-[560px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-ois-border">
          <div className="relative w-10 h-10 rounded-full bg-ois-primary-pale flex items-center justify-center shrink-0">
            <MessageCircle size={18} className="text-ois-primary" />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-ois-success border-2 border-ois-surface" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-ois-text">{AGENT_NAME}</div>
            <div className="text-[11px] text-ois-success font-medium">Online · typically replies in &lt; 2 min</div>
          </div>
          <div className="flex items-center gap-1">
            <a
              href="tel:+14357"
              className="text-ois-text-subtle hover:text-ois-text p-1.5 rounded-md hover:bg-ois-surface-muted"
              title="Call ext. 4357"
            >
              <Phone size={15} />
            </a>
            <a
              href="mailto:itservicedesk@acme.io"
              className="text-ois-text-subtle hover:text-ois-text p-1.5 rounded-md hover:bg-ois-surface-muted"
              title="Email"
            >
              <Mail size={15} />
            </a>
            <button
              onClick={onClose}
              className="text-ois-text-subtle hover:text-ois-text p-1.5 rounded-md hover:bg-ois-surface-muted"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-ois-bg/50">
          {messages.map(m => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-snug shadow-sm',
                  isUser
                    ? 'bg-ois-primary text-white rounded-br-md'
                    : 'bg-white text-ois-text border border-ois-border rounded-bl-md',
                )}>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  <p className={cn(
                    'text-[10px] mt-1',
                    isUser ? 'text-white/70' : 'text-ois-text-subtle',
                  )}>
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          {agentTyping && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md px-3.5 py-2 bg-white border border-ois-border text-ois-text-muted text-xs flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" />
                Riley is typing…
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={e => { e.preventDefault(); handleSend(); }}
          className="border-t border-ois-border bg-ois-surface p-3 flex items-end gap-2"
        >
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            rows={1}
            placeholder="Type your message…"
            className="flex-1 resize-none rounded-lg border border-ois-border px-3 py-2 text-sm text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:ring-2 focus:ring-ois-primary/30 focus:border-ois-primary max-h-32"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="h-9 w-9 shrink-0 rounded-lg bg-ois-primary text-white flex items-center justify-center hover:bg-ois-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

export const PortalHome: React.FC = () => {
  const navigate = useNavigate();
  const session = useAuthSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [chatModalOpen, setChatModalOpen] = useState(false);

  const { data: requestsData } = useResource(() => requestsService.list(), []);
  const { data: catalogData } = useResource(() => requestsService.catalog(), []);
  const { data: articlesData } = useResource(() => knowledgeService.articles(), []);
  const mockServiceRequests = requestsData ?? [];
  const mockCatalogItems = catalogData ?? [];
  const mockKBArticles = articlesData ?? [];

  const myRequests = useMemo(
    () => mockServiceRequests.filter(r => r.requesterId === session?.user.id && !['closed', 'cancelled'].includes(r.status)),
    [mockServiceRequests, session?.user.id]
  );
  const activeRequests = myRequests.filter(r => !['fulfilled', 'closed', 'cancelled', 'rejected'].includes(r.status)).slice(0, 3);

  const popularItems = useMemo(
    () => [...mockCatalogItems].sort((a, b) => b.popularity - a.popularity).slice(0, 6),
    [mockCatalogItems]
  );

  const recommendedArticles = useMemo(
    () => mockKBArticles.filter(a => RECOMMENDED_SLUGS.includes(a.slug)),
    [mockKBArticles]
  );

  const handleSearch = (q: string) => {
    if (q.trim()) {
      navigate(`/portal/catalog?q=${encodeURIComponent(q.trim())}`);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full pb-16">
      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section
        className="relative -mx-6 -mt-6 px-6 pt-12 pb-10 overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E9FF 40%, #F0F7FF 100%)',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-ois-primary/5 pointer-events-none" />
        <div className="absolute top-4 right-32 w-32 h-32 rounded-full bg-ois-primary/4 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-ois-info/6 pointer-events-none" />

        <div className="relative max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-extrabold text-ois-text tracking-tight mb-1">
            What can we help you with today,{' '}
            <span className="text-ois-primary">{session?.user.name.split(' ')[0] ?? 'there'}</span>?
          </h1>
          <p className="text-sm text-ois-text-muted mb-7">
            Request services, find answers, or track your open items.
          </p>

          {/* Search bar */}
          <form
            onSubmit={e => { e.preventDefault(); handleSearch(searchQuery); }}
            className="relative"
          >
            <div className="flex items-center bg-white rounded-xl shadow-ois-modal border border-ois-border overflow-hidden transition-all focus-within:ring-2 focus-within:ring-ois-primary/25 focus-within:border-ois-primary">
              <Search size={18} className="ml-4 shrink-0 text-ois-text-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search the catalog or knowledge base…"
                className="flex-1 px-3 py-3.5 text-sm bg-transparent outline-none text-ois-text placeholder:text-ois-text-subtle"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mr-2 p-1.5 rounded-md text-ois-text-subtle hover:text-ois-text hover:bg-ois-surface-muted transition-colors"
                >
                  <X size={14} />
                </button>
              )}
              <button
                type="submit"
                className="mr-2 px-4 py-2 rounded-lg bg-ois-primary text-white text-sm font-semibold hover:bg-ois-primary-hover transition-colors active:scale-95"
              >
                Search
              </button>
            </div>
          </form>

          {/* Popular tags */}
          <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
            <span className="text-xs text-ois-text-muted font-medium">Popular:</span>
            {POPULAR_SEARCHES.map(tag => (
              <button
                key={tag}
                onClick={() => handleSearch(tag)}
                className="text-xs px-2.5 py-1 rounded-full bg-white/80 border border-ois-border text-ois-text-muted hover:text-ois-primary hover:border-ois-primary/40 hover:bg-white transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUICK ACTIONS ───────────────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: ShoppingBag,
              title: 'Browse Catalog',
              desc: 'Request services & equipment',
              sub: 'Access, hardware, software…',
              href: '/portal/catalog',
              color: 'text-ois-primary',
              bg: 'bg-ois-primary-pale',
              border: 'hover:border-ois-primary/40',
            },
            {
              icon: ClipboardList,
              title: 'My Requests',
              desc: 'Track status of your items',
              sub: `${myRequests.length > 0 ? myRequests.length + ' open' : 'No open'} items`,
              href: '/portal/my-requests',
              color: 'text-ois-warning',
              bg: 'bg-ois-warning-pale',
              border: 'hover:border-[#F79009]/40',
            },
            {
              icon: BookOpen,
              title: 'Knowledge Base',
              desc: 'Find articles & runbooks',
              sub: '12 articles available',
              href: '/kb',
              color: 'text-ois-success',
              bg: 'bg-ois-success-pale',
              border: 'hover:border-ois-success/40',
            },
            {
              icon: MessageCircle,
              title: 'Talk to Service Desk',
              desc: 'Live chat during business hours',
              sub: 'Mon–Fri 8am–6pm UTC',
              href: null,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
              border: 'hover:border-purple-300',
            },
          ].map(item => {
            const content = (
              <div className={cn(
                'group relative bg-ois-surface rounded-ois-card border border-ois-border shadow-ois-card',
                'flex flex-col p-5 gap-3 cursor-pointer',
                'hover:shadow-ois-card-hover hover:-translate-y-0.5 transition-all duration-150',
                item.border,
              )}>
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', item.bg)}>
                  <item.icon size={20} className={item.color} />
                </div>
                <div>
                  <div className="text-sm font-bold text-ois-text group-hover:text-ois-primary transition-colors leading-tight">
                    {item.title}
                  </div>
                  <div className="text-xs text-ois-text-muted mt-0.5 leading-snug">{item.desc}</div>
                </div>
                <div className="text-[11px] text-ois-text-subtle mt-auto pt-2 border-t border-ois-border">
                  {item.sub}
                </div>
                <ArrowRight
                  size={14}
                  className={cn(
                    'absolute top-5 right-4 opacity-0 group-hover:opacity-100 transition-all',
                    '-translate-x-1 group-hover:translate-x-0',
                    item.color,
                  )}
                />
              </div>
            );

            return item.href ? (
              <Link key={item.title} to={item.href}>
                {content}
              </Link>
            ) : (
              <div key={item.title} onClick={() => setChatModalOpen(true)}>
                {content}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── YOUR ACTIVITY ───────────────────────────────────────────────────── */}
      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Active requests */}
        <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-ois-border">
            <div className="flex items-center gap-2">
              <ClipboardList size={15} className="text-ois-primary" />
              <span className="text-xs font-bold text-ois-text uppercase tracking-widest">Your active requests</span>
              {activeRequests.length > 0 && (
                <span className="text-[10px] font-bold bg-ois-primary text-white px-1.5 py-0.5 rounded-full leading-none">
                  {activeRequests.length}
                </span>
              )}
            </div>
            <Link
              to="/portal/my-requests"
              className="text-xs font-semibold text-ois-primary hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={11} />
            </Link>
          </div>

          {activeRequests.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 size={28} className="text-ois-success mx-auto mb-2 opacity-60" />
              <p className="text-sm text-ois-text-muted">No active requests.</p>
              <Link to="/portal/catalog" className="text-xs text-ois-primary font-semibold hover:underline mt-1 inline-block">
                + Browse catalog
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-ois-border">
              {activeRequests.map(req => {
                const meta = STATUS_META[req.status];
                const activeStep = getActiveStepLabel(req.workflow.steps);
                return (
                  <Link
                    key={req.id}
                    to={`/requests/${req.id}`}
                    className="block px-5 py-4 hover:bg-ois-surface-muted transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', meta.dot)} />
                        <span className={cn('text-[11px] font-semibold', meta.text)}>{meta.label}</span>
                        <span className="font-mono text-[10px] text-ois-text-subtle">{req.publicId}</span>
                      </div>
                      <ChevronRight size={13} className="text-ois-text-subtle shrink-0 group-hover:text-ois-primary transition-colors mt-0.5" />
                    </div>
                    <div className="text-sm font-semibold text-ois-text leading-snug">{req.title}</div>
                    {activeStep && (
                      <div className="text-xs text-ois-text-muted mt-1 flex items-center gap-1">
                        <Clock size={10} className="shrink-0" />
                        {activeStep}
                      </div>
                    )}
                    <MiniStepper steps={req.workflow.steps} />
                    <div className="text-[10px] text-ois-text-subtle mt-2">
                      {req.submittedAt && `Started ${formatRelative(req.submittedAt)}`}
                      {req.estimatedCompletion && ` · Est. ${new Date(req.estimatedCompletion).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recommended articles */}
        <div className="bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-ois-border">
            <div className="flex items-center gap-2">
              <BookMarked size={15} className="text-ois-success" />
              <span className="text-xs font-bold text-ois-text uppercase tracking-widest">Articles for you</span>
            </div>
            <Link
              to="/kb"
              className="text-xs font-semibold text-ois-primary hover:underline flex items-center gap-1"
            >
              Browse KB <ArrowRight size={11} />
            </Link>
          </div>
          <div className="px-5 py-3">
            <p className="text-[11px] text-ois-text-subtle mb-3">Recommended based on your role and recent activity</p>
            <div className="space-y-1">
              {recommendedArticles.map(article => (
                <Link
                  key={article.id}
                  to={`/kb/${article.slug}`}
                  className="flex items-start gap-3 py-3 px-3 -mx-3 rounded-lg hover:bg-ois-surface-muted transition-colors group"
                >
                  <div className="w-7 h-7 rounded-md bg-ois-success-pale flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen size={13} className="text-ois-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ois-text group-hover:text-ois-primary transition-colors leading-snug line-clamp-2">
                      {article.title}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[10px] text-ois-text-subtle">
                        <Eye size={9} />{article.viewCount.toLocaleString()} views
                      </span>
                      {article.helpfulCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-ois-text-subtle">
                          <ThumbsUp size={9} />
                          {Math.round((article.helpfulCount / (article.helpfulCount + article.unhelpfulCount)) * 100)}% helpful
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight size={13} className="text-ois-text-subtle shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── POPULAR CATALOG ITEMS ───────────────────────────────────────────── */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-ois-text">Popular requests</h2>
            <p className="text-xs text-ois-text-muted mt-0.5">Most requested items in the last 30 days</p>
          </div>
          <Link
            to="/portal/catalog"
            className="text-xs font-semibold text-ois-primary hover:underline flex items-center gap-1"
          >
            View all 12 items <ArrowRight size={11} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {popularItems.map(item => (
            <Link
              key={item.id}
              to={`/portal/catalog/${item.id}`}
              className="group bg-ois-surface border border-ois-border rounded-ois-card shadow-ois-card p-4 flex flex-col items-center text-center gap-2 hover:shadow-ois-card-hover hover:-translate-y-0.5 hover:border-ois-primary/30 transition-all duration-150"
            >
              <div className="w-10 h-10 rounded-xl bg-ois-primary-pale flex items-center justify-center">
                {getLucideIcon(item.iconName, 20, 'text-ois-primary')}
              </div>
              <div>
                <div className="text-xs font-bold text-ois-text group-hover:text-ois-primary transition-colors leading-snug">
                  {item.name}
                </div>
                <div className="text-[10px] text-ois-text-subtle mt-1 flex items-center justify-center gap-1">
                  <Clock size={9} />
                  {item.estimatedFulfillmentDays === 0
                    ? 'Same day'
                    : `~${item.estimatedFulfillmentDays}d`}
                </div>
              </div>
              <span className="text-[10px] font-semibold text-ois-primary group-hover:underline mt-auto">
                Request →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="mt-12 pt-6 border-t border-ois-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-ois-text">Need urgent help?</p>
            <p className="text-xs text-ois-text-muted mt-0.5">
              Call the IT Service Desk:{' '}
              <a href="tel:+14357" className="text-ois-primary hover:underline font-medium">ext. 4357</a>
              {' '}·{' '}
              <a href="mailto:itservicedesk@acme.io" className="text-ois-primary hover:underline font-medium">itservicedesk@acme.io</a>
            </p>
          </div>
          <p className="text-[11px] text-ois-text-subtle">
            Hours: Mon–Fri 8am–6pm UTC · After hours: emergency only
          </p>
        </div>
      </footer>

      {/* ── Service Desk Modal ──────────────────────────────────────────────── */}
      {chatModalOpen && <ServiceDeskModal onClose={() => setChatModalOpen(false)} />}
    </div>
  );
};
