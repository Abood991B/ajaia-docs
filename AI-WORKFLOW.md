# AI workflow note

## Which tools

- **OpenCode** — an AI coding agent running in the terminal, driving the
  implementation file by file (DeepSeek V4.1 Flash). This was the primary tool:
  roughly 80% of the lines written.
- **One agent, not a panel.** I used a single coding agent with full repository
  context instead of splitting work across several assistants mid-build.
- **Browser automation** (`agent-browser`) to drive the deployed app and take
  the screenshots in `docs/screenshots/`.
- **Vercel CLI + API** for deployment and environment configuration.

I did not use AI to write the assessment's scope decisions, the tradeoff
reasoning, or the final submission text. Those are the parts being evaluated.

## Where AI materially sped things up

1. **Scaffolding and configuration** — Next.js project, Tailwind, TypeScript,
   Drizzle, Vitest. Roughly 20 minutes of setup compressed into about 3.
2. **Schema and migration SQL** — the three tables, indexes and the unique
   constraint on `(document_id, user_id)` came out correct on the first run.
3. **Route handler boilerplate** — the repetitive parts of eight endpoints
   (parse body → validate → authorise → respond) were generated once and then
   reviewed as a group.
4. **The design system in CSS** — tokens, button/input/badge/card primitives,
   the ProseMirror typography scale. This is the kind of work where the agent
   is genuinely faster than typing, and the output is easy to judge by eye.
5. **Documentation drafts** — README and architecture note were drafted from the
   actual code, then edited.

The honest summary: AI was fastest on work whose quality I could verify by
looking at it or running it, and slowest on work that required a decision.

## What I changed or rejected

These are the moments where the agent's first answer was wrong or out of scope.

| Agent proposed | What I did | Why |
| --- | --- | --- |
| Add Yjs / real-time co-editing as a stretch goal | Rejected | A partially working CRDT is worse than no CRDT, and it directly threatens the editing-quality criterion. |
| Store document content as Tiptap JSON | Switched to HTML + a plain-text projection | Markdown and `.docx` already produce HTML. JSON would have meant an extra conversion on every import and no readable text for excerpts or search. |
| Upload files to blob storage and attach them to documents | Replaced with import-to-document | Removes a storage bucket, signed URLs and orphan cleanup. The requirement is that a file enters the workflow — conversion does that and leaves an editable document. |
| `next/font/google` for Archivo, Literata and IBM Plex Mono | Replaced with `next/font/local` | The Vercel build failed inside the font loader. Self-hosting removed the build-time network dependency entirely. |
| Return `403 Forbidden` when a user has no access | Changed to `404` | A 403 confirms the document exists. Not-found and no-access now return the same response. |
| Name the demo-account helper `useDemo` | Renamed to `fillDemoAccount` | ESLint read it as a React hook. |
| Show the raw document text as the dashboard excerpt | Added a query-layer fix | The first heading repeats the title, so every card showed the title twice. |
| Parse `.docx` with `mammoth.convertToHtml({ arrayBuffer })` | Changed to `{ buffer: Buffer.from(...) }` | That call type-checks — the published types union the browser input in — but mammoth's **Node** build only accepts `{path}`, `{buffer}` or `{file}`. Markdown import worked, so the build stayed green and the failure only appeared when a real `.docx` hit the deployed app. |

## How correctness, UX and reliability were verified

**Automated**

- `npm run build` and `npx tsc --noEmit` clean.
- `npm test` — 39 Vitest cases. 31 cover the permission matrix (owner, editor,
  viewer, stranger, ownership-beats-share-row, `OWNER` rejected as a grantable
  role), title normalisation, HTML stripping, sanitising and word counting. The
  other 8 run the real import parsers: markdown, plain text and a generated
  `.docx` through mammoth, plus the extension, size, empty-file and
  malformed-archive rejections.

**Manual, against the deployed build — not localhost**

- Signed in as all three seeded accounts.
- Created a document, applied bold/italic/underline, H1–H3, both list types,
  refreshed, and confirmed the formatting survived.
- Appended a paragraph, waited for the save indicator, hard-reloaded, and
  confirmed the text was still there.
- Imported a `.md` and a `.docx`; confirmed both produced editable documents.
  **This is how the mammoth bug was found:** the `.md` returned 201 and the
  `.docx` returned a generic “we could not read that file”. Reproducing it
  against `next start` on the production build produced the real error
  (`Could not find file in options`), which named the wrong argument in one
  line. A test that builds a `.docx` in memory now covers it.
- Shared the brief with Sam as *Can view* and confirmed the server rejected
  edits from that session (not just that the toolbar was hidden).
- Called the API directly with a session cookie to confirm `401` when signed
  out, `404` for a stranger, and `403` for a viewer attempting a write.

**What I would do differently next time**

Deploy the skeleton in the first ten minutes and treat the live URL as a
build-time dependency, not an end-of-task step. Two of the three real problems
in this build (fonts, deployment protection) were only visible in production.
