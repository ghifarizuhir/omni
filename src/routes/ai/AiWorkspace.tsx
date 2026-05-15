import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useLocation, useOutletContext } from 'react-router-dom';
import type {
  AiDomain,
  AiMessage,
  AiSession,
  AiDraftCIPayload,
  AiDraftKBPayload,
  AiDraftStatus,
} from '@/src/types/ai';
import { AiMessageBubble } from '@/src/components/ai/AiMessageBubble';
import { AiUserMessage } from '@/src/components/ai/AiUserMessage';
import { AiInputBar } from '@/src/components/ai/AiInputBar';
import { AiEmptyState } from '@/src/components/ai/AiEmptyState';
import { AiDraftCICard } from '@/src/components/ai/AiDraftCICard';
import { AiDraftKBCard } from '@/src/components/ai/AiDraftKBCard';
import { AiDraftPlaceholder } from '@/src/components/ai/AiDraftPlaceholder';
import { AiQueryResultCI } from '@/src/components/ai/AiQueryResultCI';
import { AiQueryResultText } from '@/src/components/ai/AiQueryResultText';
import { AiPendingDraftItem } from '@/src/components/ai/AiPendingDraftItem';
import { AiSidebarPanel } from '@/src/components/ai/AiSidebarPanel';
import { AiCompletenessPanel } from '@/src/components/ai/AiCompletenessPanel';
import { formatAiTime, getDomainLabel } from '@/src/components/ai/utils';
import { aiService, useResource } from '@/src/services';

// ─── Component ───────────────────────────────────────────────────────────────

export const AiWorkspace: React.FC = () => {
  const { sessionId } = useParams<{ sessionId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAiSidebarContent } = useOutletContext<{
    setAiSidebarContent: (node: React.ReactNode) => void;
  }>();

  const { data: sessionsData } = useResource(() => aiService.sessions(), []);
  const { data: activeSession0 } = useResource(() => aiService.activeSession(), []);
  const initialSessionId = sessionId ?? activeSession0?.id ?? 'ai-sess-001';

  const [activeDomain, setActiveDomain] = useState<AiDomain>('cmdb');
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>(initialSessionId);

  useEffect(() => {
    if (sessionsData) setSessions([...sessionsData]);
  }, [sessionsData]);

  useEffect(() => {
    if (!sessionId && activeSession0?.id) setActiveSessionId(activeSession0.id);
  }, [sessionId, activeSession0]);

  const bottomRef = useRef<HTMLDivElement>(null);


  // Sync with URL param :sessionId
  useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
      const session = sessions.find((s) => s.id === sessionId);
      if (session) setActiveDomain(session.domain);
    }
  }, [sessionId, sessions]);

  // Handle ?from=panel&domain=X query param on mount
  // intentionally runs once on mount; initialSessionId is stable from the render closure
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const from = params.get('from');
    const domainParam = params.get('domain') as AiDomain | null;
    if (from === 'panel' && domainParam) {
      setActiveDomain(domainParam);
      const welcomeMsg: AiMessage = {
        id: `welcome-${Date.now()}`,
        sessionId: initialSessionId,
        role: 'ai',
        text: 'Melanjutkan dari Quick Assist Panel.',
        contentType: 'text',
        createdAt: new Date().toISOString(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === initialSessionId
            ? { ...s, messages: [welcomeMsg, ...s.messages] }
            : s
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount


  // Inject AI session panel into AppShell's sidebar slot
  useEffect(() => {
    setAiSidebarContent(
      <AiSidebarPanel
        sessions={sessions}
        activeSessionId={activeSessionId}
        activeDomain={activeDomain}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewSession}
        onDomainChange={setActiveDomain}
      />
    );
  }, [sessions, activeSessionId, activeDomain]);

  // Clear sidebar slot on unmount
  useEffect(() => {
    return () => setAiSidebarContent(null);
  }, []);

  // Hydrate messages from API when the active session changes
  useEffect(() => {
    let cancelled = false;
    aiService.messages(activeSessionId).then((rows) => {
      if (cancelled) return;
      const mapped: AiMessage[] = rows.map((r) => ({
        id: r.id,
        sessionId: activeSessionId,
        role: r.role === 'assistant' ? 'ai' : 'user',
        text: r.body,
        contentType: 'text',
        createdAt: r.createdAt,
      }));
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId ? { ...s, messages: mapped } : s
        )
      );
    }).catch(() => {/* ignore – session may not exist on backend yet */});
    return () => { cancelled = true; };
  }, [activeSessionId]);

  // Auto-scroll to bottom when messages change
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const pendingDrafts = messages
    .filter(
      (m) =>
        (m.contentPayload?.kind === 'draft_ci' || m.contentPayload?.kind === 'draft_kb') &&
        m.contentPayload.draftStatus === 'pending'
    )
    .map((m) => ({
      msgId: m.id,
      payload: m.contentPayload as AiDraftCIPayload | AiDraftKBPayload,
    }));

  const confirmedDrafts = messages
    .filter(
      (m) =>
        (m.contentPayload?.kind === 'draft_ci' || m.contentPayload?.kind === 'draft_kb') &&
        m.contentPayload.draftStatus === 'confirmed'
    )
    .map((m) => ({
      msgId: m.id,
      payload: m.contentPayload as AiDraftCIPayload | AiDraftKBPayload,
      createdAt: m.createdAt,
    }));

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleNewSession = () => {
    const newId = `ai-sess-${Date.now()}`;
    const newSession: AiSession = {
      id: newId,
      domain: activeDomain,
      title: 'Sesi baru',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      draftsPending: 0,
      draftsConfirmed: 0,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newId);
    navigate(`/ai/${newId}`);
  };

  const handleSessionSelect = (id: string) => {
    setActiveSessionId(id);
    const session = sessions.find((s) => s.id === id);
    if (session) setActiveDomain(session.domain);
    navigate(`/ai/${id}`);
  };

  const handleResetSession = () => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return { ...s, messages: [], draftsPending: 0, draftsConfirmed: 0 };
      })
    );
  };

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const capturedSessionId = activeSessionId;
    aiService.sendMessage(capturedSessionId, text.trim()).then(({ user, assistant }) => {
      const userMsg: AiMessage = {
        id: user.id,
        sessionId: capturedSessionId,
        role: 'user',
        text: user.body,
        contentType: 'text',
        createdAt: user.createdAt,
      };
      const aiMsg: AiMessage = {
        id: assistant.id,
        sessionId: capturedSessionId,
        role: 'ai',
        text: assistant.body,
        contentType: 'text',
        createdAt: assistant.createdAt,
      };
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== capturedSessionId) return s;
          return {
            ...s,
            messages: [...s.messages, userMsg, aiMsg],
            updatedAt: new Date().toISOString(),
          };
        })
      );
    }).catch(() => {/* handle silently */});
  };

  const updateMessageDraftStatus = (msgId: string, newStatus: AiDraftStatus) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== activeSessionId) return s;
        return {
          ...s,
          messages: s.messages.map((m) => {
            if (m.id !== msgId) return m;
            const payload = m.contentPayload as AiDraftCIPayload | AiDraftKBPayload;
            return {
              ...m,
              contentPayload: { ...payload, draftStatus: newStatus },
            };
          }),
          draftsPending:
            newStatus === 'confirmed' || newStatus === 'cancelled'
              ? Math.max(0, s.draftsPending - 1)
              : s.draftsPending,
          draftsConfirmed:
            newStatus === 'confirmed' ? s.draftsConfirmed + 1 : s.draftsConfirmed,
        };
      })
    );
  };

  // ── Message renderer ─────────────────────────────────────────────────────────

  const renderMessage = (msg: AiMessage) => {
    if (msg.role === 'user') {
      return (
        <AiUserMessage
          key={msg.id}
          text={msg.text ?? ''}
          timestamp={msg.createdAt}
        />
      );
    }

    return (
      <AiMessageBubble key={msg.id} text={msg.text} timestamp={msg.createdAt}>
        {msg.contentPayload?.kind === 'draft_ci' && (
          <AiDraftCICard
            payload={msg.contentPayload}
            onConfirm={() => updateMessageDraftStatus(msg.id, 'confirmed')}
            onCancel={() => updateMessageDraftStatus(msg.id, 'cancelled')}
          />
        )}
        {msg.contentPayload?.kind === 'draft_kb' && (
          <AiDraftKBCard
            payload={msg.contentPayload}
            onConfirm={() => updateMessageDraftStatus(msg.id, 'confirmed')}
            onCancel={() => updateMessageDraftStatus(msg.id, 'cancelled')}
          />
        )}
        {msg.contentType === 'draft_placeholder' && (
          <AiDraftPlaceholder domain={activeDomain} />
        )}
        {msg.contentPayload?.kind === 'query_result_ci' && (
          <AiQueryResultCI
            payload={msg.contentPayload}
            onAnalyze={() => handleSend('Analisis kedua CI ini')}
          />
        )}
        {msg.contentPayload?.kind === 'query_result_text' && (
          <AiQueryResultText payload={msg.contentPayload} />
        )}
      </AiMessageBubble>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ── Chat Area ───────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Context breadcrumb */}
          <div className="h-10 flex items-center justify-between px-4 border-b border-ois-border flex-shrink-0">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="text-ois-text-subtle">{getDomainLabel(activeDomain)}</span>
              <span className="text-ois-border-strong">›</span>
              <span className="text-ois-text font-medium truncate max-w-[200px]">
                {activeSession?.title ?? 'Sesi baru'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetSession}
              className="text-[11px] text-ois-text-muted hover:text-ois-text transition-colors"
            >
              Reset sesi
            </button>
          </div>

          {/* Message thread */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 min-h-0">
            {messages.length === 0 ? (
              <AiEmptyState domain={activeDomain} onSuggestionClick={handleSend} />
            ) : (
              messages.map((msg) => renderMessage(msg))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <div className="border-t border-ois-border p-3 flex-shrink-0">
            <AiInputBar onSend={handleSend} placeholder="Tanya atau instruksikan..." />
          </div>
        </div>

        {/* ── Right Panel ─────────────────────────────────────────────────── */}
        <div className="w-[210px] flex-shrink-0 border-l border-ois-border flex flex-col overflow-hidden bg-ois-surface">
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 min-h-0">
            {/* Pending Drafts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">
                  Pending drafts
                </span>
                {pendingDrafts.length > 0 && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 rounded-full px-1.5 leading-none py-0.5">
                    {pendingDrafts.length}
                  </span>
                )}
              </div>
              {pendingDrafts.length === 0 ? (
                <p className="text-[11px] text-ois-text-subtle">Tidak ada draft menunggu</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingDrafts.map(({ msgId, payload }) => (
                    <AiPendingDraftItem
                      key={msgId}
                      payload={payload}
                      onConfirm={() => updateMessageDraftStatus(msgId, 'confirmed')}
                      onCancel={() => updateMessageDraftStatus(msgId, 'cancelled')}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Saved today */}
            <div>
              <div className="mb-2">
                <span className="text-[11px] font-semibold text-ois-text-subtle uppercase tracking-wide">
                  Tersimpan hari ini
                </span>
              </div>
              {confirmedDrafts.length === 0 ? (
                <p className="text-[11px] text-ois-text-subtle">Belum ada</p>
              ) : (
                <div className="flex flex-col gap-0.5">
                  {confirmedDrafts.map(({ msgId, payload, createdAt }) => (
                    <div key={msgId} className="flex items-center gap-1.5 py-1">
                      <span className="text-[#12B76A] text-[11px] flex-shrink-0">✓</span>
                      <Link
                        to={payload.kind === 'draft_ci' ? `/cmdb/${payload.publicId}` : '/kb'}
                        className="text-[11px] text-ois-text hover:text-ois-primary truncate flex-1 min-w-0"
                      >
                        {payload.kind === 'draft_ci' ? payload.name : payload.title}
                      </Link>
                      <span className="text-[10px] text-ois-text-subtle flex-shrink-0">
                        {formatAiTime(createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Completeness panel (CMDB only) */}
            {activeDomain === 'cmdb' && (
              <div className="border-t border-ois-border pt-3">
                <AiCompletenessPanel onFillWithAI={handleSend} />
              </div>
            )}
          </div>
        </div>
      </div>
  );
};
