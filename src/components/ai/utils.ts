import type { AiDomain } from '@/src/types/ai';

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
