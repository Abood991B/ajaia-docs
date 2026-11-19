import { createClient } from "@libsql/client";
import fs from "node:fs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const client = createClient({ url: env.TURSO_DATABASE_URL, authToken: env.TURSO_AUTH_TOKEN });
const doc = process.argv[2] ?? "doc_product_brief";
const keep = Number(process.argv[3] ?? 6);
const before = await client.execute({ sql: "SELECT COUNT(*) AS n FROM document_versions WHERE document_id = ?", args: [doc] });
await client.execute({
  sql: `DELETE FROM document_versions WHERE document_id = ? AND id NOT IN (
          SELECT id FROM document_versions WHERE document_id = ? ORDER BY created_at DESC LIMIT ?)`,
  args: [doc, doc, keep],
});
const after = await client.execute({ sql: "SELECT COUNT(*) AS n FROM document_versions WHERE document_id = ?", args: [doc] });
console.log(`versions: ${before.rows[0].n} -> ${after.rows[0].n}`);
client.close();
