/**
 * Finds and repairs mojibake in a document by restoring the newest history
 * snapshot that is clean UTF-8. One-off repair tool; safe to re-run.
 *
 *   node scripts/repair-encoding.mjs <documentId> <email> <password>
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const [documentId, email, password] = process.argv.slice(2);

if (!documentId || !email || !password) {
  console.error("usage: node scripts/repair-encoding.mjs <id> <email> <password>");
  process.exit(1);
}

let cookie = "";
async function call(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (cookie) headers.cookie = cookie;
  if (options.body && !options.raw) headers["content-type"] = "application/json";

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    body: options.raw ? options.body : options.body ? JSON.stringify(options.body) : undefined,
  });

  for (const entry of response.headers.getSetCookie?.() ?? []) {
    const [pair] = entry.split(";");
    if (pair.startsWith("ajaia_session=")) cookie = pair;
  }

  return { status: response.status, body: await response.json().catch(() => null) };
}

// PowerShell decoded curl's UTF-8 output through the OEM code page, turning an
// em dash into box-drawing characters. Either shape means "re-decode happened".
const MOJIBAKE = /[\u2500-\u257F\uFFFD]/;

function isClean(html) {
  return !MOJIBAKE.test(html);
}

function report(label, html) {
  const bad = !isClean(html);
  console.log(`${bad ? "CORRUPT" : "clean  "}  ${label}`);
  return !bad;
}

const login = await call("/api/auth/login", { method: "POST", body: { email, password } });
if (login.status !== 200) {
  console.error("login failed", login.status, login.body);
  process.exit(1);
}

const doc = await call(`/api/documents/${documentId}`);
if (doc.status !== 200) {
  console.error("document fetch failed", doc.status);
  process.exit(1);
}

const current = doc.body.document;
console.log(`document: ${current.title}`);
const currentClean = report("current body", current.contentHtml);

if (currentClean) {
  console.log("nothing to repair");
  process.exit(0);
}

const versions = await call(`/api/documents/${documentId}/versions`);
if (versions.status !== 200) {
  console.error("history fetch failed", versions.status);
  process.exit(1);
}

for (const summary of versions.body.versions) {
  const detail = await call(`/api/documents/${documentId}/versions/${summary.id}`);
  if (detail.status !== 200) continue;
  const html = detail.body.version.contentHtml;
  const clean = isClean(html);
  console.log(`${clean ? "clean  " : "CORRUPT"}  version ${summary.id} (${summary.wordCount} words)`);
  if (!clean) continue;

  const restored = await call(`/api/documents/${documentId}/versions/${summary.id}/restore`, {
    method: "POST",
    body: { expectedUpdatedAt: current.updatedAt },
  });

  if (restored.status !== 200) {
    console.error("restore failed", restored.status, restored.body);
    process.exit(1);
  }

  const after = restored.body.document;
  report("restored body", after.contentHtml);
  console.log(`restored ${summary.id}; title still "${after.title}"`);
  process.exit(0);
}

console.error("no clean snapshot found; repair by hand");
process.exit(1);
