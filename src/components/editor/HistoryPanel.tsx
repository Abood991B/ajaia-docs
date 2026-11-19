"use client";

import { useEffect, useState } from "react";
import type { DocumentDto, VersionDto, VersionSummaryDto } from "@/lib/dto";
import { relativeTime } from "@/lib/format";
import { scrubHtml } from "@/lib/text";

type Props = {
  documentId: string;
  expectedUpdatedAt: number;
  canRestore: boolean;
  onClose: () => void;
  onRestored: (document: DocumentDto) => void;
};

export function HistoryPanel({
  documentId,
  expectedUpdatedAt,
  canRestore,
  onClose,
  onRestored,
}: Props) {
  const [versions, setVersions] = useState<VersionSummaryDto[] | null>(null);
  const [selected, setSelected] = useState<VersionDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/documents/${documentId}/versions`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok) {
          setError(body?.error?.message ?? "Could not load history.");
          setVersions([]);
          return;
        }
        setVersions(body.versions as VersionSummaryDto[]);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load history.");
          setVersions([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function openVersion(id: string) {
    setError(null);
    const response = await fetch(
      `/api/documents/${documentId}/versions/${id}`,
      { cache: "no-store" },
    );
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? "Could not load that version.");
      return;
    }
    setSelected(body.version as VersionDto);
  }

  async function restore() {
    if (!selected) return;
    setBusy(true);
    setError(null);

    const response = await fetch(
      `/api/documents/${documentId}/versions/${selected.id}/restore`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expectedUpdatedAt }),
      },
    );

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? "Could not restore that version.");
      setBusy(false);
      return;
    }

    onRestored(body.document as DocumentDto);
  }

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Version history"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal history-modal">
        <div className="modal-head">
          <div>
            <h2>{selected ? "Preview version" : "Version history"}</h2>
            <p>
              {selected
                ? "A snapshot from the history. Restoring writes it back as a new save."
                : "Every save keeps a snapshot. The newest 30 are retained."}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onClose}
            aria-label="Close history"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error ? (
            <div className="alert alert-error" role="alert" style={{ marginBottom: 12 }}>
              {error}
            </div>
          ) : null}

          {selected ? (
            <>
              <div className="history-preview doc-body">
                <div
                  className="ProseMirror"
                  // Stored HTML is our own editor output, but previews are
                  // scrubbed anyway: the renderer should never trust a string
                  // because of where it came from.
                  dangerouslySetInnerHTML={{ __html: scrubHtml(selected.contentHtml) }}
                />
              </div>

              <div className="history-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSelected(null)}
                  disabled={busy}
                >
                  Back to list
                </button>
                {canRestore ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void restore()}
                    disabled={busy}
                  >
                    {busy ? "Restoring…" : "Restore this version"}
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="history-list">
              {versions === null ? (
                <p className="mono">Loading…</p>
              ) : versions.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--muted)" }}>
                  No snapshots yet. Versions appear after the first save.
                </p>
              ) : (
                versions.map((version, index) => (
                  <button
                    key={version.id}
                    type="button"
                    className="history-row"
                    onClick={() => void openVersion(version.id)}
                  >
                    <span>
                      <strong>{relativeTime(version.createdAt)}</strong>
                      {index === 0 ? <span className="badge">latest</span> : null}
                    </span>
                    <span className="mono">
                      {version.authorName} · {version.wordCount} words
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
