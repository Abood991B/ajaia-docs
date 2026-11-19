# Submission

**Candidate:** Abdulrahman Baidaq
**Live app:** https://ajaia-docs-rho-one.vercel.app
**Source:** https://github.com/Abood991B/ajaia-docs
**Walkthrough video:** `<paste the unlisted Loom or YouTube URL here>`

**Demo password for all three seeded accounts:** `Ajaia2026!`
`abdulrahman16baidaq@gmail.com` · `maya@ajaia.test` · `sam@ajaia.test`

*This file is written to be pasted directly into the portal's submission field
— it is 110 lines, well under the 1,000-line limit.*

## What is in this folder

| File | What it is |
| --- | --- |
| `README.md` | Setup, demo credentials, feature list, project layout |
| `ARCHITECTURE.md` | Scope decisions, stack rationale, data model, access matrix, autosave and sync design |
| `AI-WORKFLOW.md` | Tools used, what AI accelerated, what was changed or rejected, how it was verified |
| `SECURITY.md` | What is deliberately public, what is secret, how to rotate |
| `SUBMISSION.md` | This file |
| `WALKTHROUGH-VIDEO-URL.txt` | Unlisted walkthrough link || `docs/screenshots/` | Login, dashboard, editor, comments rail, history list and preview, share dialog, read-only view, search, imported document, mobile layout |
| `src/` | Application source |
| `tests/` | Vitest suites |
| `scripts/e2e-api.mjs` | 39-check API suite used to verify every role and endpoint |

## Review in five minutes

1. Open the live URL. Sign in with the one-click **Abdulrahman** button
   (password is filled automatically).
2. Open **Product brief — Ajaia Docs**. Click into the text and type. Watch the
   top-right indicator move from *Unsaved changes* → *Saving…* → *Saved*.
   Refresh the page: the text and the formatting are still there.
3. Select a sentence and press **COMMENT** in the toolbar. Write a note. The
   thread appears in the right rail, anchored to those words. Reload: still
   anchored.
4. Press **History**, open an older snapshot, then **Restore this version**.
   The restore appears as a new entry rather than erasing the list.
5. Click **Share**, add **Sam Ortiz** as *Can view*. Sign out, sign in as
   **Sam**, open the same document. There is no toolbar, the editor is
   read-only, and the comment thread is visible but not actionable.
6. Back as Abdulrahman: **Insert file** appends a `.md` or `.docx` to the open
   document. **Import file** on the dashboard creates a new one.
7. Open the same document in a second tab, type in it, and watch the first tab
   announce *Updated by someone else* and adopt the text.
8. On the dashboard, search for `WebSocket` — a word that appears deep in the
   brief but not in its card excerpt — and confirm the result.

## Working

- Create, rename (inline, autosaved), edit, delete documents.
- Rich text: bold, italic, underline, H1–H3, bulleted and numbered lists,
  blockquote, inline code, undo/redo, clear formatting.
- Autosave with a visible save state and an optimistic-concurrency guard that
  detects edits from another tab.
- Comments anchored to a text selection by a document mark: create, resolve,
  delete; author-or-owner deletion; viewers can read but not act.
- Version history: a snapshot on every body save, the newest 30 retained,
  preview and one-click restore, and restore itself is a new version.
- Live sync and presence across open tabs, with an explicit banner instead of a
  silent overwrite when you are mid-edit.
- Import `.md`, `.markdown`, `.txt`, `.docx` up to 2 MB into a new document, and
  insert the same formats into an existing one.
- Server-side search across full document bodies with a match snippet.
- Sharing with *Can view* / *Can edit*, owner-only sharing and deletion,
  separate “Your documents” and “Shared with you” lists.
- Self-service registration with validation and duplicate-email rejection.
- Server-side authorisation on every read and write; strangers receive 404.
- Persistence in libSQL (SQLite) locally and Turso in production.
- Seeded accounts, login/logout, hashed passwords, signed session cookie.
- 60 unit tests, a 39-check API suite, clean typecheck, clean lint, clean
  production build.
- Publicly reachable deployment with no paid dependency.

## Incomplete

- No live cursors or multi-caret editing. Sync is a four-second poll with a
  version guard, so two people can both start writing inside that window; the
  second save is rejected loudly rather than merged.
- No comment replies, mentions, or notifications. One thread per selection.
- No semantic diff between versions. A version is previewed whole.
- No trash or undo for deletion. Deleting a document is immediate and permanent.
- There is no dedicated *commenter* role: viewing is read-only, and commenting
  requires edit access.
- Import always appends or creates; it cannot insert at the cursor.
- No pagination. The dashboard search handles scale better than the list does.

## What I would build next with another 2–4 hours

1. **Live cursors** — Yjs over a WebSocket host (Durable Objects or a small Fly
   machine), retiring the poll and the version guard once the CRDT owns
   convergence.
2. **Comment replies and mentions** — a thread table on top of the existing
   anchor, plus a notification feed.
3. **Version diff** — word-level “what changed” in the history preview.
4. **A commenter role** — annotate without edit rights.
5. **Public read-only links** — a tokenised URL with its own revocation flow.

## Known limitations

- The session secret and database token are environment variables on Vercel;
  they are not committed. `.env.example` documents both and carries no values.
- The seeded demo password is public by design; `SECURITY.md` explains why a
  secret scanner may flag it and why that is a false positive.
- Imported HTML and every save are scrubbed of scripts, inline handlers and
  `javascript:` URLs, and the editor's schema is the second validation layer.
  This is adequate for the scope but is not a substitute for a server-side
  sanitiser such as DOMPurify if untrusted HTML were ever rendered directly.
- The app assumes a single region. Turso is provisioned in `aws-ap-south-1`.
