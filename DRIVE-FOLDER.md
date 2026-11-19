# What goes in the Google Drive folder

The brief asks for the deliverables to live in one Drive folder. The zip already
contains everything; this file is just the map, so you are not guessing what to
upload.

## Upload exactly this

```
Ajaia Docs/
  ajaia-docs-submission.zip     ← everything below, in one file
  SUBMISSION.md                 ← optional, readable without unzipping
  WALKTHROUGH-VIDEO-URL.txt     ← optional, the unlisted video link
```

Set the folder to **“Anyone with the link can view”**. That is the URL you paste
into the portal.

You do **not** need to upload `src/`, `tests/`, `docs/` and the markdown files
separately — they are all inside the zip. Uploading `SUBMISSION.md` alongside it
just saves a reviewer from unzipping to read the summary.

## What is inside the zip

| Path | What it is |
| --- | --- |
| `src/` | Application source (app router, components, server modules, lib, db) |
| `tests/` | Vitest suites — 60 cases |
| `scripts/` | `setup.ts`, plus `e2e-api.mjs` (39 API checks) and maintenance helpers |
| `docs/screenshots/` | 19 PNGs: login, dashboard, editor, comments, history list and preview, share dialog, read-only, imported document, search, insert, mobile |
| `README.md` | Setup, demo credentials, feature list, project layout |
| `ARCHITECTURE.md` | Scope decisions, stack rationale, data model, access matrix, autosave and sync design |
| `AI-WORKFLOW.md` | Tools used, what AI accelerated, what was changed or rejected, how it was verified |
| `SECURITY.md` | What is deliberately public, what is secret, how to rotate |
| `SUBMISSION.md` | The written submission, also pasted into the portal |
| `WALKTHROUGH-VIDEO.md` | The detailed shot list for the video |
| `VIDEO-SCRIPT.md` | The read-aloud version used while recording |
| `WALKTHROUGH-VIDEO-URL.txt` | Where the unlisted link goes |
| `package.json`, `package-lock.json`, configs | Enough to `npm install && npm run db:setup && npm run dev` |

The zip is built from the git history, so it never contains `node_modules`,
`.next`, `local.db` or `.env.local`.

## If you prefer not to use the zip

Upload these three items instead and skip the zip:

1. The GitHub repo link (`https://github.com/Abood991B/ajaia-docs`) in a
   `LINKS.txt`.
2. `README.md`, `ARCHITECTURE.md`, `AI-WORKFLOW.md`, `SUBMISSION.md`,
   `SECURITY.md`.
3. The `docs/screenshots/` folder.

That covers the same material, just as separate files.

## Rebuilding the zip after any edit

```powershell
cd "C:\Users\Abdo Hussam\Job Assign\ajaia-docs"
git add -A
git commit -m "final"
git archive --format=zip --output="C:\Users\Abdo Hussam\Job Assign\ajaia-docs-submission.zip" HEAD
```
