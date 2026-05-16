import React, { useEffect, useRef } from 'react';
import { cn } from '@/src/lib/utils';
import { togglePin, isPinned } from '@/src/lib/sidebar-pins';

interface SidebarContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  path: string;
  label: string;
  onClose: () => void;
}

/**
 * Right-click menu attached to sidebar nav items. Hand-rolled (no
 * floating-ui / radix); positioned via fixed coords from the
 * contextmenu event. Closes on outside click, scroll, or Escape.
 */
export const SidebarContextMenu: React.FC<SidebarContextMenuProps> = ({
  open, x, y, path, label, onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onScroll = () => onClose();
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  const pinned = isPinned(path);
  const fullUrl = `${window.location.origin}${path}`;

  const items: { label: string; onClick: () => void }[] = [
    {
      label: pinned ? 'Unpin from favorites' : 'Pin to favorites',
      onClick: () => { togglePin(path); onClose(); },
    },
    {
      label: 'Copy link',
      onClick: () => { void navigator.clipboard.writeText(fullUrl); onClose(); },
    },
    {
      label: 'Open in new tab',
      onClick: () => { window.open(path, '_blank', 'noopener,noreferrer'); onClose(); },
    },
  ];

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions for ${label}`}
      className={cn(
        'fixed z-50 min-w-[180px] rounded-[8px] border border-ois-border bg-white p-1',
        'shadow-[0_8px_24px_rgba(16,24,40,0.10)] text-[12px]',
      )}
      style={{ left: x, top: y }}
    >
      {items.map((it, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          onClick={it.onClick}
          className="flex w-full items-center justify-between gap-3 rounded-[4px] px-2.5 py-1.5 text-left text-ois-text hover:bg-ois-surface-muted"
        >
          <span>{it.label}</span>
        </button>
      ))}
    </div>
  );
};
