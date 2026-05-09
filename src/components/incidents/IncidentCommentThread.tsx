import React, { useState } from 'react';
import { ThumbsUp, CornerDownRight, MoreHorizontal, Lock } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { IncidentComment } from '@/src/types/incident';
import { Avatar } from '@/src/components/ui/Avatar';
import { formatRelative } from '@/src/lib/format';

interface CommentItemProps {
  comment: IncidentComment;
  replies?: IncidentComment[];
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({ comment, replies = [], depth = 0 }) => {
  const [liked, setLiked] = useState(false);
  const [showReplies, setShowReplies] = useState(true);

  const renderBody = (body: string) => {
    // Highlight @mentions
    const parts = body.split(/(@\w+(?:\.\w+)*)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-ois-primary font-medium bg-blue-50 px-0.5 rounded">
          {part}
        </span>
      ) : part.includes('`') ? (
        // Inline code
        <span key={i}>
          {part.split(/(`[^`]+`)/g).map((seg, j) =>
            seg.startsWith('`') && seg.endsWith('`') ? (
              <code key={j} className="bg-ois-surface-muted text-ois-text font-mono text-[11px] px-1 py-0.5 rounded">
                {seg.slice(1, -1)}
              </code>
            ) : (
              <span key={j}>{seg}</span>
            )
          )}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className={cn('group', depth > 0 && 'ml-8 pl-4 border-l-2 border-ois-border')}>
      <div className="flex gap-3">
        <Avatar name={comment.authorName} size="sm" className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-ois-text">{comment.authorName}</span>
            {comment.isInternal && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                <Lock size={9} />
                Internal
              </span>
            )}
            <span className="text-xs text-ois-text-subtle ml-auto">
              {formatRelative(comment.createdAt)}
            </span>
            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-ois-surface-muted">
              <MoreHorizontal size={14} className="text-ois-text-subtle" />
            </button>
          </div>

          <p className="text-sm text-ois-text leading-relaxed">{renderBody(comment.body)}</p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => setLiked(!liked)}
              className={cn(
                'flex items-center gap-1 text-xs transition-colors',
                liked ? 'text-ois-primary' : 'text-ois-text-subtle hover:text-ois-text'
              )}
            >
              <ThumbsUp size={12} />
              <span>{liked ? 1 : 0}</span>
            </button>
            {depth === 0 && (
              <button className="flex items-center gap-1 text-xs text-ois-text-subtle hover:text-ois-text transition-colors">
                <CornerDownRight size={12} />
                Reply
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {replies.length > 0 && showReplies && (
        <div className="mt-3 space-y-3">
          {replies.map(reply => (
            <CommentItem key={reply.id} comment={reply} depth={1} />
          ))}
        </div>
      )}
      {replies.length > 0 && (
        <button
          onClick={() => setShowReplies(v => !v)}
          className="mt-2 ml-11 text-xs text-ois-primary hover:underline"
        >
          {showReplies ? `Hide ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}` : `Show ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'}`}
        </button>
      )}
    </div>
  );
};

interface Props {
  comments: IncidentComment[];
}

export const IncidentCommentThread: React.FC<Props> = ({ comments }) => {
  const topLevel = comments.filter(c => !c.parentCommentId);
  const byParent: Record<string, IncidentComment[]> = {};
  for (const c of comments) {
    if (c.parentCommentId) {
      (byParent[c.parentCommentId] ??= []).push(c);
    }
  }

  if (topLevel.length === 0) {
    return (
      <div className="text-center py-12 text-ois-text-subtle">
        <MessageCirclePlaceholder />
        <p className="text-sm mt-2">No comments yet. Start the discussion.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topLevel.map(c => (
        <CommentItem
          key={c.id}
          comment={c}
          replies={byParent[c.id] ?? []}
        />
      ))}
    </div>
  );
};

const MessageCirclePlaceholder: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto text-ois-border-strong" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);
