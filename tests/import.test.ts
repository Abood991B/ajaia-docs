import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { ImportError, importFile, MAX_IMPORT_BYTES } from "@/lib/import";

/**
 * The import pipeline is the only place where bytes from outside the app become
 * document HTML. These tests run the real parsers — marked and mammoth — rather
 * than mocking them, because the interesting failures are parser integration
 * bugs, not our own branching.
 */

function fileFrom(name: string, body: string | Buffer | ArrayBuffer): File {
  return new File([body as BlobPart], name);
}

async function minimalDocx(): Promise<File> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Docx title</w:t></w:r></w:p>
<w:p><w:r><w:t xml:space="preserve">Body text from Word.</w:t></w:r></w:p>
</w:body>
</w:document>`,
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return fileFrom("quarterly plan.docx", buffer);
}

describe("importFile", () => {
  it("converts markdown into html and derives the title from the filename", async () => {
    const result = await importFile(
      fileFrom("launch_notes.md", "# Notes\n\nSome **bold** text.\n\n- one\n- two"),
    );

    expect(result.title).toBe("launch notes");
    expect(result.html).toContain("<h1>Notes</h1>");
    expect(result.html).toContain("<strong>bold</strong>");
    expect(result.html).toContain("<li>one</li>");
    expect(result.text).toContain("Some bold text.");
  });

  it("converts a real .docx through mammoth", async () => {
    const result = await importFile(await minimalDocx());

    expect(result.title).toBe("quarterly plan");
    expect(result.html).toContain("Docx title");
    expect(result.html).toContain("Body text from Word.");
    expect(result.text).toContain("Body text from Word.");
  });

  it("turns plain text into paragraphs instead of one blob", async () => {
    const result = await importFile(fileFrom("notes.txt", "First para.\n\nSecond para."));

    expect(result.html).toBe("<p>First para.</p><p>Second para.</p>");
  });

  it("escapes html found in a plain text file", async () => {
    const result = await importFile(fileFrom("raw.txt", "<script>alert(1)</script>"));

    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
  });

  it("rejects an extension that is not on the allow list", async () => {
    await expect(importFile(fileFrom("photo.png", "x"))).rejects.toBeInstanceOf(ImportError);
    await expect(importFile(fileFrom("photo.png", "x"))).rejects.toMatchObject({
      code: "UNSUPPORTED",
    });
  });

  it("rejects an empty file", async () => {
    await expect(importFile(fileFrom("empty.md", ""))).rejects.toMatchObject({ code: "EMPTY" });
  });

  it("rejects a file over the size cap before parsing it", async () => {
    const big = "a".repeat(MAX_IMPORT_BYTES + 1);
    await expect(importFile(fileFrom("big.txt", big))).rejects.toMatchObject({
      code: "TOO_LARGE",
    });
  });

  it("reports a parse failure rather than throwing a raw parser error", async () => {
    // A .docx that is not a zip at all: the extension passes, the parser does not.
    await expect(importFile(fileFrom("broken.docx", "not a zip"))).rejects.toMatchObject({
      code: "PARSE_FAILED",
    });
  });
});
