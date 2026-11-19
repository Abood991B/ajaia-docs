# Security

## What is not a secret

Two values in this repository look like credentials to a scanner. Neither is
one.

| File | Value | Why it is public |
| --- | --- | --- |
| `src/db/seed.ts` | `DEMO_PASSWORD = "Ajaia2026!"` | The seeded accounts exist so a reviewer can sign in. The password is printed in `README.md` and on the sign-in screen. It protects no data the reviewer is not already invited to see. |
| `.env.example` | `AUTH_SECRET=` (empty) | A template. No value is committed; the real secret lives in `.env.local` locally and in the hosting provider's environment settings in production. |

The same applies to `README.md`, which lists the demo accounts and the shared
password. If a secret-scanning alert fires on any of these, it is a false
positive: nothing in this repository grants access to anything beyond the demo
dataset.

## What is actually secret

- `AUTH_SECRET` — signs the session JWT. Required in production; the app throws
  at startup if it is missing there.
- `TURSO_AUTH_TOKEN` — read/write access to the production database.

Both are read from the environment. `.env*` is ignored by git, and the ignore
rule was checked against the full history, not just the working tree:

```
git log --all -p | Select-String "eyJhbGciOiJFZERTQSIs|TURSO_AUTH_TOKEN=<value>"
```

returned no matches. `.env.local` has never been committed.

## If a token was exposed

Rotate it; do not scrub history and hope. Both providers can issue a new token
without downtime:

1. Turso → the database → **Create token**, update `TURSO_AUTH_TOKEN` in the
   hosting environment, redeploy, then revoke the old token.
2. Vercel → **Account settings → Tokens**, revoke and issue a new one.

Rotating `AUTH_SECRET` invalidates every existing session, which is a fine
side effect: users simply sign in again.

## Scope and known limitations

- There is no email verification, password reset, or rate limit on
  `/api/auth/login`. This is a scoped demo, not an identity provider.
- The session cookie is `httpOnly`, `sameSite=lax`, and `secure` in production,
  with a seven-day expiry.
- Passwords are hashed with `scrypt` and a per-password salt; the hash format is
  `scrypt$<salt>$<hash>`.
- Document HTML is stored as written by the editor. Saving goes through
  `scrubHtml` (drops `<script>`, `<style>`, inline handlers and
  `javascript:` URLs) and the same function is applied to imported files and
  version previews.
- Access control is enforced in every route handler, not in the UI. Strangers
  receive `404` rather than `403` so the API does not confirm that a document
  exists.
