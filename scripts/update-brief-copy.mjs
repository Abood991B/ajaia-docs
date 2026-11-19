/**
 * Refreshes the demo brief's copy so it describes what actually shipped.
 * Targeted replacements preserve the comment anchor already in the body.
 *
 *   node scripts/update-brief-copy.mjs <email> <password>
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const DOCUMENT_ID = "doc_product_brief";
const [email, password] = process.argv.slice(2);

let cookie = "";
async function call(path, options = {}) {
  const headers = { ...(options.headers ?? {}) };
  if (cookie) headers.cookie = cookie;
  if (options.body) headers["content-type"] = "application/json";

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  for (const entry of response.headers.getSetCookie?.() ?? []) {
    const [pair] = entry.split(";");
    if (pair.startsWith("ajaia_session=")) cookie = pair;
  }

  return { status: response.status, body: await response.json().catch(() => null) };
}

const login = await call("/api/auth/login", { method: "POST", body: { email, password } });
if (login.status !== 200) {
  console.error("login failed", login.status);
  process.exit(1);
}

const current = await call(`/api/documents/${DOCUMENT_ID}`);
if (current.status !== 200) {
  console.error("fetch failed", current.status);
  process.exit(1);
}

const doc = current.body.document;
let html = doc.contentHtml;

const replacements = [
  [
    "<li><p>Owner / editor / viewer access</p></li>",
    "<li><p>Owner / editor / viewer access</p></li>" +
      "<li><p>Comments anchored to the text they are about</p></li>" +
      "<li><p>Version history with one-click restore</p></li>" +
      "<li><p>Live sync and presence across open tabs</p></li>",
  ],
  [
    "<p>Real-time co-editing, comments and version history. Each of those needs a data model that this timebox cannot do justice to.</p>",
    "<p>Live cursors and multi-caret co-editing. A true CRDT needs a stateful WebSocket server, so open editors here converge through a short poll and an optimistic version guard instead. Everything else in the list above is built.</p>",
  ],
];

let changed = 0;
for (const [from, to] of replacements) {
  if (html.includes(from)) {
    html = html.replace(from, to);
    changed += 1;
  } else {
    console.log(`skip (not found): ${from.slice(0, 60)}…`);
  }
}

if (changed === 0) {
  console.log("copy already current");
  process.exit(0);
}

const updated = await call(`/api/documents/${DOCUMENT_ID}`, {
  method: "PATCH",
  body: { contentHtml: html, expectedUpdatedAt: doc.updatedAt },
});

if (updated.status !== 200) {
  console.error("patch failed", updated.status, updated.body);
  process.exit(1);
}

console.log(`updated ${changed} block(s); ${updated.body.document.contentText.split(/\s+/).length} words`);
