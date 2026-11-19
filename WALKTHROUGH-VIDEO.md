# Walkthrough video — recording script

Target length: **3 min 45 s** (the brief asks for 3–5 minutes). One take, no
editing. Loom (unlisted) or YouTube (unlisted) is fine.

## Before you hit record

- Browser window at **1440 × 900**, zoom **100%**, bookmarks bar hidden.
- Two tabs open: the dashboard, and a signed-out login page.
- Have a small `.md` file and a `.docx` file on the desktop to drag in.
- Close Slack, notifications, and any tab with your name on it.
- Do a silent 20-second dry run of the editor section so the typing is not fumbled.
- Paste the live URL in the address bar before recording starts.

## 0:00 – 0:25 · What this is

Say:

> This is Ajaia Docs — a scoped collaborative editor built in a four-hour
> timebox. The whole build is organised around one path: create a document,
> write it with real formatting, share it, and have it survive a refresh.
> Everything I cut, I cut so that path would feel finished.

## 0:25 – 1:35 · The editing loop

Do:

1. Sign in with the **Abdulrahman** button.
2. Click **New document**.
3. Type a sentence. Select part of it, press **Ctrl+B**, then **Ctrl+I**.
4. Set the line to **H2** with the toolbar.
5. Add a bulleted list with two items.
6. Point at the top-right indicator: *Unsaved changes* → *Saving…* → *Saved*.
7. Press **Ctrl+R**.

Say while doing it:

> Autosave is debounced at 700 milliseconds. The save state is visible because
> silent saving is indistinguishable from a broken save. It sends the whole
> document plus the version I loaded, so if the same document is open in another
> tab I get a conflict notice instead of silently overwriting someone.
>
> After the refresh: formatting intact, cursor position gone, content correct.
> That is the loop I optimised for.

## 1:35 – 2:30 · Import

Do:

1. Go back to the dashboard.
2. **Import file** → choose the `.md` file.
3. Show the resulting document, then repeat with the `.docx`.

Say:

> Import is a conversion, not an attachment. Markdown goes through a parser,
> `.docx` through mammoth, plain text becomes paragraphs. The result is a normal
> editable document — which is why there is no blob storage in this build.
> Accepting `.md`, `.txt` and `.docx` up to 2 MB, and the UI states that limit.

## 2:30 – 3:25 · Sharing

Do:

1. Open **Product brief — Ajaia Docs**.
2. **Share** → add **Sam Ortiz** as *Can view*.
3. Sign out. Sign in as **Sam**.
4. Open the brief. Point at: no toolbar, the read-only banner, the *View only*
   badge.
5. Optionally: try to type — nothing happens.

Say:

> Ownership lives on the document, the role lives on the share row, and `OWNER`
> is not a value you can grant. So a share request cannot escalate.
>
> What matters more: the read-only editor is a UX affordance, not the security
> boundary. The `PATCH` handler checks `canEdit` on the server, so a viewer with
> devtools gets a 403 regardless of what the UI renders. A stranger gets a 404,
> not a 403, because a 403 would confirm the document exists.

## 3:25 – 4:10 · Architecture and cuts

Show the architecture note briefly, or just talk.

Say:

> Next.js App Router, Tiptap for the editor, Drizzle on libSQL — a local file in
> development, Turso in production, same engine, so no schema drift. Access
> control is a pure module with no database or framework imports, which is why
> it is the thing I unit tested.
>
> What I cut: real-time co-editing, comments, version history, binary
> attachments. Each of those needs a data model I could not do justice to in
> four hours, and a half-working CRDT would have made the editing experience
> worse, not better.

## 4:10 – 4:45 · AI workflow

Say:

> I used an AI coding agent for roughly eighty percent of the lines — scaffolding,
> schema, route boilerplate, CSS. The parts it got wrong are the interesting
> part: it proposed Yjs for real-time, which I rejected on scope. It wanted to
> store Tiptap JSON, which I replaced with HTML because import already produces
> HTML. It used Google Fonts, which failed the Vercel build, so I self-hosted.
> And it returned 403 for non-members, which I changed to 404.
>
> Verification was a clean build, a clean typecheck, 31 unit tests on the
> permission matrix, and a manual pass against the deployed URL — not localhost.

## 4:45 – 5:00 · Close

Say:

> What is incomplete is in SUBMISSION.md: no real-time, no comments, no version
> history, deletion is permanent. With another four hours I would add comments
> first, then version history, then Yjs.
>
> Live URL and credentials are in the README. Thanks for watching.

## After recording

1. Upload to Loom or YouTube, set visibility to **unlisted**.
2. Copy the link into `WALKTHROUGH-VIDEO-URL.txt`.
3. Confirm the link opens in a private window before submitting.
