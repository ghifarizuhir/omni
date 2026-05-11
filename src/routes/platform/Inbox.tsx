import React, { useState, useMemo } from 'react';
import { Search, CheckCheck, ArchiveX, Inbox as InboxIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { mockInboxItems } from '@/src/mocks/inboxItems';
import { InboxItem } from '@/src/types/platform';
import { Button } from '@/src/components/ui/Button';
import { InboxListItem } from '@/src/components/inbox/InboxListItem';
import { InboxItemDetail } from '@/src/components/inbox/InboxItemDetail';
import { InboxEmptyState } from '@/src/components/inbox/InboxEmptyState';

// ── Types ────────────────────────────────────────────────────────────────────

type TabId = 'all' | 'unread' | 'requires_action' | 'archived';

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'requires_action', label: 'Requires action' },
  { id: 'archived', label: 'Archived' },
];

// ── Sort helper ───────────────────────────────────────────────────────────────

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function sortItems(items: InboxItem[]): InboxItem[] {
  return [...items].sort((a, b) => {
    // Pinned first
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    // Unread before read
    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
    // Urgent first
    const pa = PRIORITY_ORDER[a.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    // Newest first
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export const Inbox: React.FC = () => {
  const [items, setItems] = useState<InboxItem[]>(mockInboxItems);
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState('');

  // ── Stats ─────────────────────────────────────────────────────────────────
  const unreadCount = useMemo(() => items.filter(i => !i.isRead && !i.isArchived).length, [items]);
  const actionCount = useMemo(() => items.filter(i => i.requiresAction && !i.isArchived).length, [items]);
  const urgentCount = useMemo(() => items.filter(i => i.priority === 'urgent' && !i.isArchived).length, [items]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    let result = items;

    switch (activeTab) {
      case 'all':
        result = result.filter(i => !i.isArchived);
        break;
      case 'unread':
        result = result.filter(i => !i.isRead && !i.isArchived);
        break;
      case 'requires_action':
        result = result.filter(i => i.requiresAction && !i.isArchived);
        break;
      case 'archived':
        result = result.filter(i => i.isArchived);
        break;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        i =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.senderName.toLowerCase().includes(q) ||
          i.sourcePublicId.toLowerCase().includes(q)
      );
    }

    return sortItems(result);
  }, [items, activeTab, search]);

  const selectedItem = useMemo(() => items.find(i => i.id === selectedId) ?? null, [items, selectedId]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  function updateItem(id: string, patch: Partial<InboxItem>) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
  }

  function handleSelect(id: string) {
    setSelectedId(id);
    // Mark as read on open
    updateItem(id, { isRead: true });
  }

  function handleArchive(id: string) {
    updateItem(id, { isArchived: true });
    if (selectedId === id) setSelectedId('');
  }

  function handlePin(id: string) {
    const item = items.find(i => i.id === id);
    if (item) updateItem(id, { isPinned: !item.isPinned });
  }

  function handleMarkRead(id: string) {
    const item = items.find(i => i.id === id);
    if (item) updateItem(id, { isRead: !item.isRead });
  }

  function handleMarkUnread(id: string) {
    updateItem(id, { isRead: false });
  }

  function handleMarkAllRead() {
    setItems(prev => prev.map(i => ({ ...i, isRead: true })));
  }

  function handleArchiveRead() {
    setItems(prev =>
      prev.map(i => (i.isRead && !i.isArchived ? { ...i, isArchived: true } : i))
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-ois-surface">
      {/* ── Left panel ─────────────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-ois-border bg-ois-surface">
        {/* Page title + stats */}
        <div className="px-4 pt-4 pb-3 border-b border-ois-border">
          <div className="flex items-center gap-2 mb-2">
            <InboxIcon size={16} className="text-ois-primary" />
            <h1 className="text-sm font-bold text-ois-text">Inbox</h1>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            {unreadCount > 0 && (
              <span className="text-ois-primary font-semibold">{unreadCount} unread</span>
            )}
            {actionCount > 0 && (
              <span className="text-ois-warning font-semibold">{actionCount} action</span>
            )}
            {urgentCount > 0 && (
              <span className="text-ois-danger font-semibold">{urgentCount} urgent</span>
            )}
            {unreadCount === 0 && actionCount === 0 && urgentCount === 0 && (
              <span className="text-ois-text-subtle">All caught up</span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-ois-border">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-shrink-0 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-ois-primary text-ois-primary'
                    : 'border-transparent text-ois-text-muted hover:text-ois-text'
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Search + actions */}
        <div className="px-3 py-2 border-b border-ois-border flex flex-col gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ois-text-subtle" />
            <input
              type="text"
              placeholder="Search inbox…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-ois-surface-muted border border-ois-border rounded text-ois-text placeholder:text-ois-text-subtle focus:outline-none focus:border-ois-primary"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[10px] text-ois-text-muted hover:text-ois-text px-1.5 py-1 rounded hover:bg-ois-surface-muted transition-colors"
            >
              <CheckCheck size={10} />
              Mark all read
            </button>
            <button
              onClick={handleArchiveRead}
              className="flex items-center gap-1 text-[10px] text-ois-text-muted hover:text-ois-text px-1.5 py-1 rounded hover:bg-ois-surface-muted transition-colors"
            >
              <ArchiveX size={10} />
              Archive read
            </button>
          </div>
        </div>

        {/* Item list */}
        <div className="flex-1 overflow-y-auto">
          {filteredItems.length === 0 ? (
            <InboxEmptyState variant="all_caught_up" />
          ) : (
            filteredItems.map(item => (
              <InboxListItem
                key={item.id}
                item={item}
                isSelected={item.id === selectedId}
                onClick={() => handleSelect(item.id)}
                onArchive={() => handleArchive(item.id)}
                onPin={() => handlePin(item.id)}
                onMarkRead={() => handleMarkRead(item.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-ois-surface">
        {selectedItem ? (
          <InboxItemDetail
            item={selectedItem}
            onArchive={() => handleArchive(selectedItem.id)}
            onPin={() => handlePin(selectedItem.id)}
            onMarkUnread={() => handleMarkUnread(selectedItem.id)}
          />
        ) : (
          <InboxEmptyState variant="no_selection" />
        )}
      </div>
    </div>
  );
};
