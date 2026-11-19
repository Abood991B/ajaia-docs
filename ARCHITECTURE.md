# Architecture note

## The decision that shaped everything

The prompt asks for five capabilities in four hours. The temptation is to build
five shallow features. The instruction that actually matters is *“prioritize
depth in a few important areas over shallow coverage everywhere.”*

So the build is organised around one question: **what does a reviewer touch
first, and does that path feel finished?**

The answer is the editing loop. Create → write with real formatting → see it
save → refresh and find it intact. Everything else is arranged so that loop is
never interrupted. Sharing, import, comments and history were built to be
*complete at small scale* rather than *partial at large scale*.

One cut still defines the shape of the collaboration story:

**No live cursors.** A CRDT needs a stateful WebSocket server; Vercel's
serverless runtime cannot hold the socket open. Shipping a Yjs demo that
half-works would damage the “quality of the editing experience” criterion more
than not shipping it. Instead, the editor polls a small sync endpoint, adopts
remote changes when idle, and refuses to overwrite when it is not. That is
honest about its latency and it cannot lose data.

## Stack

| Layer | Choice | Reason |
| --- | --- | --- |
| App | Next.js 15 App Router, TypeScript | One deployable unit. Server components read the database directly; route handlers form a legible API surface. |
| Editor | Tiptap 2 (ProseMirror) | Correct undo, paste and schema behaviour. A hand-rolled `contentEditable` would have consumed the timebox and still felt wrong. |
| Data | libSQL + Drizzle ORM | `file:./local.db` locally, Turso in production. Same engine, same SQL, no Docker, no local Postgres install. |
| Auth | `scrypt` + HS256 JWT in an httpOnly cookie | ~50 lines, no configuration surface, fully explainable. |
| Validation | zod at every mutation boundary | Errors are shaped once and returned consistently. |
| Tests | Vitest on the pure modules; a scripted API suite for roles and routes | The highest-consequence logic is testable without a database. |
| Hosting | Vercel + Turso | Both free, no card, no paid dependency for reviewers. |

## Data model

```
users(id, email UNIQUE, name, password_hash, created_at)

documents(id, owner_id → users, title, content_html, content_text,
          created_at, updated_at)

document_shares(id, document_id → documents, user_id → users,
                role CHECK IN ('VIEWER','EDITOR'), created_at,
                UNIQUE(document_id, user_id))

document_comments(id, document_id → documents, author_id → users,
                  body, quoted_text, resolved_at NULL, created_at)

document_versions(id, document_id → documents, title, content_html,
                  content_text, created_by → users, created_at)

document_presence(document_id, user_id, last_seen_at,
                  PRIMARY KEY(document_id, user_id))
```

Four deliberate choices:

- **`content_html` + `content_text`.** HTML is the interchange format that
  Markdown and `.docx` both collapse into; the plain-text projection powers
  excerpts, word counts and search. The projection is recomputed on the server
  from the HTML on every save, so it cannot drift from the body.
- **Role lives on the share row, ownership lives on the document.** There is no
  `OWNER` value in the share table, so an owner cannot be downgraded by a stray
  share row and a share request cannot escalate to ownership.
- **A comment is anchored by a mark, not an offset.** The id lives in the
  document HTML as `<span data-comment-id>`. Offsets rot the moment anyone types
  above them; a mark moves with its text. If the text is deleted, the mark goes
  with it and the UI says the anchor was removed instead of silently pointing at
  the wrong words.
- **Versions are snapshots of saves, not diffs.** A snapshot is cheap at this
  size, restore is a copy, and an append-only history cannot corrupt the
  document. The newest 30 per document are kept.

## Access control

`src/lib/access.ts` is pure: no database, no framework, no request context.
`src/lib/guard.ts` composes it with the session and the document loader.

| Actor | Sees the document | Read | Edit | Share | Delete | Comment |
| --- | --- | --- | --- | --- | --- | --- |
| Owner | “Your documents” | yes | yes | yes | yes | create, resolve, delete any |
| Editor | “Shared with you” | yes | yes | no | no | create, resolve, delete own |
| Viewer | “Shared with you” | yes | no | no | no | read only |
| Stranger | nowhere | **404** | 404 | 404 | 404 | 404 |

Three details worth calling out:

- **Strangers get 404, not 403.** A 403 confirms that a document with that id
  exists. The loader returns `null` for “not found” and “no access” alike.
- **Authorisation is enforced in the route handler, not the component.** The
  read-only editor is a UX affordance; the server rejects the write regardless
  of what the client renders. `PATCH` requires `canEdit`, `POST /comments`
  requires `canEdit`, `POST /share` and `DELETE /documents` require ownership.
- **Viewers can read comments but cannot write them.** A “commenter” grant would
  be a fourth role; this build keeps the matrix to three and documents the
  choice rather than smuggling comment rights into “view”.

## Autosave

```
editor update
   → debounce 700 ms
   → PATCH { contentHtml, contentText, expectedUpdatedAt }
   → 200: store new updatedAt as the version, write a snapshot
   → 409: stop writing, show “changed elsewhere”, offer reload
```

`expectedUpdatedAt` is an optimistic-concurrency guard. It costs one integer and
prevents the silent data loss that happens when the same document is open in two
tabs. Three additional protections: `beforeunload` warns if a save is pending,
unmount fires a `keepalive` request for anything unsaved, and a failed save keeps
the payload so the next edit retries rather than discards.

## Live sync

```
every 4 s, while the tab is visible
   → GET /sync  { updatedAt, viewers[], unresolvedComments }
   → remote updatedAt > my version?
        idle   → GET /documents/:id, replace content, toast
        editing → banner, do not overwrite
```

Polling instead of a socket is the load-bearing decision. It costs one small
request per open tab and it works on a serverless platform with no extra
service. Presence is a heartbeat row that expires after two minutes, cleared on
unmount with `keepalive` so the avatar disappears promptly.

The failure mode is a four-second window in which two people can both start
writing; the version guard turns that into a visible conflict rather than lost
text. That trade is documented in the UI copy, not hidden.

## Import pipeline

```
File → extension + size check → .md: marked / .docx: mammoth / .txt: paragraph split
     → scrubHtml (script, style, inline handlers, javascript: URLs)
     → stripHtml for the text projection
     → createDocument, or append for “Insert file”
```

The file never touches disk. Nothing is stored as an attachment, so there is no
storage bucket, no signed URL, no orphan cleanup — and the result is immediately
editable, which is the point of the feature.

## Deployment

Vercel for the app, Turso for the database, environment variables set per
environment. Three things were fixed during deployment and are worth recording
because they are the kind of issue that eats an hour:

1. `next/font/google` failed during the Vercel build. Fonts are now downloaded
   once and served via `next/font/local`, which also removes a build-time
   network dependency.
2. Vercel Deployment Protection was on by default, which served an SSO wall to
   anyone without a Vercel account. It is disabled for this project so the
   reviewer link is genuinely public.
3. `.docx` import passed `{ arrayBuffer }` to mammoth, which is the *browser*
   input shape. Its Node build accepts `{ path | buffer | file }` and rejects
   anything else, but the published types union both, so `tsc` was happy and
   only a real upload at runtime failed. The fix is `{ buffer }`; the regression
   test builds a `.docx` in memory and runs the real parser.

## What I would do with another 2–4 hours

1. **Live cursors** — move the sync layer to a WebSocket host (Cloudflare Durable
   Objects or a small Fly machine) with Yjs, and retire the poll and the version
   guard once the CRDT owns convergence.
2. **Comment replies and mentions** — a thread table on top of the existing
   anchor, plus a notification feed.
3. **A semantic diff in history** — right now a version is previewed whole;
   “what changed” needs a word-level diff view.
4. **A commenter role** — so a reviewer can annotate without edit rights, which
   is the real-world shape this build approximates.
5. **Public read-only links** — a tokenised URL is a different access path from
   a per-user grant and deserves its own table and revocation flow.
