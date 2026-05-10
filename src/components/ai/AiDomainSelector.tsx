import React from 'react';
import { Server, BookOpen, AlertTriangle, Search, GitPullRequest, Layers } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import type { AiDomain } from '@/src/types/ai';

interface AiDomainSelectorProps {
  activeDomain: AiDomain;
  onDomainChange: (domain: AiDomain) => void;
}

interface DomainItem {
  domain: AiDomain;
  label: string;
  icon: React.ElementType;
  comingSoon?: boolean;
}

const DOMAINS: DomainItem[] = [
  { domain: 'cmdb', label: 'CMDB', icon: Server },
  { domain: 'knowledge_base', label: 'Knowledge Base', icon: BookOpen },
  { domain: 'incident', label: 'Incident', icon: AlertTriangle, comingSoon: true },
  { domain: 'problem', label: 'Problem', icon: Search, comingSoon: true },
  { domain: 'change', label: 'Change', icon: GitPullRequest, comingSoon: true },
  { domain: 'all', label: 'Semua domain', icon: Layers },
];

export const AiDomainSelector: React.FC<AiDomainSelectorProps> = ({ activeDomain, onDomainChange }) => {
  return (
    <div className="flex flex-col gap-0.5 w-full">
      {DOMAINS.map(({ domain, label, icon: Icon, comingSoon }) => {
        const isActive = activeDomain === domain;

        return (
          <button
            key={domain}
            type="button"
            onClick={() => onDomainChange(domain)}
            className={cn(
              'flex items-center gap-2 h-8 px-3 rounded-md w-full text-left cursor-pointer',
              'transition-colors duration-100',
              isActive
                ? 'text-[#1F4FD4]'
                : comingSoon
                ? 'text-ois-text-subtle hover:bg-ois-surface-muted'
                : 'text-ois-text-muted hover:bg-ois-surface-muted hover:text-ois-text'
            )}
            style={
              isActive
                ? { backgroundColor: 'rgba(31, 79, 212, 0.1)' }
                : undefined
            }
          >
            <Icon
              size={14}
              className={cn(
                'flex-shrink-0',
                isActive ? 'text-[#1F4FD4]' : comingSoon ? 'text-ois-text-subtle' : 'text-ois-text-muted'
              )}
            />
            <span
              className={cn(
                'text-[12px] font-medium flex-1 truncate',
                comingSoon && !isActive && 'opacity-60'
              )}
            >
              {label}
            </span>
            {comingSoon && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-ois-surface-muted text-ois-text-subtle leading-none flex-shrink-0">
                soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
