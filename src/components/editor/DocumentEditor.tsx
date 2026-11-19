"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Logo } from "@/components/Logo";
import type { Role } from "@/lib/access";
import { countUnresolved, newCommentId } from "@/lib/comments";
import type { CommentDto, DocumentDto, ShareDto, ViewerDto } from "@/lib/dto";
import { relativeTime } from "@/lib/format";
import { countWords, readingMinutes } from "@/lib/text";
import { CommentMark } from "./CommentMark";
import { CommentsPanel } from "./CommentsPanel";
import { HistoryPanel } from "./HistoryPanel";
import { ShareDialog } from "./ShareDialog";
import { Toolbar } from "./Toolbar";

type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";
type Panel = "none" | "comments" | "history";

type Props = {
  document: DocumentDto;
  role: Role;
  ownerName: string;
  shares: ShareDto[];
  comments: CommentDto[];
  currentUser: { id: string; name: string; email: string };
};

const STATUS_COLOR: Record<SaveStatus, string> = {
  saved: "var(--ok)",
  dirty: "var(--warn)",
  saving: "var(--accent)",
  error: "var(--danger)",
  conflict: "var(--danger)",
};

const POLL_MS = 4000;

function anchoredCommentIds(editor: Editor): string[] {
  const ids = new Set<string>();
  editor.state.doc.descendants((node) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name === "comment" && typeof mark.attrs.commentId === "string") {
        ids.add(mark.attrs.commentId);
      }
    }
  });
  return [...ids];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DocumentEditor({
  document,
  role,
  ownerName,
  shares,
  comments: initialComments,
  currentUser,
}: Props) {
  const router = useRouter();
  const canEdit = role === "OWNER" || role === "EDITOR";
  const isOwner = role === "OWNER";

  const [title, setTitle] = useState(document.title);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [savedAt, setSavedAt] = useState(document.updatedAt);
  const [now, setNow] = useState<number | null>(null);
  const [words, setWords] = useState(() => countWords(document.contentText));
  const [progress, setProgress] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inserting, setInserting] = useState(false);
  const [panel, setPanel] = useState<Panel>("none");
  const [notice, setNotice] = useState<string | null>(null);

  const [comments, setComments] = useState<CommentDto[]>(initialComments);
  const [anchoredIds, setAnchoredIds] = useState<string[]>([]);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [draftQuote, setDraftQuote] = useState<string | null>(null);
  const [draftRange, setDraftRange] = useState<{ from: number; to: number } | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [viewers, setViewers] = useState<ViewerDto[]>([]);
  const [remotePending, setRemotePending] = useState(false);

  const version = useRef(document.updatedAt);
  const pending = useRef<{ html: string; text: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const statusRef = useRef<SaveStatus>("saved");
  const draftOpenRef = useRef(false);
  const panelRef = useRef<Panel>("none");
  const commentsRef = useRef<CommentDto[]>(comments);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    draftOpenRef.current = draftQuote !== null;
    panelRef.current = panel;
  }, [draftQuote, panel]);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
  }, []);

  const flush = useCallback(async (): Promise<boolean> => {
    const payload = pending.current;
    if (!payload) return true;
    pending.current = null;
    setStatus("saving");

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contentHtml: payload.html,
          contentText: payload.text,
          expectedUpdatedAt: version.current,
        }),
      });

      if (response.status === 409) {
        setStatus("conflict");
        setRemotePending(true);
        return false;
      }

      if (!response.ok) {
        pending.current = payload;
        setStatus("error");
        return false;
      }

      const body = (await response.json()) as { document: DocumentDto };
      version.current = body.document.updatedAt;
      setSavedAt(body.document.updatedAt);
      setStatus("saved");
      setRemotePending(false);
      return true;
    } catch {
      pending.current = payload;
      setStatus("error");
      return false;
    }
  }, [document.id]);

  const scheduleSave = useCallback(
    (html: string, text: string) => {
      pending.current = { html, text };
      setStatus("dirty");
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void flush();
      }, 700);
    },
    [flush],
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: canEdit,
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
        Underline,
        CommentMark,
        Placeholder.configure({
          placeholder: canEdit
            ? "Start writing. Formatting lives in the toolbar above."
            : "This document is read-only.",
        }),
      ],
      content: document.contentHtml,
      editorProps: {
        attributes: { class: "ProseMirror", spellcheck: "true" },
      },
      onCreate: ({ editor: instance }) => {
        setAnchoredIds(anchoredCommentIds(instance));
      },
      onUpdate: ({ editor: instance }) => {
        const text = instance.getText();
        setWords(countWords(text));
        setAnchoredIds(anchoredCommentIds(instance));
        if (canEdit) scheduleSave(instance.getHTML(), text);
      },
    },
    [document.id],
  );

  /** Save whatever is in the editor right now, bypassing the debounce. */
  const saveNow = useCallback(async (): Promise<boolean> => {
    if (!editor || !canEdit) return true;
    pending.current = { html: editor.getHTML(), text: editor.getText() };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    return flush();
  }, [editor, canEdit, flush]);

  const reloadFromServer = useCallback(
    async (announce: boolean) => {
      if (!editor) return;
      const response = await fetch(`/api/documents/${document.id}`, {
        cache: "no-store",
      });
      if (!response.ok) return;
      const body = (await response.json()) as {
        document: DocumentDto;
        comments?: CommentDto[];
      };
      if (body.document.updatedAt <= version.current) return;

      editor.commands.setContent(body.document.contentHtml, false);
      version.current = body.document.updatedAt;
      setTitle(body.document.title);
      setSavedAt(body.document.updatedAt);
      setWords(countWords(body.document.contentText));
      setStatus("saved");
      setRemotePending(false);
      setAnchoredIds(anchoredCommentIds(editor));
      if (announce) showNotice("Updated by someone else");
    },
    [document.id, editor, showNotice],
  );

  // Presence + live sync. Polling, not a socket: the data the editor needs is
  // tiny, and a serverless deployment cannot hold a WebSocket open.
  useEffect(() => {
    const documentId = document.id;
    let cancelled = false;

    async function tick() {
      if (typeof window === "undefined") return;
      if (window.document.visibilityState === "hidden") return;

      try {
        const response = await fetch(`/api/documents/${documentId}/sync`, {
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const body = (await response.json()) as {
          updatedAt: number;
          viewers: ViewerDto[];
          unresolvedComments: number;
        };
        if (cancelled) return;

        setViewers(body.viewers);

        if (body.unresolvedComments !== countUnresolved(commentsRef.current)) {
          const commentsResponse = await fetch(
            `/api/documents/${documentId}/comments`,
            { cache: "no-store" },
          );
          if (commentsResponse.ok) {
            const commentsBody = await commentsResponse.json();
            if (!cancelled) setComments(commentsBody.comments as CommentDto[]);
          }
        }

        if (body.updatedAt > version.current) {
          const idle =
            statusRef.current === "saved" &&
            !draftOpenRef.current &&
            panelRef.current !== "history";
          if (idle) {
            await reloadFromServer(true);
          } else {
            setRemotePending(true);
          }
        }
      } catch {
        // Network hiccups are not worth surfacing: the next tick retries.
      }
    }

    const interval = setInterval(() => void tick(), POLL_MS);
    void tick();

    return () => {
      cancelled = true;
      clearInterval(interval);
      void fetch(`/api/documents/${documentId}/sync`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => undefined);
    };
  }, [document.id, reloadFromServer]);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onScroll() {
      const root = window.document.documentElement;
      const max = root.scrollHeight - window.innerHeight;
      setProgress(max <= 0 ? 0 : Math.min(1, window.scrollY / max));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!pending.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (titleTimer.current) clearTimeout(titleTimer.current);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      const payload = pending.current;
      if (payload) {
        void fetch(`/api/documents/${document.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contentHtml: payload.html,
            contentText: payload.text,
          }),
          keepalive: true,
        }).catch(() => undefined);
      }
    };
  }, [document.id]);

  function onTitleChange(value: string) {
    setTitle(value);
    if (!canEdit) return;
    if (titleTimer.current) clearTimeout(titleTimer.current);
    titleTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/documents/${document.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title: value }),
        });
      } catch {
        setStatus("error");
      }
    }, 600);
  }

  async function handleDelete() {
    setDeleting(true);
    const response = await fetch(`/api/documents/${document.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setDeleting(false);
      setConfirmDelete(false);
      setStatus("error");
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function onInsertFile(file: File | undefined) {
    if (!file || !editor) return;
    setInserting(true);
    setNotice(null);

    const saved = await saveNow();
    if (!saved) {
      setInserting(false);
      showNotice("Save the current draft before inserting a file.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }

    const form = new FormData();
    form.append("file", file);

    const response = await fetch(`/api/documents/${document.id}/import`, {
      method: "POST",
      body: form,
    });
    const body = await response.json().catch(() => null);
    setInserting(false);
    if (fileInput.current) fileInput.current.value = "";

    if (!response.ok) {
      showNotice(body?.error?.message ?? "Could not insert that file.");
      return;
    }

    const updated = body.document as DocumentDto;
    editor.commands.setContent(updated.contentHtml, false);
    version.current = updated.updatedAt;
    setSavedAt(updated.updatedAt);
    setWords(countWords(updated.contentText));
    setStatus("saved");
    setAnchoredIds(anchoredCommentIds(editor));
    showNotice(`Inserted ${file.name}`);
  }

  function commentRanges(commentId: string): { from: number; to: number }[] {
    if (!editor) return [];
    const ranges: { from: number; to: number }[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      for (const mark of node.marks) {
        if (mark.type.name === "comment" && mark.attrs.commentId === commentId) {
          ranges.push({ from: pos, to: pos + node.nodeSize });
        }
      }
    });
    return ranges;
  }

  /** Removes the anchor without moving the caret. */
  function removeCommentMarks(commentId: string) {
    if (!editor) return;
    const { state, view } = editor;
    const markType = state.schema.marks.comment;
    const tr = state.tr;

    state.doc.descendants((node, pos) => {
      if (!node.isText) return;
      for (const mark of node.marks) {
        if (mark.type.name === "comment" && mark.attrs.commentId === commentId) {
          tr.removeMark(pos, pos + node.nodeSize, markType);
        }
      }
    });

    if (tr.docChanged) view.dispatch(tr);
  }

  function startComment() {
    if (!editor || !canEdit) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const quote = editor.state.doc.textBetween(from, to, " ").trim().slice(0, 300);
    setDraftQuote(quote);
    setDraftRange({ from, to });
    setDraft("");
    setCommentError(null);
    setPanel("comments");
  }

  async function submitComment() {
    if (!editor || !draftRange || draftRange.from === draftRange.to) return;
    const body = draft.trim();
    if (!body) return;

    const id = newCommentId();
    const quotedText = editor.state.doc
      .textBetween(draftRange.from, draftRange.to, " ")
      .trim()
      .slice(0, 400);

    editor
      .chain()
      .setTextSelection(draftRange)
      .setMark("comment", { commentId: id })
      .run();

    setCommentBusy(true);
    setCommentError(null);

    try {
      const response = await fetch(`/api/documents/${document.id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, body, quotedText }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        removeCommentMarks(id);
        setCommentError(payload?.error?.message ?? "Could not add that comment.");
        setCommentBusy(false);
        return;
      }

      setComments(payload.comments as CommentDto[]);
      setActiveCommentId(id);
      setDraft("");
      setDraftQuote(null);
      setDraftRange(null);
      setCommentBusy(false);
      await saveNow();
    } catch {
      removeCommentMarks(id);
      setCommentError("Could not reach the server. Try again.");
      setCommentBusy(false);
    }
  }

  async function resolveComment(commentId: string) {
    setCommentBusy(true);
    setCommentError(null);
    try {
      const response = await fetch(
        `/api/documents/${document.id}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ resolved: true }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setCommentError(payload?.error?.message ?? "Could not resolve that comment.");
        setCommentBusy(false);
        return;
      }
      removeCommentMarks(commentId);
      setComments(payload.comments as CommentDto[]);
      setActiveCommentId(null);
      setCommentBusy(false);
      await saveNow();
    } catch {
      setCommentError("Could not reach the server. Try again.");
      setCommentBusy(false);
    }
  }

  async function deleteComment(commentId: string) {
    setCommentBusy(true);
    setCommentError(null);
    try {
      const response = await fetch(
        `/api/documents/${document.id}/comments/${commentId}`,
        { method: "DELETE" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setCommentError(payload?.error?.message ?? "Could not delete that comment.");
        setCommentBusy(false);
        return;
      }
      removeCommentMarks(commentId);
      setComments(payload.comments as CommentDto[]);
      setActiveCommentId(null);
      setCommentBusy(false);
      await saveNow();
    } catch {
      setCommentError("Could not reach the server. Try again.");
      setCommentBusy(false);
    }
  }

  function selectComment(commentId: string) {
    setActiveCommentId(commentId);
    setPanel("comments");
    if (!editor) return;

    const ranges = commentRanges(commentId);
    if (ranges.length === 0) return;

    const { from, to } = ranges[0];
    editor.chain().setTextSelection({ from, to }).scrollIntoView().run();
  }

  function onDocumentClick(event: MouseEvent<HTMLDivElement>) {
    const target = (event.target as HTMLElement).closest("[data-comment-id]");
    if (!target) return;
    const id = target.getAttribute("data-comment-id");
    if (!id) return;
    setActiveCommentId(id);
    setPanel("comments");
  }

  const savedLabel = useMemo(() => {
    if (status === "saving") return "Saving…";
    if (status === "dirty") return "Unsaved changes";
    if (status === "error") return "Save failed — retrying on next edit";
    if (status === "conflict") return "Changed elsewhere";
    if (now === null) return "Saved";
    return `Saved ${relativeTime(savedAt, now)}`;
  }, [status, savedAt, now]);

  const openComments = countUnresolved(comments);

  return (
    <div className="editor-shell">
      <header className="editor-topbar">
        <Link href="/" className="btn btn-icon" aria-label="Back to documents">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M9.5 3.5 5 8l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        <span className="brand" style={{ flex: "none" }}>
          <span className="brand-mark" style={{ width: 22, height: 22, borderRadius: 6 }}>
            <Logo size={13} />
          </span>
        </span>

        <input
          className="title-input"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          readOnly={!canEdit}
          aria-label="Document title"
          spellCheck={false}
        />

        <div className="topbar-tools">
          {viewers.length > 0 ? (
            <span
              className="viewers"
              title={viewers.map((viewer) => viewer.name).join(", ")}
            >
              {viewers.slice(0, 3).map((viewer) => (
                <span key={viewer.id} className="viewer-dot" aria-hidden="true">
                  {initials(viewer.name)}
                </span>
              ))}
              <span className="mono viewers-label">
                {viewers.length === 1
                  ? `${viewers[0].name} is here`
                  : `${viewers.length} others here`}
              </span>
            </span>
          ) : null}

          <span
            className="mono save-state"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, textTransform: "none" }}
            aria-live="polite"
          >
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: STATUS_COLOR[status],
                display: "inline-block",
              }}
            />
            {savedLabel}
          </span>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setPanel(panel === "comments" ? "none" : "comments")}
            aria-pressed={panel === "comments"}
          >
            Comments{openComments > 0 ? ` · ${openComments}` : ""}
          </button>

          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setPanel("history")}
          >
            History
          </button>

          {canEdit ? (
            <>
              <input
                type="file"
                ref={fileInput}
                className="sr-only"
                accept=".md,.markdown,.txt,.docx"
                onChange={(event) => void onInsertFile(event.target.files?.[0])}
              />
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => fileInput.current?.click()}
                disabled={inserting}
                title="Append an .md, .txt or .docx file to this document"
              >
                {inserting ? "Inserting…" : "Insert file"}
              </button>
            </>
          ) : null}

          {!canEdit ? <span className="badge">View only</span> : null}

          {isOwner ? (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setShareOpen(true)}
            >
              Share
            </button>
          ) : null}

          {isOwner ? (
            <button
              type="button"
              className="btn btn-icon"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete document"
              title="Delete document"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M3.2 4.6h9.6M6.2 4.6V3.2h3.6v1.4M4.6 4.6l.6 8h5.6l.6-8M6.8 7v3.4M9.2 7v3.4"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </header>

      {canEdit ? <Toolbar editor={editor} onComment={startComment} /> : null}

      {status === "conflict" ? (
        <div className="alert alert-error" role="alert" style={{ margin: "12px 16px 0" }}>
          <span style={{ flex: 1 }}>
            This document changed in another tab, so your last edit was not
            applied.
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      ) : null}

      {status !== "conflict" && remotePending ? (
        <div className="alert alert-info" role="status" style={{ margin: "12px 16px 0" }}>
          <span style={{ flex: 1 }}>
            Someone else saved a newer version while you were editing.
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void reloadFromServer(true)}
          >
            Load it
          </button>
        </div>
      ) : null}

      {status === "error" ? (
        <div className="alert alert-error" role="alert" style={{ margin: "12px 16px 0" }}>
          <span style={{ flex: 1 }}>
            We could not save that change. Your text is still here — keep editing
            and we will retry, or reload if the problem continues.
          </span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => void flush()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="editor-body">
        <aside className="rail" aria-label="Document details">
          <div className="rail-item">
            <span className="rail-value">
              {status === "saved" ? "saved" : status === "saving" ? "saving" : status === "dirty" ? "editing" : "issue"}
            </span>
            <span className="rail-label">state</span>
          </div>

          <div className="rail-item">
            <span className="rail-value">{words.toLocaleString()}</span>
            <span className="rail-label">words</span>
          </div>

          <div className="rail-item">
            <span className="rail-value">{readingMinutes(words)} min</span>
            <span className="rail-label">read</span>
          </div>

          <div className="rail-item">
            <span className="rail-value">{openComments}</span>
            <span className="rail-label">open notes</span>
          </div>

          <div className="rail-track" aria-hidden="true">
            <div
              className="rail-progress"
              style={{ height: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </aside>

        <div className="doc-canvas">
          {!canEdit ? (
            <div className="alert alert-info" style={{ marginBottom: 22 }}>
              <span style={{ flex: 1 }}>
                <strong style={{ fontWeight: 600 }}>Read-only.</strong>{" "}
                {ownerName} shared this document with you as a viewer. Ask them to
                change it to “can edit” if you need to make changes.
              </span>
            </div>
          ) : null}

          <div
            className="doc-body"
            data-readonly={canEdit ? "false" : "true"}
            onClick={onDocumentClick}
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {panel === "comments" ? (
        <CommentsPanel
          comments={comments}
          currentUserId={currentUser.id}
          isOwner={isOwner}
          canComment={canEdit}
          activeId={activeCommentId}
          anchoredIds={anchoredIds}
          draftQuote={draftQuote}
          draft={draft}
          busy={commentBusy}
          error={commentError}
          onDraftChange={setDraft}
          onSubmit={() => void submitComment()}
          onCancelDraft={() => {
            setDraftQuote(null);
            setDraftRange(null);
            setDraft("");
            setCommentError(null);
          }}
          onSelect={selectComment}
          onResolve={(id) => void resolveComment(id)}
          onDelete={(id) => void deleteComment(id)}
          onClose={() => setPanel("none")}
        />
      ) : null}

      {panel === "history" ? (
        <HistoryPanel
          documentId={document.id}
          expectedUpdatedAt={version.current}
          canRestore={canEdit}
          onClose={() => setPanel("none")}
          onRestored={(updated) => {
            if (!editor) return;

            editor.commands.setContent(updated.contentHtml, false);

            // An old snapshot can carry anchors for comments that no longer
            // exist. Drop those marks so the restored document has no
            // highlight pointing at a thread that was deleted.
            const known = new Set(comments.map((comment) => comment.id));
            for (const id of anchoredCommentIds(editor)) {
              if (!known.has(id)) removeCommentMarks(id);
            }

            version.current = updated.updatedAt;
            setSavedAt(updated.updatedAt);
            setTitle(updated.title);
            setWords(countWords(updated.contentText));
            setAnchoredIds(anchoredCommentIds(editor));
            setStatus("saved");
            setPanel("none");
            void saveNow();
            showNotice("Version restored");
          }}
        />
      ) : null}

      {notice ? (
        <div className="toast" role="status">
          {notice}
        </div>
      ) : null}

      {shareOpen && isOwner ? (
        <ShareDialog
          documentId={document.id}
          ownerName={ownerName}
          initialShares={shares}
          onClose={() => setShareOpen(false)}
        />
      ) : null}

      {confirmDelete ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Delete document"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirmDelete(false);
          }}
        >
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-head">
              <div>
                <h2>Delete “{title}”?</h2>
                <p>
                  This removes the document for everyone it is shared with. There
                  is no undo in this build.
                </p>
              </div>
            </div>
            <div className="modal-body" style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => void handleDelete()}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete document"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <span className="sr-only">
        Signed in as {currentUser.name} ({currentUser.email})
      </span>
    </div>
  );
}
