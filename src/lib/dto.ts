import type { DocumentRow } from "@/db/schema";

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
