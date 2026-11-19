# Submission — Ajaia Docs

**Live app:** https://ajaia-docs-rho-one.vercel.app
**Source:** https://github.com/Abood991B/ajaia-docs
**Walkthrough video:** `<paste the unlisted Loom or YouTube URL here>`

**Demo password for all three seeded accounts:** `Ajaia2026!`
`abdulrahman16baidaq@gmail.com` (owner) · `maya@ajaia.test` (can edit) ·
`sam@ajaia.test` (can view)

## What this is

A scoped, full-stack collaborative document editor. You can create a document,
write it with real rich text, import a file into it, comment on a passage, share
it with a teammate as an editor or a viewer, and everything survives a refresh.

The brief asked for depth in a few areas rather than shallow coverage
everywhere, so the build is organised around one path: create → write → save →
refresh. Everything else was arranged so that path feels finished. That is also
why two things are deliberately missing — a half-working CRDT and an attachment
bucket would both have made the core loop worse.

## What is complete

- **Documents:** create, rename inline (autosaved), edit, delete.
- **Rich text:** bold, italic, underline, H1–H3, bulleted and numbered lists,
  blockquote, inline code, undo/redo, clear formatting.
- **Autosave:** debounced, with a visible save state and an optimistic
  concurrency guard (`expectedUpdatedAt`) that turns a second tab into a visible
  conflict instead of silent data loss.
- **Comments:** anchored to a text selection by a mark inside the document, so
  the anchor moves with the text and survives reloads. Create, resolve, delete;
  authors delete their own, the owner can moderate any; viewers can read but not
  act.
- **Version history:** a snapshot on every body save, the newest 30 retained,
  preview and one-click restore. Restoring writes a new version rather than
  erasing history.
- **Live sync and presence:** open tabs poll a small endpoint every four
  seconds. An idle tab adopts a remote change with a notice; a tab that is
  mid-edit refuses to overwrite and shows a banner. The header shows who else
  has the document open.
- **Import:** `.md`, `.markdown`, `.txt`, `.docx` up to 2 MB, converted into an
  editable document. **Insert file** appends the same formats to the open
  document. Nothing is stored as an attachment.
- **Sharing:** owner / editor / viewer, enforced on the server for every read
  and write. Separate “Your documents” and “Shared with you” lists. Strangers
  receive `404`, not `403`, so the API does not confirm a document exists.
- **Search:** SQL over full document bodies, not just the card excerpt, with a
  snippet around the match.
- **Accounts:** three seeded accounts, self-service registration, scrypt-hashed
  passwords, a signed httpOnly session cookie.
- **Persistence:** libSQL (SQLite) as a local file in development, Turso in
  production — the same engine and SQL, so there is no schema drift.
- **Quality gates:** 60 unit tests, a 39-check API suite that runs against the
  deployed build, clean typecheck, clean lint, clean production build.
- **Deployment:** publicly reachable on Vercel with no paid dependency.

## How it was verified

- `npm test` — 60 Vitest cases over the permission matrix, the import parsers
  (including a generated `.docx` through the real mammoth build), comment ids,
  version retention, search matching and the HTML/text pipeline.
- `node scripts/e2e-api.mjs <url>` — 39 checks against the running production
  deployment, covering every endpoint and every role, including the cases that
  must fail: a viewer writing, a viewer commenting, a viewer restoring, a
  stranger reading, a stale save, an invalid comment id, a duplicate email.
- Manual passes on the deployed build, not localhost: all three roles plus a
  newly registered account; comment create → reload → resolve; history restore;
  two-tab sync; insert file; search; and the 375 px layout.
- Three production-only bugs were found this way and fixed: a Google Fonts fetch
  that broke the Vercel build, Vercel Deployment Protection serving an SSO wall,
  and mammoth receiving its browser-only `arrayBuffer` argument instead of a
  Node `buffer`.

## What is deliberately cut or partial

- **No live cursors or multi-caret editing.** A CRDT needs a stateful WebSocket
  server; Vercel's serverless runtime cannot hold the socket. The poll plus
  version guard is the honest version of collaboration without one: two people
  editing inside the same four-second window get a loud conflict, not a merge.
- **No comment replies, mentions or notifications.** One thread per selection.
- **No semantic diff between versions.** A version is previewed whole.
- **No trash or undo for deletion.** Deleting a document is immediate.
- **No dedicated commenter role.** Viewing is read-only; commenting requires
  edit access.
- **Import appends or creates.** It cannot insert at the cursor.
- **No pagination.** Search handles scale better than the document list does.

## What I would build next with another 2–4 hours

1. **Live cursors** — Yjs over a WebSocket host (Durable Objects or a small Fly
   machine), retiring the poll and the version guard once the CRDT owns
   convergence.
2. **Comment replies and mentions** — a thread table on top of the existing
   anchor, plus a notification feed.
3. **Version diff** — word-level “what changed” in the history preview.
4. **A commenter role** — annotate without edit rights.
5. **Public read-only links** — a tokenised URL with its own revocation flow.

## Stack

Next.js 15 (App Router, TypeScript) · Tiptap 2 · Drizzle ORM on libSQL/Turso ·
`jose` JWT in an httpOnly cookie with scrypt-hashed passwords · zod validation ·
Vitest · Tailwind v4 · Vercel. The architecture note covers the data model, the
access matrix, the autosave and sync design, and the deployment gotchas.

## Try it in five minutes

1. Open the live URL and use the one-click **Abdulrahman** button.
2. Open **Product brief — Ajaia Docs**, type, watch *Unsaved changes* →
   *Saving…* → *Saved*, then refresh.
3. Select a sentence, press **COMMENT**, write, reload — the anchor holds.
4. Press **History**, open a snapshot, restore it.
5. **Share** → add **Sam Ortiz** as *Can view*, sign in as Sam, open the same
   document: no toolbar, read-only editor, comments visible but not actionable.
6. Open the document in a second tab, type, and watch the first tab announce
   *Updated by someone else*.

## Notes

- The seeded demo password is public by design — it is printed in the README and
  on the sign-in screen, and it protects only the demo dataset.
- Secret-scanning alerts on this repository are false positives; `SECURITY.md`
  explains exactly which values are public and which are not.
- Imported HTML and every save are scrubbed of scripts, inline handlers and
  `javascript:` URLs, and the editor's schema is the second validation layer.
