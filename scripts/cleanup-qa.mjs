/**
 * Removes documents and accounts created by scripts/e2e-api.mjs.
 * Run with the same TURSO_* env as the app, or without them for ./local.db.
 */
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const docs = await client.execute(
  "SELECT id, title FROM documents WHERE title LIKE 'QA scratch %'",
);

for (const row of docs.rows) {
  const id = String(row.id);
  await client.execute({
    sql: "DELETE FROM document_comments WHERE document_id = ?",
    args: [id],
  });
  await client.execute({
    sql: "DELETE FROM document_versions WHERE document_id = ?",
    args: [id],
  });
  await client.execute({
    sql: "DELETE FROM document_presence WHERE document_id = ?",
    args: [id],
  });
  await client.execute({
    sql: "DELETE FROM document_shares WHERE document_id = ?",
    args: [id],
  });
  await client.execute({ sql: "DELETE FROM documents WHERE id = ?", args: [id] });
}

const users = await client.execute(
  "SELECT id, email FROM users WHERE email LIKE 'qa.%@ajaia.test' OR email LIKE 'weak.%@ajaia.test'",
);

for (const row of users.rows) {
  const id = String(row.id);
  await client.execute({ sql: "DELETE FROM document_shares WHERE user_id = ?", args: [id] });
  await client.execute({ sql: "DELETE FROM document_presence WHERE user_id = ?", args: [id] });
  await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [id] });
}

console.log(
  `cleanup: removed ${docs.rows.length} document(s) and ${users.rows.length} account(s) from ${url}`,
);
client.close();
