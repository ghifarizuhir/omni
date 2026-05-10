import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  X,
  ArrowUpRight,
  MapPin,
  Server,
  BookOpen,
  AlertTriangle,
  GitPullRequest,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AiDomain, AiMessage, AiDraftCIPayload, AiDraftKBPayload, AiQueryResultCIPayload, AiQueryResultTextPayload } from '@/src/types/ai';
import { AiAvatar } from './AiAvatar';
import { AiMessageBubble } from './AiMessageBubble';
import { AiUserMessage } from './AiUserMessage';
import { AiInputBar } from './AiInputBar';
import { AiEmptyState } from './AiEmptyState';
import { AiDraftCICard } from './AiDraftCICard';
import { AiDraftKBCard } from './AiDraftKBCard';
import { AiDraftPlaceholder } from './AiDraftPlaceholder';
import { AiQueryResultCI } from './AiQueryResultCI';
import { AiQueryResultText } from './AiQueryResultText';
import { getDomainLabel } from './utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AiQuickPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Domain helpers ──────────────────────────────────────────────────────────

const detectDomain = (pathname: string): AiDomain => {
  if (pathname.startsWith('/cmdb')) return 'cmdb';
  if (pathname.startsWith('/kb')) return 'knowledge_base';
  if (pathname.startsWith('/incidents')) return 'incident';
  if (pathname.startsWith('/problems')) return 'problem';
  if (pathname.startsWith('/changes')) return 'change';
  return 'all';
};

interface DomainMeta {
  icon: React.ElementType;
  badgeBg: string;
  badgeText: string;
}

const domainMeta: Record<AiDomain, DomainMeta> = {
  cmdb: {
    icon: Server,
    badgeBg: 'rgba(31,79,212,0.1)',
    badgeText: '#185FA5',
  },
  knowledge_base: {
    icon: BookOpen,
    badgeBg: 'rgba(88,40,220,0.1)',
    badgeText: '#6927DA',
  },
  incident: {
    icon: AlertTriangle,
    badgeBg: 'rgba(240,68,56,0.1)',
    badgeText: '#D92D20',
  },
  problem: {
    icon: AlertTriangle,
    badgeBg: 'rgba(240,68,56,0.1)',
    badgeText: '#D92D20',
  },
  change: {
    icon: GitPullRequest,
    badgeBg: 'rgba(102,112,133,0.1)',
    badgeText: 'var(--color-ois-text-muted)',
  },
  all: {
    icon: Layers,
    badgeBg: 'rgba(102,112,133,0.08)',
    badgeText: 'var(--color-ois-text-muted)',
  },
};

const DOMAIN_OPTIONS: AiDomain[] = ['all', 'cmdb', 'knowledge_base', 'incident', 'problem', 'change'];

// ─── Mock AI response ────────────────────────────────────────────────────────

const getMockAiResponse = (userMessage: string, domain: AiDomain): AiMessage => {
  const id = `quick-${Date.now()}`;
  const sessionId = 'quick-panel';
  const createdAt = new Date().toISOString();

  if (['incident', 'problem', 'change'].includes(domain)) {
    return { id, sessionId, role: 'ai', contentType: 'draft_placeholder', createdAt };
  }
  if (domain === 'cmdb' && /tambah|buat|create|add/i.test(userMessage)) {
    return {
      id,
      sessionId,
      role: 'ai',
      text: 'Saya draft CI baru berdasarkan permintaan kamu:',
      contentType: 'draft_ci',
      contentPayload: {
        kind: 'draft_ci',
        draftStatus: 'pending',
        publicId: `CI-SRV-NEW-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}`,
        name: 'new-server',
        type: 'server',
        status: 'planned',
        environment: 'production',
        criticality: 'medium',
        ownerTeamId: 't-infra',
        tags: ['draft', 'pending'],
        attributes: {
          kind: 'server',
          region: 'ap-southeast-1',
          provider: 'aws',
          os: 'Ubuntu 22.04 LTS',
          cpuCores: 4,
          memoryGb: 16,
          diskGb: 100,
          ipAddress: '',
          hostname: 'new-server',
        },
        relationships: [],
        pendingSuggestions: [],
      } as AiDraftCIPayload,
      createdAt,
    };
  }
  if (domain === 'knowledge_base' && /buat|draft|tulis|write/i.test(userMessage)) {
    return {
      id,
      sessionId,
      role: 'ai',
      text: 'Berikut draft KB article-nya:',
      contentType: 'draft_kb',
      contentPayload: {
        kind: 'draft_kb',
        draftStatus: 'pending',
        title: 'Draft Article',
        category: 'Troubleshooting',
        tags: ['draft'],
        relatedCiPublicIds: [],
        sections: [
          { heading: 'Symptoms', body: 'Describe the symptoms here.' },
          { heading: 'Resolution Steps', body: '1. Step one\n2. Step two\n3. Step three' },
        ],
        pendingSuggestions: [],
      } as AiDraftKBPayload,
      createdAt,
    };
  }
  return {
    id,
    sessionId,
    role: 'ai',
    text: 'Saya memproses permintaan kamu. (Mode demo — response aktual tersedia setelah AI backend terhubung.)',
    contentType: 'text',
    createdAt,
  };
};

// ─── Component ───────────────────────────────────────────────────────────────

export const AiQuickPanel: React.FC<AiQuickPanelProps> = ({ isOpen: _isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [domain, setDomain] = useState<AiDomain>(() => detectDomain(location.pathname));
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-detect domain from route on mount
  useEffect(() => {
    setDomain(detectDomain(location.pathname));
  }, [location.pathname]);

  // Auto-scroll when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDomainDropdownOpen(false);
      }
    };
    if (domainDropdownOpen) {
      document.addEventListener('mousedown', handleOutside);
    }
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [domainDropdownOpen]);

  const handleSend = (text: string) => {
    const userMsg: AiMessage = {
      id: `user-${Date.now()}`,
      sessionId: 'quick-panel',
      role: 'user',
      text,
      contentType: 'text',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const aiMsg = getMockAiResponse(text, domain);
      setMessages((prev) => [...prev, aiMsg]);
    }, 800);
  };

  const handleSuggestionClick = (text: string) => {
    handleSend(text);
  };

  const updateMessageDraftStatus = (msgId: string, status: 'confirmed' | 'cancelled') => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        if (!m.contentPayload) return m;
        return {
          ...m,
          contentPayload: {
            ...m.contentPayload,
            draftStatus: status,
          },
        };
      })
    );
  };

  const meta = domainMeta[domain];
  const DomainIcon = meta.icon;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/20 z-[59]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed right-0 top-0 h-full w-[320px] z-[60] bg-ois-surface border-l border-ois-border flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
      >
        {/* Topbar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-ois-border flex-shrink-0">
          <AiAvatar />
          <span className="text-[13px] font-semibold text-ois-text flex-1 min-w-0 truncate">
            AI Quick Assist
          </span>
          <button
            type="button"
            onClick={() => { navigate('/ai'); onClose(); }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-ois-text-muted hover:bg-white/5 hover:text-ois-text transition-colors"
            aria-label="Buka di Workspace"
          >
            <ArrowUpRight size={13} />
            <span>Buka di Workspace</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded hover:bg-white/5 text-ois-text-muted hover:text-ois-text transition-colors"
            aria-label="Tutup panel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Context Bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-ois-border flex-shrink-0 relative" ref={dropdownRef}>
          <MapPin size={12} className="text-ois-text-subtle flex-shrink-0" />
          <span className="text-[11px] text-ois-text-subtle">Konteks:</span>

          {/* Domain badge */}
          <span
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium"
            style={{ backgroundColor: meta.badgeBg, color: meta.badgeText }}
          >
            <DomainIcon size={11} />
            {getDomainLabel(domain)}
          </span>

          <button
            type="button"
            onClick={() => setDomainDropdownOpen((v) => !v)}
            className={cn(
              'ml-auto flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px]',
              'text-ois-text-muted hover:bg-white/5 hover:text-ois-text transition-colors'
            )}
          >
            Ganti
            <ChevronDown size={11} className={cn('transition-transform', domainDropdownOpen && 'rotate-180')} />
          </button>

          {/* Domain dropdown */}
          {domainDropdownOpen && (
            <div
              className="absolute top-full left-0 right-0 z-10 mt-1 mx-2 rounded-lg border border-ois-border bg-ois-surface shadow-lg overflow-hidden"
            >
              {DOMAIN_OPTIONS.map((d) => {
                const dm = domainMeta[d];
                const Icon = dm.icon;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => { setDomain(d); setDomainDropdownOpen(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left text-[12px]',
                      'hover:bg-white/5 transition-colors',
                      d === domain ? 'text-ois-text' : 'text-ois-text-muted'
                    )}
                  >
                    <Icon size={13} style={{ color: dm.badgeText }} />
                    {getDomainLabel(d)}
                    {d === domain && (
                      <span className="ml-auto text-[10px] text-ois-text-subtle">aktif</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {messages.length === 0 ? (
            <AiEmptyState domain={domain} onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="flex flex-col gap-4 px-3 py-3">
              {messages.map((msg) => {
                if (msg.role === 'user') {
                  return (
                    <AiUserMessage
                      key={msg.id}
                      text={msg.text ?? ''}
                      timestamp={msg.createdAt}
                    />
                  );
                }

                // AI message
                return (
                  <AiMessageBubble
                    key={msg.id}
                    text={msg.text}
                    timestamp={msg.createdAt}
                  >
                    {msg.contentType === 'draft_ci' && msg.contentPayload && (
                      <AiDraftCICard
                        payload={msg.contentPayload as AiDraftCIPayload}
                        onConfirm={() => updateMessageDraftStatus(msg.id, 'confirmed')}
                        onCancel={() => updateMessageDraftStatus(msg.id, 'cancelled')}
                      />
                    )}
                    {msg.contentType === 'draft_kb' && msg.contentPayload && (
                      <AiDraftKBCard
                        payload={msg.contentPayload as AiDraftKBPayload}
                        onConfirm={() => updateMessageDraftStatus(msg.id, 'confirmed')}
                        onCancel={() => updateMessageDraftStatus(msg.id, 'cancelled')}
                      />
                    )}
                    {msg.contentType === 'draft_placeholder' && (
                      <AiDraftPlaceholder domain={domain} />
                    )}
                    {msg.contentType === 'query_result_ci' && msg.contentPayload && (
                      <AiQueryResultCI
                        payload={msg.contentPayload as AiQueryResultCIPayload}
                        onAnalyze={() => {}}
                      />
                    )}
                    {msg.contentType === 'query_result_text' && msg.contentPayload && (
                      <AiQueryResultText payload={msg.contentPayload as AiQueryResultTextPayload} />
                    )}
                  </AiMessageBubble>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* "Continue in Workspace" link */}
        {messages.length >= 1 && (
          <div className="px-3 pb-2 text-center flex-shrink-0">
            <Link
              to={`/ai?from=panel&domain=${domain}`}
              onClick={onClose}
              className="text-[11px] text-ois-primary hover:underline"
            >
              Sesi panjang? Lanjutkan di AI Workspace →
            </Link>
          </div>
        )}

        {/* Input Bar */}
        <div className="flex-shrink-0">
          <AiInputBar onSend={handleSend} />
        </div>
      </motion.div>
    </>
  );
};
