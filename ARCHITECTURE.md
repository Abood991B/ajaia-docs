# Architecture note

## The decision that shaped everything

The prompt asks for five capabilities in four hours. The temptation is to build
five shallow features. The instruction that actually matters is *“prioritize
depth in a few important areas over shallow coverage everywhere.”*

So the build is organised around one question: **what does a reviewer touch
first, and does that path feel finished?**

The answer is the editing loop. Create → write with real formatting → see it
save → refresh and find it intact. Everything else is arranged so that loop is
never interrupted. Sharing and import were built to be *complete at small
scale* rather than *partial at large scale*.

Two cuts follow directly from that:

1. **No real-time co-editing.** A CRDT demo that half-works would actively
   damage the “quality of the editing experience” criterion.
2. **Import, not attachments.** The requirement is that a file enters the
   product workflow. Converting a file into an editable document satisfies it
   fully, and it removes blob storage, signed URLs and orphan cleanup from the
   critical path.

## Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| App | Next.js 15 App Router, TypeScript | One deployable unit. Server components read the database directly; route handlers form a legible API surface. |
| Editor | Tiptap 2 (ProseMirror) | Correct undo, paste and schema behaviour. A hand-rolled `contentEditable` would have consumed the timebox and still felt wrong. |
| Data | libSQL + Drizzle ORM | `file:./local.db` locally, Turso in production. Same engine, same SQL, no Docker, no local Postgres install. |
| Auth | `scrypt` + HS256 JWT in an httpOnly cookie | ~50 lines, no configuration surface, fully explainable. |
| Validation | zod at every mutation boundary | Errors are shaped once and returned consistently. |
| Tests | Vitest on the pure access module | The highest-consequence logic, testable without a database. |
| Hosting | Vercel + Turso | Both free, no card, no paid dependency for reviewers. |

## Data model

```
users(id, email UNIQUE, name, password_hash, created_at)

documents(id, owner_id → users, title, content_html, content_text,
          created_at, updated_at)

document_shares(id, document_id → documents, user_id → users,
                role CHECK IN ('VIEWER','EDITOR'), created_at,
                UNIQUE(document_id, user_id))
```

Two deliberate choices:

- **`content_html` + `content_text`.** HTML is the interchange format that
  Markdown and `.docx` both collapse into; the plain-text projection powers
  excerpts, word counts and future search without parsing HTML on every read.
- **Role lives on the share row, ownership lives on the document.** There is no
  `OWNER` value in the share table, so an owner cannot be downgraded by a stray
  share row and a share request cannot escalate to ownership.

## Access control

`src/lib/access.ts` is pure: no database, no framework, no request context.
`src/lib/guard.ts` composes it with the session and the document loader.

| Actor | Sees the document | Read | Edit | Share | Delete |
| --- | --- | --- | --- | --- | --- |
| Owner | “Your documents” | yes | yes | yes | yes |
| Editor | “Shared with you” | yes | yes | no | no |
| Viewer | “Shared with you” | yes | no | no | no |
| Stranger | nowhere | **404** | 404 | 404 | 404 |

Two details worth calling out:

- **Strangers get 404, not 403.** A 403 confirms that a document with that id
  exists. The loader returns `null` for “not found” and “no access” alike.
- **Authorisation is enforced in the route handler, not the component.** The
  read-only editor is a UX affordance; the server rejects the write regardless
  of what the client renders. `PATCH` requires `canEdit`, `POST /share` requires
  `canManageSharing`.

## Autosave

```
editor update
   → debounce 700 ms
   → PATCH { contentHtml, contentText, expectedUpdatedAt }
   → 200: store new updatedAt as the version
   → 409: stop writing, show “changed elsewhere”, offer reload
```

`expectedUpdatedAt` is an optimistic-concurrency guard. It costs one integer and
prevents the silent data loss that happens when the same document is open in two
tabs. Three additional protections: `beforeunload` warns if a save is pending,
unmount fires a `keepalive` request for anything unsaved, and a failed save keeps
the payload so the next edit retries rather than discards.

## Import pipeline

```
File → extension + size check → .md: marked / .docx: mammoth / .txt: paragraph split
     → scrubHtml (script, style, inline handlers, javascript: URLs)
     → stripHtml for the text projection
     → createDocument
```

The file never touches disk. Nothing is stored as an attachment, so there is no
storage bucket, no signed URL, no orphan cleanup — and the result is immediately
editable, which is the point of the feature.

## Deployment

Vercel for the app, Turso for the database, environment variables set per
environment. Two things were fixed during deployment and are worth recording
because they are the kind of issue that eats an hour:

1. `next/font/google` failed during the Vercel build. Fonts are now downloaded
   once and served via `next/font/local`, which also removes a build-time
   network dependency.
2. Vercel Deployment Protection was on by default, which served an SSO wall to
   anyone without a Vercel account. It is disabled for this project so the
   reviewer link is genuinely public.

## What I would do with another 2–4 hours

1. **Comments** — the highest-value collaboration feature after editing itself.
   Needs a mark with a stable id and a resolve state.
2. **Version history** — an append-only `document_versions` table plus a
   side-by-side diff. Autosave already produces the write points.
3. **Real-time** — Yjs over a WebSocket provider, with the existing
   `expectedUpdatedAt` guard retired once the CRDT owns convergence.
4. **Search** — `content_text` is already there; SQLite FTS5 is a small step.
5. **Share by link** — a tokenised read-only URL, which is a different access
   path than the per-user grant and deserves its own table.
