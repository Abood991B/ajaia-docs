"use client";

import { useEffect, useState } from "react";
import type { ShareDto } from "@/lib/dto";

type DirectoryUser = { id: string; name: string; email: string };

type Props = {
  documentId: string;
  ownerName: string;
  initialShares: ShareDto[];
  onClose: () => void;
};

export function ShareDialog({
  documentId,
  ownerName,
  initialShares,
  onClose,
}: Props) {
  const [shares, setShares] = useState<ShareDto[]>(initialShares);
  const [directory, setDirectory] = useState<DirectoryUser[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"VIEWER" | "EDITOR">("VIEWER");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!cancelled && body?.users) setDirectory(body.users);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addShare(targetEmail: string, targetRole: "VIEWER" | "EDITOR") {
    setBusy(true);
    setError(null);

    const response = await fetch(`/api/documents/${documentId}/share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: targetEmail, role: targetRole }),
    });

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? "Could not share this document.");
      setBusy(false);
      return;
    }

    setShares(body.shares as ShareDto[]);
    setEmail("");
    setBusy(false);
  }

  async function removeShare(userId: string) {
    setBusy(true);
    setError(null);

    const response = await fetch(
      `/api/documents/${documentId}/share?userId=${encodeURIComponent(userId)}`,
      { method: "DELETE" },
    );

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setError(body?.error?.message ?? "Could not remove access.");
      setBusy(false);
      return;
    }

    setShares(body.shares as ShareDto[]);
    setBusy(false);
  }

  const sharedIds = new Set(shares.map((share) => share.userId));
  const suggestions = directory.filter((user) => !sharedIds.has(user.id));

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Share document"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal-head">
          <div>
            <h2>Share this document</h2>
            <p>
              {ownerName} owns it. People you add can edit or only read, and the
              dashboard reflects the difference immediately.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-icon"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <input
              className="input"
              type="email"
              placeholder="teammate@ajaia.test"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Email address"
            />
            <select
              className="input"
              style={{ width: 118, flex: "none" }}
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "VIEWER" | "EDITOR")
              }
              aria-label="Permission"
            >
              <option value="VIEWER">Can view</option>
              <option value="EDITOR">Can edit</option>
            </select>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || email.trim().length < 3}
              onClick={() => void addShare(email.trim(), role)}
            >
              Add
            </button>
          </div>

          {error ? (
            <div className="alert alert-error" role="alert" style={{ marginBottom: 12 }}>
              {error}
            </div>
          ) : null}

          {suggestions.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <p className="eyebrow" style={{ marginBottom: 8 }}>
                Seeded accounts
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {suggestions.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="btn btn-sm"
                    disabled={busy}
                    onClick={() => void addShare(user.email, "EDITOR")}
                    title={`Add ${user.email} as an editor`}
                  >
                    + {user.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <p className="eyebrow" style={{ marginBottom: 8 }}>
            People with access
          </p>

          <div style={{ display: "grid", gap: 6 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "9px 11px",
                border: "1px solid var(--line-soft)",
                borderRadius: 7,
                background: "#fbfcfd",
              }}
            >
              <span style={{ fontSize: 12.5 }}>
                <strong>{ownerName}</strong>
                <span className="mono" style={{ marginLeft: 8 }}>
                  owner
                </span>
              </span>
              <span className="badge badge-owner">Full access</span>
            </div>

            {shares.map((share) => (
              <div
                key={share.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "9px 11px",
                  border: "1px solid var(--line)",
                  borderRadius: 7,
                }}
              >
                <span style={{ fontSize: 12.5, minWidth: 0 }}>
                  <strong>{share.name}</strong>
                  <span
                    className="mono"
                    style={{ display: "block", textTransform: "none" }}
                  >
                    {share.email}
                  </span>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="badge">
                    {share.role === "EDITOR" ? "Can edit" : "Can view"}
                  </span>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    disabled={busy}
                    onClick={() => void removeShare(share.userId)}
                  >
                    Remove
                  </button>
                </span>
              </div>
            ))}

            {shares.length === 0 ? (
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)" }}>
                Only you can see this document right now.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
