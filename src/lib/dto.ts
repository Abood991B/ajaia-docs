import type { DocumentRow } from "@/db/schema";
import type { Role } from "@/lib/access";

export type DocumentDto = {
  id: string;
  ownerId: string;
  title: string;
  contentHtml: string;
  contentText: string;
  createdAt: number;
  updatedAt: number;
};

export function toDocumentDto(row: DocumentRow): DocumentDto {
  return {
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    contentHtml: row.contentHtml,
    contentText: row.contentText,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export type ShareDto = {
  userId: string;
  name: string;
  email: string;
  role: "VIEWER" | "EDITOR";
  createdAt: number;
};

export type CommentDto = {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  quotedText: string;
  resolvedAt: number | null;
  createdAt: number;
};

export type VersionSummaryDto = {
  id: string;
  title: string;
  wordCount: number;
  authorName: string;
  createdAt: number;
};

export type VersionDto = VersionSummaryDto & {
  contentHtml: string;
  contentText: string;
};

export type ViewerDto = {
  id: string;
  name: string;
  role: Role;
};
