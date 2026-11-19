import { describe, expect, it } from "vitest";
import {
  COMMENT_ID_PATTERN,
  commentPreview,
  countUnresolved,
  isValidCommentId,
  newCommentId,
  sortComments,
} from "@/lib/comments";
import { pickVersionsToDrop, shouldSnapshot } from "@/lib/versions";
import { matchesQuery, normalizeQuery, searchSnippet } from "@/lib/search";

describe("comment ids", () => {
  it("generates ids that the server will accept", () => {
    for (let index = 0; index < 50; index += 1) {
      const id = newCommentId();
      expect(id).toMatch(COMMENT_ID_PATTERN);
      expect(isValidCommentId(id)).toBe(true);
    }
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 200 }, () => newCommentId()));
    expect(ids.size).toBe(200);
  });

  it("rejects ids a client might try to inject", () => {
    expect(isValidCommentId("cmt_")).toBe(false);
    expect(isValidCommentId("comment1")).toBe(false);
    expect(isValidCommentId("cmt_short")).toBe(false);
    expect(isValidCommentId('cmt_aaaa" onmouseover="x')).toBe(false);
    expect(isValidCommentId(null)).toBe(false);
    expect(isValidCommentId(42)).toBe(false);
  });
});

describe("commentPreview", () => {
  it("collapses newlines and runs of spaces", () => {
    expect(commentPreview("first\n\nsecond   third")).toBe("first second third");
  });

  it("truncates long bodies with an ellipsis", () => {
    const preview = commentPreview("a".repeat(200), 20);
    expect(preview).toHaveLength(21);
    expect(preview.endsWith("…")).toBe(true);
  });

  it("leaves short bodies alone", () => {
    expect(commentPreview("  tight  ")).toBe("tight");
  });
});

describe("countUnresolved", () => {
  it("counts only open comments", () => {
    expect(
      countUnresolved([
        { resolvedAt: null },
        { resolvedAt: 123 },
        { resolvedAt: null },
      ]),
    ).toBe(2);
  });

  it("handles an empty list", () => {
    expect(countUnresolved([])).toBe(0);
  });
});

describe("sortComments", () => {
  it("orders oldest first and does not mutate the input", () => {
    const input = [{ createdAt: 3 }, { createdAt: 1 }, { createdAt: 2 }];
    const sorted = sortComments(input);
    expect(sorted.map((comment) => comment.createdAt)).toEqual([1, 2, 3]);
    expect(input[0].createdAt).toBe(3);
  });
});

describe("version retention", () => {
  const rows = Array.from({ length: 5 }, (_, index) => ({
    id: `ver_${index}`,
    createdAt: index,
  }));

  it("keeps the newest entries and returns the rest", () => {
    expect(pickVersionsToDrop(rows, 3)).toEqual(["ver_1", "ver_0"]);
  });

  it("drops nothing while under the limit", () => {
    expect(pickVersionsToDrop(rows, 10)).toEqual([]);
  });

  it("treats a limit of zero as keep nothing", () => {
    expect(pickVersionsToDrop(rows, 0)).toEqual([
      "ver_4",
      "ver_3",
      "ver_2",
      "ver_1",
      "ver_0",
    ]);
  });

  it("breaks timestamp ties deterministically", () => {
    const tied = [
      { id: "ver_b", createdAt: 10 },
      { id: "ver_a", createdAt: 10 },
    ];
    expect(pickVersionsToDrop(tied, 1)).toEqual(["ver_a"]);
  });

  it("only snapshots when the body changed", () => {
    expect(shouldSnapshot({ contentHtml: "<p>x</p>" })).toBe(true);
    expect(shouldSnapshot({ contentText: "x" })).toBe(true);
    expect(shouldSnapshot({ title: "Renamed" })).toBe(false);
  });
});

describe("search", () => {
  it("normalises whitespace and caps the term", () => {
    expect(normalizeQuery("  quarterly   plan ")).toBe("quarterly plan");
    expect(normalizeQuery("a".repeat(400))).toHaveLength(120);
  });

  it("matches case-insensitively", () => {
    expect(matchesQuery("The Quarterly Plan", "quarterly")).toBe(true);
    expect(matchesQuery("The Quarterly Plan", "roadmap")).toBe(false);
    expect(matchesQuery("anything", "")).toBe(false);
  });

  it("returns a window around the match with ellipses", () => {
    const text = `${"filler ".repeat(30)}needle${" filler".repeat(30)}`;
    const snippet = searchSnippet(text, "needle", 20);
    expect(snippet).toContain("needle");
    expect(snippet.startsWith("…")).toBe(true);
    expect(snippet.endsWith("…")).toBe(true);
  });

  it("does not add ellipses when the whole text fits", () => {
    expect(searchSnippet("short text", "text", 40)).toBe("short text");
  });

  it("returns an empty string when there is no match", () => {
    expect(searchSnippet("nothing here", "needle")).toBe("");
  });
});
