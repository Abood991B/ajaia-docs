# Ajaia Docs

A scoped, full-stack collaborative document editor: create a document, write it
with real rich text, import a file into it, comment on a passage, share it with
a teammate, and trust that it is still there after a refresh.

**Live app:** https://ajaia-docs-rho-one.vercel.app

---

## Demo accounts

All three seeded accounts use the same password: `Ajaia2026!`

| Account | Email | What to look at |
| --- | --- | --- |
| Abdulrahman Baidaq | `abdulrahman16baidaq@gmail.com` | Owns two documents. Can share and delete. |
| Maya Chen | `maya@ajaia.test` | Has **edit** access to “Product brief — Ajaia Docs”, owns one document. |
| Sam Ortiz | `sam@ajaia.test` | Has **view-only** access to the same brief. |

The login screen lists all three with one-click fill, so a reviewer does not
have to type an email. You can also create a fresh account from `/register`.

**To see the whole model in about two minutes:**

1. Sign in as Abdulrahman → open “Product brief” → edit a line, wait for
   *Saved*, reload. The formatting survives.
2. Select a sentence and press **COMMENT** in the toolbar. The thread appears in
   the right rail, anchored to those words. Reload: the anchor is still on the
   same words.
3. Press **History**. Every save is a snapshot. Open an older one and restore it;
   the restore is itself a new version, so nothing is lost.
4. Open the same document in a second tab and edit it. The first tab shows
   *Updated by someone else* and adopts the new text.
5. Sign out, sign in as Sam. The toolbar is gone, the editor is read-only, the
   comments are visible but not actionable, and the dashboard lists the
   document under “Shared with you”.

---

## Run it locally

Requires Node 20+ and npm. No database server, no Docker, no accounts.

```bash
npm install
npm run db:setup     # creates ./local.db, applies the schema, seeds users and documents
npm run dev          # http://localhost:3000
```

That is the whole setup. The app uses a libSQL file (`./local.db`) locally and
Turso in production — the same engine and the same SQL, so there is no schema
drift between the two.

### Tests

```bash
npm test             # 60 unit tests, Vitest
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run lint         # eslint
```

Against a running server, the API surface is covered end to end:

```bash
node scripts/e2e-api.mjs http://localhost:3000
```

That script drives 39 checks across every endpoint and every role, including the
ones that must fail: a viewer writing, a stranger reading, a stale save, an
expired comment id, a duplicate registration. It creates and deletes its own
scratch document. `node scripts/cleanup-qa.mjs` removes any probe accounts left
behind if a run is interrupted.

The unit suite targets the parts where a bug is a security or data-integrity
problem rather than a cosmetic one: the permission matrix, the text pipeline,
the import parsers, comment-id validation, version retention and search.

### Environment

Nothing is required locally. `.env.example` documents the two optional groups:

```bash
AUTH_SECRET=...              # signs the session cookie; required in production
TURSO_DATABASE_URL=...       # when set, the app talks to Turso instead of ./local.db
TURSO_AUTH_TOKEN=...
```

---

## What it does

**Documents** — create, rename inline, edit, delete. Autosave with a visible
save state, plus a conflict guard if the same document is open in two tabs.

**Rich text** — bold, italic, underline, H1–H3, bulleted and numbered lists,
blockquote, inline code, undo/redo, clear formatting. Built on Tiptap, so paste,
undo history and keyboard shortcuts behave the way people expect.

**Comments** — select a passage, press **COMMENT**, write. The thread lives in
the right rail and is anchored by a mark inside the document, so it survives
edits around it. Resolve removes the highlight and archives the thread.
Authors can delete their own comments; the document owner can delete any.

**Version history** — every body save writes a snapshot (the newest 30 are
kept). Open one to preview it, restore it in one click. Restoring writes a new
version rather than deleting history.

**Live sync and presence** — open tabs poll a small sync endpoint. If the
document changed and you are idle, the text updates in place with a notice; if
you are mid-edit, you get a banner instead of a silent overwrite. The header
shows who else has the document open.

**Import** — `.md`, `.markdown`, `.txt` and `.docx` up to 2 MB. Markdown is
converted to HTML, `.docx` goes through mammoth, plain text becomes paragraphs.
Import creates a new document; **Insert file** in the editor appends to the one
you are in. Neither stores an attachment — the result is editable content.

**Sharing** — an owner grants *Can view* or *Can edit* to another account. The
dashboard separates “Your documents” from “Shared with you”, and every request
is checked on the server. Viewers get a read-only editor, not a disabled
toolbar.

**Search** — the dashboard search runs in SQL over titles and full document
bodies, not just the card excerpt, and shows a snippet around the match.

**Accounts** — three seeded accounts plus self-service registration. No email
verification, no password reset (see `SECURITY.md`).

**Persistence** — documents, comments, versions, presence and share grants live
in SQLite (libSQL), so everything survives refreshes and redeploys.

---

## Deliberately not built

| Not built | Why |
| --- | --- |
| Live cursors / multi-caret editing | A CRDT needs a stateful WebSocket server. Vercel's serverless runtime cannot hold the socket, and a half-working Yjs demo would make the editing experience worse, not better. The poll-plus-version-guard in this build is honest about its latency. |
| Comment replies and mentions | One thread per selection is enough to prove the anchoring model. Replies need a thread table and notification rules. |
| Version diffing | Snapshots and restore are useful on their own; a semantic diff is a separate editor-sized problem. |
| Binary attachments | Import covers “a file enters the product” without blob storage, signed URLs or orphan cleanup. |
| Email invites, public links | The directory demonstrates the permission model without an email provider. A tokenised public link is a different access path and deserves its own table. |

`SUBMISSION.md` lists the same cuts against what actually shipped.

---

## Project layout

```
src/
  app/
    page.tsx                  dashboard (server component)
    login/page.tsx            sign-in
    register/page.tsx         sign-up
    d/[id]/page.tsx           document route (server component)
    api/                      route handlers: auth, documents, comments,
                              versions, sync, import, share, users
  components/
    editor/DocumentEditor.tsx editor shell: autosave, sync, panels
    editor/CommentMark.ts     the Tiptap mark that anchors a comment
    editor/CommentsPanel.tsx  thread list and composer
    editor/HistoryPanel.tsx   version list, preview, restore
    editor/Toolbar.tsx        formatting controls
    editor/ShareDialog.tsx    grant and revoke access
    DashboardClient.tsx       create, import, server-backed search
  server/
    documents.ts              document + share data access, search
    comments.ts               comment reads and mutations
    versions.ts               snapshots and retention
    presence.ts               viewer heartbeats
    users.ts                  account directory
  lib/
    access.ts                 pure permission rules        ← unit tested
    comments.ts               ids, previews, counts        ← unit tested
    versions.ts               retention policy             ← unit tested
    search.ts                 matching and snippets        ← unit tested
    auth.ts                   session cookie, JWT
    password.ts               scrypt hashing
    import.ts                 file → HTML pipeline         ← unit tested
    text.ts                   HTML/text helpers            ← unit tested
    http.ts                   JSON envelope, zod body parsing
    guard.ts                  request guards (auth + document access)
  db/
    schema.ts                 Drizzle schema
    migrate.ts                idempotent DDL
    seed.ts                   three users, three documents, three grants
tests/                        Vitest suites
scripts/                      setup, e2e, maintenance helpers
```

---

## Notes and limits

- Auth is deliberately lightweight: seeded accounts, scrypt-hashed passwords,
  an HS256 JWT in an httpOnly cookie. There is no sign-up gate, password reset
  or email verification.
- The document body is stored as HTML plus a plain-text projection. HTML is the
  interchange format; ProseMirror's schema is the validation layer when it is
  loaded back into the editor. The text projection is derived server-side on
  save, so the word count and search index cannot drift from the body.
- Imported HTML and every save are scrubbed of `<script>`, `<style>`, inline
  handlers and `javascript:` URLs.
- Live sync polls every four seconds while the tab is visible. It is not
  real-time in the CRDT sense; see `ARCHITECTURE.md` for why.
- Production runs on Vercel with Turso. The free tiers are sufficient; nothing
  in the stack requires a paid dependency.
