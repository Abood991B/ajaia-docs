# Walkthrough video — recording script

Target length: **4 min 30 s** (the brief asks for 3–5 minutes). One take, no
editing. Loom (unlisted) or YouTube (unlisted) is fine.

## Before you hit record

- Browser window at **1440 × 900**, zoom **100%**, bookmarks bar hidden.
- Two tabs open: the dashboard, and a signed-out login page.
- A small `.md` file and a `.docx` file on the desktop to drag in.
- Close Slack, notifications, and any tab with your name on it.
- Do a silent 20-second dry run of the comment and history section.
- Paste the live URL in the address bar before recording starts.

## 0:00 – 0:20 · What this is

Say:

> This is Ajaia Docs — a scoped collaborative editor built in a four-hour
> timebox. The build is organised around one path: create a document, write it
> with real formatting, comment on it, share it, and have all of it survive a
> refresh. Everything I cut, I cut so that path would feel finished.

## 0:20 – 1:15 · The editing loop

Do:

1. Sign in with the **Abdulrahman** button.
2. Click **New document**.
3. Type a sentence. Select part of it, press **Ctrl+B**, then **Ctrl+I**.
4. Set a line to **H2** with the toolbar.
5. Add a bulleted list with two items.
6. Point at the top-right indicator: *Unsaved changes* → *Saving…* → *Saved*.
7. Press **Ctrl+R**.

Say while doing it:

> Autosave is debounced at 700 milliseconds, and the save state is visible
> because a silent save is indistinguishable from a broken one. Each save sends
> the document plus the version I loaded, so if the same document is open in
> another tab I get a conflict notice instead of silently overwriting someone.
>
> After the refresh: formatting intact, content correct. That is the loop I
> optimised for.

## 1:15 – 1:50 · Import, and insert into a document

Do:

1. Back to the dashboard. **Import file** → choose the `.md` file.
2. Show the resulting document.
3. In that document, press **Insert file** and choose the `.docx`.

Say:

> Import is a conversion, not an attachment. Markdown goes through a parser,
> `.docx` through mammoth, plain text becomes paragraphs. Nothing is stored as a
> file, so there is no blob storage to clean up, and the result is immediately
> editable. Insert file appends to the document you are already in.

## 1:50 – 2:50 · Comments and history

Do:

1. Open **Product brief — Ajaia Docs**.
2. Select the last sentence. Press **COMMENT** in the toolbar.
3. Type a note. Press **Comment**.
4. Point at the highlight in the document and the thread in the right rail.
5. Press **Ctrl+R**. The anchor is still on the same words.
6. Open the thread, press **Resolve** — the highlight goes, the thread is archived.
7. Press **History**. Open an older snapshot, then **Restore this version**.

Say:

> The anchor is a mark inside the document, not a character offset. Offsets rot
> the moment anyone types above them; a mark moves with its text, so it survives
> edits and reloads for free. If the anchored text is deleted, the thread says so
> instead of pointing at the wrong words.
>
> Every save is a snapshot — the newest thirty are kept. Restoring writes a new
> version rather than erasing the list, so history stays append-only.

## 2:50 – 3:30 · Sharing, and the read-only case

Do:

1. **Share** → add **Sam Ortiz** as *Can view*.
2. Sign out. Sign in as **Sam**.
3. Open the brief. Point at: no toolbar, the read-only banner, the *View only*
   badge, the comment thread that is visible but has no Resolve or Delete.
4. Optionally: try to type — nothing happens.

Say:

> Ownership lives on the document, the role lives on the share row, and `OWNER`
> is not a value you can grant. So a share request cannot escalate.
>
> What matters more: the read-only editor is a UX affordance, not the security
> boundary. The `PATCH` handler checks `canEdit` on the server, so a viewer with
> devtools gets a 403 regardless of what the UI renders. A stranger gets a 404,
> not a 403, because a 403 would confirm the document exists.

## 3:30 – 4:05 · Sync, presence, and the cut

Do:

1. Sign back in as Abdulrahman. Open the brief in a second tab.
2. Side by side, type in tab B. Point at tab A adopting the text with the
   *Updated by someone else* notice.
3. Point at the avatar in the header.

Say:

> Two tabs, four-second poll, and a version guard. If the other tab is idle it
> adopts the change; if it is mid-edit it refuses and shows a banner instead of
> overwriting. That is the honest version of collaboration without a CRDT.
>
> Live cursors are the thing I cut. They need a stateful WebSocket server, and
> Vercel's serverless runtime cannot hold the socket. A half-working Yjs demo
> would have made the editing experience worse, so I built the reliable subset
> and labelled it accurately instead of calling it real-time.

## 4:05 – 4:30 · Architecture and AI workflow

Say:

> Next.js App Router, Tiptap, Drizzle on libSQL — a local file in development,
> Turso in production, same engine, so no schema drift. Access control is a pure
> module with no database or framework imports, which is why it is the unit-test
> target: sixty tests, plus a thirty-nine-check API suite that drives every role
> and includes the cases that must fail.
>
> The AI agent wrote most of the lines — scaffolding, schema, route boilerplate,
> CSS. The interesting part is what I rejected: Yjs twice, comment offsets,
> Tiptap JSON storage, Google Fonts. And the bugs it introduced that only showed
> up in production: mammoth's browser-only `arrayBuffer` argument, and a word
> count that drifted by one because stripping HTML split a word from its comma.
>
> What is incomplete is in SUBMISSION.md: no live cursors, no comment replies,
> no version diff, deletion is permanent. With another four hours I would move
> sync to a WebSocket host first, then add replies. Thanks for watching.

## After recording

1. Upload to Loom or YouTube, set visibility to **unlisted**.
2. Copy the link into `WALKTHROUGH-VIDEO-URL.txt`.
3. Confirm the link opens in a private window before submitting.
