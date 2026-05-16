import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { EntityHoverCard, type HoverEntityKind } from '@/src/components/catalog/EntityHoverCard';

type EntityKind = 'incident' | 'problem' | 'change' | 'event' | 'ci';

interface EntityMatch {
  kind: EntityKind;
  id: string;
  start: number;
  end: number;
}

// Order matters: longer/more-specific patterns first so PRB-2026-… isn't
// partially matched as something else. Each pattern captures the full identifier
// including any year or alphanumeric segments.
const PATTERNS: { kind: EntityKind; regex: RegExp }[] = [
  { kind: 'event',    regex: /\bEVT-\d{4}-\d+\b/g },
  { kind: 'event',    regex: /\bEV-\d+\b/g },
  { kind: 'change',   regex: /\bCHG-\d{4}-\d+\b/g },
  { kind: 'change',   regex: /\bCHG-\d+\b/g },
  { kind: 'incident', regex: /\bINC-[A-Z0-9]+-\d+\b/g },
  { kind: 'problem',  regex: /\bPRB-\d{4}-\d+\b/g },
  { kind: 'problem',  regex: /\bPRB-\d+\b/g },
  { kind: 'ci',       regex: /\bCI-[A-Z0-9]+-[A-Z0-9]+-\d+\b/g },
  { kind: 'ci',       regex: /\bCI-[A-Z0-9]+-\d+\b/g },
];

const ROUTE: Record<EntityKind, (id: string) => string> = {
  incident: id => `/incidents/${id}`,
  problem:  id => `/problems/${id}`,
  change:   id => `/changes/${id}`,
  event:    id => `/monitoring/events/${id}`,
  ci:       id => `/cmdb/${id}`,
};

function findMatches(text: string): EntityMatch[] {
  const all: EntityMatch[] = [];
  for (const { kind, regex } of PATTERNS) {
    regex.lastIndex = 0;
    for (let m = regex.exec(text); m !== null; m = regex.exec(text)) {
      all.push({ kind, id: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
  // Deduplicate overlapping matches: prefer the earliest, longest match.
  all.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const pruned: EntityMatch[] = [];
  let cursor = -1;
  for (const m of all) {
    if (m.start >= cursor) {
      pruned.push(m);
      cursor = m.end;
    }
  }
  return pruned;
}

interface EntityLinkProps {
  kind: EntityKind;
  id: string;
  className?: string;
  children?: React.ReactNode;
}

/**
 * A single entity reference rendered as a dotted-underline chip-link.
 * Hovering for ≥ 400ms opens an EntityHoverCard; 150ms grace on leave.
 */
export const EntityLink: React.FC<EntityLinkProps> = ({ kind, id, className, children }) => {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [hoverState, setHoverState] = useState<{ open: boolean; rect: DOMRect | null }>({ open: false, rect: null });
  const enterTimer = useRef<number | null>(null);
  const leaveTimer = useRef<number | null>(null);

  const cancelTimers = () => {
    if (enterTimer.current) { window.clearTimeout(enterTimer.current); enterTimer.current = null; }
    if (leaveTimer.current) { window.clearTimeout(leaveTimer.current); leaveTimer.current = null; }
  };

  const onMouseEnter = () => {
    cancelTimers();
    enterTimer.current = window.setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) setHoverState({ open: true, rect });
    }, 400);
  };

  const onMouseLeave = () => {
    cancelTimers();
    leaveTimer.current = window.setTimeout(() => {
      setHoverState({ open: false, rect: null });
    }, 150);
  };

  return (
    <>
      <Link
        ref={anchorRef}
        to={ROUTE[kind](id)}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onMouseEnter}
        onBlur={onMouseLeave}
        className={cn(
          'text-ois-primary hover:text-ois-primary-hover transition-colors',
          'underline decoration-dotted decoration-ois-text-subtle underline-offset-[3px]',
          'font-mono text-[0.95em]',
          className,
        )}
        data-entity-kind={kind}
        data-entity-id={id}
      >
        {children ?? id}
      </Link>
      {hoverState.open && hoverState.rect && (
        <EntityHoverCard
          open
          kind={kind as HoverEntityKind}
          id={id}
          anchor={hoverState.rect}
          onClose={() => setHoverState({ open: false, rect: null })}
        />
      )}
    </>
  );
};

/**
 * Transform a string containing entity IDs into React children with
 * <EntityLink> components inserted in place. Plain text segments are
 * preserved verbatim. Safe to call with empty or null input.
 */
export function linkifyEntities(text: string | null | undefined): React.ReactNode {
  if (!text) return text;
  const matches = findMatches(text);
  if (matches.length === 0) return text;

  const out: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) out.push(text.slice(cursor, m.start));
    out.push(<EntityLink key={`${m.kind}-${m.id}-${i}`} kind={m.kind} id={m.id} />);
    cursor = m.end;
  });
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}
