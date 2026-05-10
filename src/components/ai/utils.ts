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

export const getMockAiResponse = (
  userMessage: string,
  domain: AiDomain,
  sessionId: string
): AiMessage => {
  const id = `ai-${Date.now()}`;
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
