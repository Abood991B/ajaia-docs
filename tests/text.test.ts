import { describe, expect, it } from "vitest";
import {
  countWords,
  excerpt,
  readingMinutes,
  scrubHtml,
  stripHtml,
} from "@/lib/text";

describe("stripHtml", () => {
  it("keeps text and drops markup", () => {
    expect(stripHtml("<p>Hello <strong>there</strong></p>")).toBe("Hello there");
  });

  it("removes script and style bodies instead of leaving their contents", () => {
    const html =
      "<style>p{color:red}</style><script>alert(1)</script><p>Safe</p>";
    expect(stripHtml(html)).toBe("Safe");
  });

  it("decodes the entities that survive a paste", () => {
    expect(stripHtml("<p>Tom &amp; Jerry&nbsp;here</p>")).toBe("Tom & Jerry here");
  });
});

describe("scrubHtml", () => {
  it("drops inline event handlers", () => {
    const cleaned = scrubHtml('<p onclick="steal()">Hi</p>');
    expect(cleaned).not.toContain("onclick");
    expect(cleaned).toContain("Hi");
  });

  it("neutralises javascript: urls", () => {
    const cleaned = scrubHtml('<a href="javascript:alert(1)">x</a>');
    expect(cleaned).not.toContain("javascript:");
  });

  it("keeps ordinary formatting intact", () => {
    const html = "<h2>Title</h2><ul><li><em>one</em></li></ul>";
    expect(scrubHtml(html)).toBe(html);
  });
});

describe("countWords", () => {
  it("counts words across newlines", () => {
    expect(countWords("one two\nthree")).toBe(3);
  });

  it("returns zero for empty or whitespace input", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n  ")).toBe(0);
  });
});

describe("readingMinutes", () => {
  it("never reports less than a minute", () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(20)).toBe(1);
  });

  it("rounds to the nearest minute", () => {
    expect(readingMinutes(440)).toBe(2);
  });
});

describe("excerpt", () => {
  it("leaves short text alone", () => {
    expect(excerpt("short", 20)).toBe("short");
  });

  it("truncates with an ellipsis", () => {
    const result = excerpt("a".repeat(30), 10);
    expect(result).toHaveLength(11);
    expect(result.endsWith("…")).toBe(true);
  });
});
