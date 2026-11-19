"use client";

import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import type { Role } from "@/lib/access";
import type { DocumentDto, ShareDto } from "@/lib/dto";
import { relativeTime } from "@/lib/format";
import { countWords, readingMinutes } from "@/lib/text";
import { ShareDialog } from "./ShareDialog";
import { Toolbar } from "./Toolbar";

type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";

type Props = {
  document: DocumentDto;
  role: Role;
  ownerName: string;
  shares: ShareDto[];
  currentUser: { id: string; name: string; email: string };
};

const STATUS_COLOR: Record<SaveStatus, string> = {
  saved: "var(--ok)",
  dirty: "var(--warn)",
  saving: "var(--accent)",
  error: "var(--danger)",
  conflict: "var(--danger)",
};

export function DocumentEditor({
  document,
  role,
  ownerName,
  shares,
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

  const version = useRef(document.updatedAt);
  const pending = useRef<{ html: string; text: string } | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    const payload = pending.current;
    if (!payload) return;
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
        return;
      }

      if (!response.ok) {
        pending.current = payload;
        setStatus("error");
        return;
      }

      const body = (await response.json()) as { document: DocumentDto };
      version.current = body.document.updatedAt;
      setSavedAt(body.document.updatedAt);
      setStatus("saved");
    } catch {
      pending.current = payload;
      setStatus("error");
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
      onUpdate: ({ editor: instance }) => {
        const text = instance.getText();
        setWords(countWords(text));
        if (canEdit) scheduleSave(instance.getHTML(), text);
      },
    },
    [document.id],
  );

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

  const savedLabel = useMemo(() => {
    if (status === "saving") return "Saving…";
    if (status === "dirty") return "Unsaved changes";
    if (status === "error") return "Save failed — retrying on next edit";
    if (status === "conflict") return "Changed elsewhere";
    if (now === null) return "Saved";
    return `Saved ${relativeTime(savedAt, now)}`;
  }, [status, savedAt, now]);

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

        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
          <span
            className="mono"
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

      {canEdit ? <Toolbar editor={editor} /> : null}

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

          <div className="doc-body" data-readonly={canEdit ? "false" : "true"}>
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

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
