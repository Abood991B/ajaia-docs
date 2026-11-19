import mammoth from "mammoth";
import { marked } from "marked";
import { escapeHtml, scrubHtml, stripHtml } from "@/lib/text";
import { normalizeTitle } from "@/lib/access";

export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".txt", ".docx"] as const;

export type ImportedDocument = {
  title: string;
  html: string;
  text: string;
};

export class ImportError extends Error {
  constructor(
    message: string,
    readonly code: "TOO_LARGE" | "UNSUPPORTED" | "EMPTY" | "PARSE_FAILED",
  ) {
    super(message);
    this.name = "ImportError";
  }
}

function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

function titleFromFileName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return normalizeTitle(base.replace(/[_-]+/g, " "));
}

function textToHtml(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export async function importFile(file: File): Promise<ImportedDocument> {
  if (file.size === 0) {
    throw new ImportError("That file is empty.", "EMPTY");
  }
  if (file.size > MAX_IMPORT_BYTES) {
    throw new ImportError("Files must be 2 MB or smaller.", "TOO_LARGE");
  }

  const extension = extensionOf(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(extension as (typeof ACCEPTED_EXTENSIONS)[number])) {
    throw new ImportError(
      "Only .md, .markdown, .txt and .docx files can be imported.",
      "UNSUPPORTED",
    );
  }

  let html = "";
  try {
    if (extension === ".docx") {
      // mammoth's Node build accepts {path} | {buffer} | {file}; `arrayBuffer`
      // exists only in its browser build, so passing it here fails at runtime
      // with "Could not find file in options".
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.convertToHtml({ buffer });
      html = result.value;
    } else {
      const raw = await file.text();
      html = extension === ".txt" ? textToHtml(raw) : await marked.parse(raw);
    }
  } catch (error) {
    console.error("Could not parse import", {
      name: file.name,
      extension,
      size: file.size,
      error,
    });
    throw new ImportError("We could not read that file.", "PARSE_FAILED");
  }

  const clean = scrubHtml(html);
  const text = stripHtml(clean);

  if (!text) {
    throw new ImportError("That file has no readable text in it.", "EMPTY");
  }

  return {
    title: titleFromFileName(file.name),
    html: clean || "<p></p>",
    text,
  };
}
