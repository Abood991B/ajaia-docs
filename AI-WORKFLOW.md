# AI workflow note

## Which tools

- **OpenCode** — an AI coding agent running in the terminal, driving the
  implementation file by file (DeepSeek V4.1 Flash). This was the primary tool:
  the large majority of the lines written.
- **One agent, not a panel.** I used a single coding agent with full repository
  context instead of splitting work across several assistants mid-build.
- **Browser automation** (`agent-browser`) to drive the deployed app, exercise
  the flows, and take the screenshots in `docs/screenshots/`.
- **Vercel CLI + API** for deployment and environment configuration.

I did not use AI to write the assessment's scope decisions, the tradeoff
reasoning, or the final submission text. Those are the parts being evaluated.

## Where AI materially sped things up

1. **Scaffolding and configuration** — Next.js project, Tailwind, TypeScript,
   Drizzle, Vitest. Roughly 20 minutes of setup compressed into about 3.
2. **Schema and migration SQL** — the tables, indexes, unique constraints and
   idempotent DDL came out correct on the first run, including the three new
   tables added for comments, versions and presence.
3. **Route handler boilerplate** — the repetitive parts of fifteen endpoints
   (parse body → validate → authorise → respond) were generated once and then
   reviewed as a group.
4. **The design system in CSS** — tokens, button/input/badge/card primitives,
   the ProseMirror typography scale, the comment rail and history modal.
5. **Test scaffolding** — the 60-case suite started as a generated skeleton and
   was then tightened by hand around the cases that actually matter.

The honest summary: AI was fastest on work whose quality I could verify by
looking at it or running it, and slowest on work that required a decision.

## What I changed or rejected

These are the moments where the agent's first answer was wrong or out of scope.

| Agent proposed | What I did | Why |
| --- | --- | --- |
| Add Yjs / real-time co-editing as a stretch goal | Rejected, twice | A partially working CRDT is worse than no CRDT, and it directly threatens the editing-quality criterion. The second time, I asked for the smallest honest version instead: a poll, presence, and a version guard that refuses to overwrite. It is labelled as sync, not as real-time. |
| Store document content as Tiptap JSON | Switched to HTML + a plain-text projection | Markdown and `.docx` already produce HTML. JSON would have meant an extra conversion on every import and no readable text for excerpts or search. |
| Upload files to blob storage and attach them to documents | Replaced with import-to-document | Removes a storage bucket, signed URLs and orphan cleanup. The requirement is that a file enters the workflow — conversion does that and leaves an editable document. |
| Anchor comments by character offset (`from`/`to`) | Rejected in favour of a document mark | Offsets rot as soon as anyone types above them, and the mapping has to be repaired on every keystroke. A mark carrying `data-comment-id` moves with its text and survives reload for free. |
| Store the client's `contentText` alongside the HTML | Recompute it server-side from the HTML | Two sources of truth drift. The word count and the search index now cannot disagree with the body. |
| `next/font/google` for Archivo, Literata and IBM Plex Mono | Replaced with `next/font/local` | The Vercel build failed inside the font loader. Self-hosting removed the build-time network dependency entirely. |
| Return `403 Forbidden` when a user has no access | Changed to `404` | A 403 confirms the document exists. Not-found and no-access now return the same response. |
| Parse `.docx` with `mammoth.convertToHtml({ arrayBuffer })` | Changed to `{ buffer: Buffer.from(...) }` | That call type-checks — the published types union the browser input in — but mammoth's **Node** build only accepts `{path}`, `{buffer}` or `{file}`. Markdown import worked, so the build stayed green and the failure only appeared when a real `.docx` hit the deployed app. |
| `stripHtml` that replaces every tag with a space | Only block boundaries become whitespace | The first version split `.md,` into `.md ,` at an inline `<code>` boundary, so the word count grew by one on the first save of every document. Caught by a round-trip check, fixed with a test. |
| Name the demo-account helper `useDemo` | Renamed to `fillDemoAccount` | ESLint read it as a React hook. |
| Show the raw document text as the dashboard excerpt | Added a query-layer fix | The first heading repeats the title, so every card showed the title twice. |

## How correctness, UX and reliability were verified

**Automated**

- `npm run build`, `npx tsc --noEmit` and `npm run lint` clean.
- `npm test` — 60 Vitest cases. The permission matrix (owner, editor, viewer,
  stranger, ownership-beats-share-row, `OWNER` rejected as a grantable role);
  the import parsers (markdown, plain text, a generated `.docx` through the real
  mammoth build, plus extension, size, empty and malformed-archive rejections);
  comment ids, previews and counts; version retention and the snapshot rule;
  search matching, snippets and query normalisation.
- `node scripts/e2e-api.mjs` — 39 checks against a running production build,
  covering every endpoint and every role: create/save/conflict, history list,
  preview and restore, comment create/resolve/delete, id validation, presence,
  insert-file, search, registration, duplicate email, short password, and the
  negative cases (viewer write, viewer comment, viewer restore, viewer share
  list, stranger read, stale save). It creates and deletes its own document.

**Manual, against the deployed build — not localhost**

- Signed in as all three seeded accounts, plus a freshly registered one.
- Created a document, applied bold/italic/underline, H1–H3, both list types,
  refreshed, and confirmed the formatting survived.
- Selected a paragraph, created a comment, reloaded, confirmed the anchor was
  still on the same words, then resolved and deleted it and confirmed the
  highlight was removed from the document body.
- Restored an older version and watched the toast, the new history entry, and
  the document body change together.
- Edited in one tab and watched an idle second tab adopt the change with a
  notice; confirmed the editor refuses to adopt a change while a comment is
  being composed.
- Shared the brief with Sam as *Can view* and confirmed the server rejected
  edits from that session (not just that the toolbar was hidden).
- Called the API directly with a session cookie to confirm `401` when signed
  out, `404` for a stranger, and `403` for a viewer attempting a write.

**What I would do differently next time**

Deploy the skeleton in the first ten minutes and treat the live URL as a
build-time dependency, not an end-of-task step. Three of the four real problems
in this build (fonts, deployment protection, the mammoth argument) were only
visible in production. The fourth — the word count drift — was only visible
because I diffed a document against itself after a round-trip; a build and a
typecheck would never have caught it.
