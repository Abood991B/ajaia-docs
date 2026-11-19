# Read-aloud script — Ajaia Docs walkthrough

Open this on your phone or a second screen. **Say** the lines in the quote
blocks. **Do** the bold actions as you go. Times are targets, not rules.

Target: about **4 minutes 30 seconds**. If you're running long, skip the lines
marked **⤵**.

---

## Before you press record

- Browser at 1440 × 900, zoom 100%.
- Signed in as **Abdulrahman**, on the dashboard.
- A `.md` file and a `.docx` file on the desktop.
- Slack and notifications off. One browser window, no personal tabs.
- Loom → **New video** → **Screen and mic** on.

---

## 0:00 — Opening

**▸ ON SCREEN:** the dashboard.

> This is Ajaia Docs — a collaborative document editor built for this
> assessment.
>
> The brief asked for depth in a few areas, not shallow coverage everywhere.
>
> So I built one path properly: create a document, write it, comment on it,
> share it, and survive a refresh.

---

## 0:20 — The editing loop

**▸ DO:** click **New document**, rename it to `Q4 planning notes`.

> The title renames inline and saves on its own.

**▸ DO:** type `The launch plan needs one owner and one date.`

> Typing saves automatically.
>
> Up here it moves from "Unsaved changes" to "Saving" to "Saved".
> The state is visible because a silent save looks exactly like a broken one.

**▸ DO:** select `one owner` → **Ctrl+B**. Select `one date` → **Ctrl+I**.
New line → **H2** → type `Decisions` → add two bullets.

> Rich text is real: bold, italic, underline, three heading levels, both list
> types, quotes, inline code.
>
> Shortcuts and undo behave properly, because this is Tiptap on ProseMirror.

**▸ DO:** press **Ctrl+R**.

> Reload — text and formatting are still here.
>
> That is the loop I optimised for.

---

## 1:10 — Import and insert

**▸ DO:** back to the dashboard → **Import file** → choose the `.md`.

> Import is a conversion, not an attachment.
>
> Markdown, plain text and `.docx` become editable documents. Nothing is stored
> as a file, so there is no blob storage and nothing to clean up.

**▸ DO:** open the imported document → **Insert file** → choose the `.docx`.

> Insert file appends the same formats to the document I'm already in.

---

## 1:40 — Comments and history

**▸ DO:** open **Product brief — Ajaia Docs**. Select the last paragraph. Press
**COMMENT**.

> Comments are anchored to the text itself.

**▸ DO:** type `A reviewer reads this line first — say what Sam sees before
listing what is out.` → click **Comment**.

> The anchor is a mark inside the document, not an offset.
> Offsets rot when someone types above them; a mark moves with its text.

**▸ DO:** press **Ctrl+R**. Point at the highlight.

> Reload — still on the same words.

**▸ DO:** open the thread → **Resolve**.

> Resolve removes the highlight and archives the thread.

**▸ DO:** **History** → open a version → **Restore this version**.

> Every save is a snapshot, the newest thirty kept.
>
> Restoring writes a new version instead of erasing the list.

---

## 2:40 — Sharing and the read-only case

**▸ DO:** **Share** → add **Sam Ortiz** as **Can view**. Sign out. Sign in as
**Sam**. Open the brief.

> Sharing has three roles.
>
> Ownership lives on the document, the role lives on the share row, and Owner
> is not a value you can grant — so a share request cannot escalate.

**▸ DO:** point at the missing toolbar, the read-only banner, the **View only**
badge, and the comment with no Resolve button.

> As Sam there is no toolbar, the editor is read-only, and the comments are
> visible but not actionable.

> What matters more is that this is not the security boundary.
>
> The server checks edit rights on every write, so a viewer with devtools gets
> a 403. And a stranger gets a 404, not a 403, because a 403 would confirm the
> document exists.

---

## 3:25 — Sync and presence

**▸ DO:** sign back in as **Abdulrahman**. Open the brief in a second tab, side
by side. Type in tab B. Watch tab A.

> Two tabs, a four-second poll, and a version guard.
>
> An idle tab adopts it; a tab that's mid-edit refuses and shows a banner
> instead of overwriting.
>
> Live cursors are what I cut: they need a stateful WebSocket server this
> deployment can't host.
>
> So I built the reliable subset and labelled it sync, not real-time.

---

## 3:50 — Architecture, AI workflow, close

**▸ ON SCREEN:** stay on the app; you can talk over the document.

> Next.js, Tiptap, and Drizzle on libSQL — a local file in development, Turso
> in production. Same engine, so no schema drift.
>
> Sixty unit tests, plus a thirty-nine-check API suite against the deployed
> build, including the cases that must fail.
>
> The AI agent wrote most of the lines. The interesting part is what I
> rejected: Yjs twice, anchoring comments by offset, storing Tiptap JSON,
> Google Fonts.
>
> Two bugs only production showed: a `.docx` parser that type-checked but
> failed at runtime, and a word count that drifted by one.
>
> What's missing is in the submission: no live cursors, no comment replies, no
> version diff. With another four hours I'd move sync to a WebSocket host
> first.
>
> Thanks for watching.

**▸ DO:** stop the recording.

---

## If something goes wrong mid-recording

Don't restart. Keep going and say one of these:

- **A click does nothing:** "That needs a reload — let me refresh." Refresh,
  continue.
- **You lose your place:** "The point here is that the server is the boundary,
  not the UI." Then pick up at the next section.
- **You skip something:** don't go back. Narrate it: "I'm skipping the history
  demo — it's the panel behind History, and it works the same way."

A confident four-minute take beats a perfect fifteen-minute one.

## After recording

1. Upload to Loom or YouTube, set **unlisted**.
2. Copy the link into `SUBMISSION.md` (line 6) and `WALKTHROUGH-VIDEO-URL.txt`.
3. Rebuild the zip, upload to Drive, update the portal.
