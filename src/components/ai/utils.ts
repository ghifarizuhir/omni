import type { AiDomain, AiMessage, AiDraftCIPayload, AiDraftKBPayload } from '@/src/types/ai';

export const formatAiTime = (iso: string): string => {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
};

export const getDomainLabel = (domain: AiDomain): string => {
  const labels: Record<AiDomain, string> = {
    cmdb: 'CMDB',
    knowledge_base: 'Knowledge Base',
    incident: 'Incident',
    problem: 'Problem',
    change: 'Change',
    all: 'Semua Domain',
  };
  return labels[domain];
};

function buildDomainTextAnswer(userMessage: string, domain: AiDomain): string {
  const trimmed = userMessage.trim();
  switch (domain) {
    case 'incident':
      if (/p1|critical|major/i.test(userMessage)) {
        return 'There are 2 active P1 incidents this week — INC-2026-00184 (payment-api 5xx spike) and INC-2026-00179 (checkout latency). The on-call engineer is paged on both. Want me to summarize the latest update?';
      }
      if (/open|active|in progress/i.test(userMessage)) {
        return '7 incidents are currently active across all severities. 2 are P1, 3 are P2, and 2 are P3. The longest-running one is INC-2026-00171 (4h 12m).';
      }
      return `For "${trimmed}", I\'d look at the incident queue at /incidents and recent post-mortems in the KB. Want me to draft an incident report skeleton?`;
    case 'problem':
      if (/known error|kedb/i.test(userMessage)) {
        return 'The KEDB has 12 active known errors. The most frequently triggered one is PRB-2026-00018 (payment-api DB connection exhaustion) — linked to 6 incidents in the last 30 days.';
      }
      if (/rca|root cause/i.test(userMessage)) {
        return 'I can help draft an RCA. Open the problem detail and use the RCA workspace — I\'ll auto-populate the timeline from linked incidents. Which problem are you investigating?';
      }
      return `For "${trimmed}", I\'d cross-reference recurring incidents and check whether a problem ticket exists. Want me to surface candidate problems from incident clustering?`;
    case 'change':
      if (/calendar|scheduled|upcoming/i.test(userMessage)) {
        return 'There are 4 changes scheduled this week. CHG-2026-00342 (payment-api 2.4.1) is the highest-risk one, scheduled for Thursday 02:00 UTC. CAB review is pending.';
      }
      if (/risk|impact/i.test(userMessage)) {
        return 'Risk is computed from blast radius, freshness of rollback plan, and historical change failures in the same service. The current backlog has 1 critical-risk change pending CAB approval.';
      }
      return `For "${trimmed}", I can pull up the change calendar at /changes/calendar or draft an RFC. Want me to start a new change request?`;
    case 'all':
      return 'I can answer across CMDB, KB, incidents, problems, and changes. Pick a more specific domain in the left rail to get focused suggestions.';
    default:
      return 'Saya memproses permintaan kamu. (Mode demo — response aktual tersedia setelah AI backend terhubung.)';
  }
}

export const getMockAiResponse = (
  userMessage: string,
  domain: AiDomain,
  sessionId: string
): AiMessage => {
  const id = `ai-${Date.now()}`;
  const createdAt = new Date().toISOString();

  if (['incident', 'problem', 'change'].includes(domain)) {
    return {
      id,
      sessionId,
      role: 'ai',
      contentType: 'query_result_text',
      contentPayload: {
        kind: 'query_result_text',
        query: userMessage,
        answer: buildDomainTextAnswer(userMessage, domain),
        timestamp: createdAt,
      },
      createdAt,
    };
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
