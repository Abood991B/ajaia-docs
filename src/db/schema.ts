import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const documents = sqliteTable(
  "documents",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled document"),
    contentHtml: text("content_html").notNull().default("<p></p>"),
    contentText: text("content_text").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("documents_owner_idx").on(table.ownerId)],
);

export const documentShares = sqliteTable(
  "document_shares",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["VIEWER", "EDITOR"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("share_doc_user_idx").on(table.documentId, table.userId),
    index("share_user_idx").on(table.userId),
  ],
);

/**
 * A comment is anchored by a mark in the document HTML, not by a stored offset.
 * The mark carries the comment id, so the anchor moves with the text as people
 * edit around it and needs no position bookkeeping on the server.
 */
export const documentComments = sqliteTable(
  "document_comments",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    quotedText: text("quoted_text").notNull().default(""),
    resolvedAt: integer("resolved_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("comments_document_idx").on(table.documentId, table.createdAt)],
);

export const documentVersions = sqliteTable(
  "document_versions",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    contentHtml: text("content_html").notNull(),
    contentText: text("content_text").notNull(),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("versions_document_idx").on(table.documentId, table.createdAt),
  ],
);

/** Last-seen heartbeat per viewer, so the editor can show who else is here. */
export const documentPresence = sqliteTable(
  "document_presence",
  {
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.userId] })],
);

export type UserRow = typeof users.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type DocumentShareRow = typeof documentShares.$inferSelect;
export type DocumentCommentRow = typeof documentComments.$inferSelect;
export type DocumentVersionRow = typeof documentVersions.$inferSelect;
