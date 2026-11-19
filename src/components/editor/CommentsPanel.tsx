"use client";

import { useMemo, useState } from "react";
import { commentPreview, countUnresolved } from "@/lib/comments";
import type { CommentDto } from "@/lib/dto";
import { relativeTime } from "@/lib/format";

type Props = {
  comments: CommentDto[];
  currentUserId: string;
  isOwner: boolean;
  canComment: boolean;
  activeId: string | null;
  anchoredIds: string[];
  draftQuote: string | null;
  draft: string;
  busy: boolean;
  error: string | null;
  onDraftChange: (value: string) => void;
  onSubmit: () => void;
  onCancelDraft: () => void;
  onSelect: (id: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
};

export function CommentsPanel({
  comments,
  currentUserId,
  isOwner,
  canComment,
  activeId,
  anchoredIds,
  draftQuote,
  draft,
  busy,
  error,
  onDraftChange,
  onSubmit,
  onCancelDraft,
  onSelect,
  onResolve,
  onDelete,
  onClose,
}: Props) {
  const [showResolved, setShowResolved] = useState(false);

  const { open, resolved } = useMemo(() => {
    return {
      open: comments.filter((comment) => comment.resolvedAt === null),
      resolved: comments.filter((comment) => comment.resolvedAt !== null),
    };
  }, [comments]);

  const visible = showResolved ? [...open, ...resolved] : open;

  return (
    <aside className="comments-panel" aria-label="Comments">
      <div className="comments-head">
        <div>
          <h2>Comments</h2>
          <p className="mono">
            {countUnresolved(comments)} open · {resolved.length} resolved
          </p>
        </div>
        <button
          type="button"
          className="btn btn-icon"
          onClick={onClose}
          aria-label="Close comments"
        >
          ✕
        </button>
      </div>

      {draftQuote !== null && canComment ? (
        <div className="comment-composer">
          <p className="comment-quote">“{draftQuote}”</p>
          <textarea
            className="input comment-input"
            placeholder="What needs changing?"
            value={draft}
            autoFocus
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                onSubmit();
              }
              if (event.key === "Escape") onCancelDraft();
            }}
            aria-label="Comment body"
          />
          {error ? (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          ) : null}
          <div className="comment-composer-actions">
            <button type="button" className="btn btn-sm" onClick={onCancelDraft}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={busy || draft.trim().length === 0}
              onClick={onSubmit}
            >
              {busy ? "Adding…" : "Comment"}
            </button>
          </div>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="comments-empty">
          <p>
            {canComment
              ? "Select a passage, then use Comment in the toolbar. Comments stay attached to the text as it is edited."
              : "No comments yet. Comments added by people with edit access will appear here."}
          </p>
        </div>
      ) : null}

      <div className="comments-list">
        {visible.map((comment) => {
          const isResolved = comment.resolvedAt !== null;
          const canDelete = comment.authorId === currentUserId || isOwner;

          return (
            <article
              key={comment.id}
              className="comment"
              data-active={comment.id === activeId ? "true" : "false"}
              data-resolved={isResolved ? "true" : "false"}
            >
              <button
                type="button"
                className="comment-main"
                onClick={() => onSelect(comment.id)}
              >
                <span className="comment-meta">
                  <strong>{comment.authorName}</strong>
                  <span className="mono">
                    {relativeTime(comment.createdAt)}
                    {isResolved ? " · resolved" : ""}
                  </span>
                </span>
                <span className="comment-body">{commentPreview(comment.body)}</span>
                {comment.quotedText ? (
                  <span className="comment-quote">“{comment.quotedText}”</span>
                ) : null}
                {!isResolved && !anchoredIds.includes(comment.id) ? (
                  <span className="comment-orphan">
                    The commented text was deleted
                  </span>
                ) : null}
              </button>

              {canComment ? (
                <div className="comment-actions">
                  {!isResolved ? (
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => onResolve(comment.id)}
                    >
                      Resolve
                    </button>
                  ) : null}
                  {canDelete ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      disabled={busy}
                      onClick={() => onDelete(comment.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {resolved.length > 0 ? (
        <button
          type="button"
          className="btn btn-sm comments-toggle"
          onClick={() => setShowResolved((value) => !value)}
        >
          {showResolved ? "Hide resolved" : `Show ${resolved.length} resolved`}
        </button>
      ) : null}
    </aside>
  );
}
