# Submission

**Candidate:** Abdulrahman Baidaq
**Live app:** https://ajaia-docs-rho-one.vercel.app
**Walkthrough video:** see `WALKTHROUGH-VIDEO-URL.txt`

## What is in this folder

| File | What it is |
| --- | --- |
| `README.md` | Setup, demo credentials, feature list, project layout |
| `ARCHITECTURE.md` | Scope decisions, stack rationale, data model, access matrix, autosave design |
| `AI-WORKFLOW.md` | Tools used, what AI accelerated, what was changed or rejected, how it was verified |
| `SUBMISSION.md` | This file |
| `WALKTHROUGH-VIDEO-URL.txt` | Unlisted walkthrough link |
| `docs/screenshots/` | Login, dashboard, editor, share dialog, read-only view |
| `src/` | Application source |
| `tests/` | Vitest suites |

## Review in five minutes

1. Open the live URL. Sign in with the one-click **Abdulrahman** button
   (password is filled automatically).
2. Open **Product brief — Ajaia Docs**. Click into the text and type. Watch the
   top-right indicator move from *Unsaved changes* → *Saving…* → *Saved*.
   Refresh the page: the text and the formatting are still there.
3. Click **Share**, add **Sam Ortiz** as *Can view*.
4. Sign out, sign in as **Sam Ortiz**, open the same document. There is no
   toolbar, the editor is read-only, and a banner explains why.
5. Sign out, sign in as **Abdulrahman**, click **Import file**, choose any
   `.md` or `.docx` file. It opens as a normal editable document.

## Working

- Create, rename (inline, autosaved), edit, delete documents.
- Rich text: bold, italic, underline, H1–H3, bulleted and numbered lists,
  blockquote, inline code, undo/redo, clear formatting.
- Autosave with a visible save state and an optimistic-concurrency guard that
  detects edits from another tab.
- Import `.md`, `.markdown`, `.txt`, `.docx` up to 2 MB, converted into an
  editable document.
- Sharing with *Can view* / *Can edit*, owner-only sharing and deletion,
  separate “Your documents” and “Shared with you” lists.
- Server-side authorisation on every read and write; strangers receive 404.
- Persistence in libSQL (SQLite) locally and Turso in production.
- Seeded accounts, login/logout, hashed passwords, signed session cookie.
- 31 automated tests, clean typecheck, clean production build.
- Publicly reachable deployment with no paid dependency.

## Incomplete

- No real-time co-editing. Two people editing the same document simultaneously
  will see the conflict notice rather than live cursors.
- No comments, suggestions or version history.
- No trash or undo for deletion. Deleting a document is immediate and permanent.
- Sharing is limited to the three seeded accounts. There is no sign-up flow, so
  a new reviewer cannot create their own user.
- Import replaces nothing and appends nothing — it always creates a new
  document. “Import into an existing draft” was in the prompt's examples but is
  not implemented.
- No pagination or search across documents; the dashboard filters client-side.

## What I would build next with another 2–4 hours

1. **Comments** — the next most valuable collaboration surface. Needs a mark
   with a stable id and a resolve state.
2. **Version history** — append-only `document_versions` plus a diff view. The
   autosave path already produces the write points.
3. **Real-time editing** — Yjs over a WebSocket provider, retiring the
   `expectedUpdatedAt` guard once the CRDT owns convergence.
4. **Sign-up** — so sharing can be demonstrated with arbitrary accounts rather
   than the seeded directory.
5. **Import into an existing document** — a second entry point in the editor
   that appends parsed content at the cursor.
6. **Search** — SQLite FTS5 over the existing `content_text` column.

## Known limitations

- The session secret and database token are environment variables on Vercel;
  they are not committed. `.env.example` documents both.
- Imported HTML is scrubbed of scripts, inline handlers and `javascript:` URLs,
  and is then parsed through ProseMirror's schema before it renders. This is
  adequate for the scope but is not a substitute for a server-side sanitiser
  such as DOMPurify if untrusted HTML were ever rendered directly.
- The app assumes a single region. Turso is provisioned in `aws-ap-south-1`.
