# Ajaia Docs

A scoped, full-stack collaborative document editor: create a document, write it
with real rich text, import a file into it, share it with a teammate, and trust
that it is still there after a refresh.

**Live app:** https://ajaia-docs-rho-one.vercel.app

---

## Demo accounts

All three accounts use the same password: `Ajaia2026!`

| Account | Email | What to look at |
| --- | --- | --- |
| Abdulrahman Baidaq | `abdulrahman16baidaq@gmail.com` | Owns two documents. Can share and delete. |
| Maya Chen | `maya@ajaia.test` | Has **edit** access to “Product brief — Ajaia Docs”, owns one document. |
| Sam Ortiz | `sam@ajaia.test` | Has **view-only** access to the same brief. |

The login screen lists all three with one-click fill, so a reviewer does not
have to type an email.

**To see the sharing model in 60 seconds:** sign in as Abdulrahman → open
“Product brief” → Share → add Sam as *Can view* → sign out → sign in as Sam →
open the brief. The toolbar is gone, the editor is read-only, and the dashboard
lists it under “Shared with you”.

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
npm test             # 39 unit tests, Vitest
npm run typecheck    # tsc --noEmit
npm run build        # production build
```

The test suite targets the access-control module, the text pipeline and the
import parsers — the places where a bug is a security or data-integrity problem
rather than a cosmetic one.

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
save state, plus an explicit conflict guard if the same document is open in two
tabs.

**Rich text** — bold, italic, underline, H1–H3, bulleted and numbered lists,
blockquote, inline code, undo/redo, clear formatting. Built on Tiptap, so
paste, undo history and keyboard shortcuts behave the way people expect.

**Import** — `.md`, `.markdown`, `.txt` and `.docx` up to 2 MB. Markdown is
converted to HTML, `.docx` goes through mammoth, plain text becomes paragraphs.
The result is a normal editable document, not an attachment.

**Sharing** — an owner grants *Can view* or *Can edit* to another account. The
dashboard separates “Your documents” from “Shared with you”, and every request
is checked on the server. Viewers get a read-only editor, not a disabled
toolbar.

**Persistence** — documents, content and share grants live in SQLite (libSQL),
so formatting and access survive refreshes and redeploys.

---

## Deliberately not built

| Not built | Why |
| --- | --- |
| Real-time co-editing | A half-working CRDT is worse than none. It needs a transport, presence and conflict semantics that four hours cannot do properly. |
| Comments / suggestions | Needs a text-anchoring model that survives edits. |
| Version history | Needs a separate append-only table and a diff UI. |
| Binary attachments | Import covers the “file enters the product” requirement without standing up blob storage. |
| Email invites, public links | The seeded directory demonstrates the permission model without an email provider. |

`SUBMISSION.md` lists the same cuts against what actually shipped.

---

## Project layout

```
src/
  app/
    page.tsx                  dashboard (server component)
    login/page.tsx            sign-in
    d/[id]/page.tsx           document route (server component)
    api/                      route handlers: auth, documents, share, import, users
  components/
    editor/DocumentEditor.tsx editor shell, autosave, conflict handling
    editor/Toolbar.tsx        formatting controls
    editor/ShareDialog.tsx    grant and revoke access
    DashboardClient.tsx       create, import, filter
  server/
    documents.ts              all document + share data access
    users.ts                  seeded account directory
  lib/
    access.ts                 pure permission rules  ← unit tested
    auth.ts                   session cookie, JWT
    password.ts               scrypt hashing
    import.ts                 file → HTML pipeline
    text.ts                   HTML/text helpers
    http.ts                   JSON envelope, zod body parsing
    guard.ts                  request guards (auth + document access)
  db/
    schema.ts                 Drizzle schema
    migrate.ts                idempotent DDL
    seed.ts                   three users, three documents, three grants
tests/                        Vitest suites
```

---

## Notes and limits

- Auth is deliberately lightweight: seeded accounts, scrypt-hashed passwords,
  an HS256 JWT in an httpOnly cookie. There is no sign-up, password reset or
  email verification.
- The document body is stored as HTML plus a plain-text projection. HTML is the
  interchange format; ProseMirror's schema is the validation layer when it is
  loaded back into the editor.
- Imported HTML is scrubbed of `<script>`, `<style>`, inline handlers and
  `javascript:` URLs before it is stored.
- Production runs on Vercel with Turso. The free tiers are sufficient; nothing
  in the stack requires a paid dependency.
