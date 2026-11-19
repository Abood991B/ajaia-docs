import { describe, expect, it } from "vitest";
import {
  canDelete,
  canEdit,
  canManageSharing,
  canRead,
  isShareRole,
  normalizeTitle,
  resolveRole,
  roleLabel,
  type Role,
  type ShareRef,
} from "@/lib/access";

/**
 * These are the rules that decide whether a request may read, write or share a
 * document. Every route handler calls them, so a regression here is a security
 * regression rather than a cosmetic one.
 */

const owner = { ownerId: "usr_owner" };
const shares: ShareRef[] = [
  { userId: "usr_editor", role: "EDITOR" },
  { userId: "usr_viewer", role: "VIEWER" },
];

describe("resolveRole", () => {
  it("returns OWNER for the owner", () => {
    expect(resolveRole(owner, shares, "usr_owner")).toBe("OWNER");
  });

  it("returns the granted role for a shared editor", () => {
    expect(resolveRole(owner, shares, "usr_editor")).toBe("EDITOR");
  });

  it("returns the granted role for a shared viewer", () => {
    expect(resolveRole(owner, shares, "usr_viewer")).toBe("VIEWER");
  });

  it("returns null for a stranger", () => {
    expect(resolveRole(owner, shares, "usr_stranger")).toBeNull();
  });

  it("returns null when there are no shares at all", () => {
    expect(resolveRole(owner, [], "usr_editor")).toBeNull();
  });

  it("treats ownership as stronger than a share row", () => {
    const conflicting: ShareRef[] = [{ userId: "usr_owner", role: "VIEWER" }];
    expect(resolveRole(owner, conflicting, "usr_owner")).toBe("OWNER");
  });

  it("uses the first matching share row", () => {
    const duplicate: ShareRef[] = [
      { userId: "usr_editor", role: "EDITOR" },
      { userId: "usr_editor", role: "VIEWER" },
    ];
    expect(resolveRole(owner, duplicate, "usr_editor")).toBe("EDITOR");
  });
});

describe("permission matrix", () => {
  const matrix: Array<{
    role: Role | null;
    read: boolean;
    edit: boolean;
    share: boolean;
    remove: boolean;
  }> = [
    { role: "OWNER", read: true, edit: true, share: true, remove: true },
    { role: "EDITOR", read: true, edit: true, share: false, remove: false },
    { role: "VIEWER", read: true, edit: false, share: false, remove: false },
    { role: null, read: false, edit: false, share: false, remove: false },
  ];

  for (const row of matrix) {
    it(`${row.role ?? "stranger"} → read=${row.read} edit=${row.edit} share=${row.share} delete=${row.remove}`, () => {
      expect(canRead(row.role)).toBe(row.read);
      expect(canEdit(row.role)).toBe(row.edit);
      expect(canManageSharing(row.role)).toBe(row.share);
      expect(canDelete(row.role)).toBe(row.remove);
    });
  }

  it("never grants sharing to a non-owner", () => {
    for (const role of ["EDITOR", "VIEWER"] as Role[]) {
      expect(canManageSharing(role)).toBe(false);
    }
  });
});

describe("isShareRole", () => {
  it("accepts the two grantable roles", () => {
    expect(isShareRole("VIEWER")).toBe(true);
    expect(isShareRole("EDITOR")).toBe(true);
  });

  it("rejects OWNER so a share request cannot escalate", () => {
    expect(isShareRole("OWNER")).toBe(false);
  });

  it("rejects arbitrary input", () => {
    expect(isShareRole("admin")).toBe(false);
    expect(isShareRole(null)).toBe(false);
    expect(isShareRole(1)).toBe(false);
  });
});

describe("normalizeTitle", () => {
  it("collapses whitespace", () => {
    expect(normalizeTitle("  Quarterly   plan  ")).toBe("Quarterly plan");
  });

  it("falls back for blank titles", () => {
    expect(normalizeTitle("   ")).toBe("Untitled document");
  });

  it("caps runaway titles", () => {
    expect(normalizeTitle("a".repeat(400))).toHaveLength(160);
  });
});

describe("roleLabel", () => {
  it("uses the wording shown in the UI", () => {
    expect(roleLabel("OWNER")).toBe("Owner");
    expect(roleLabel("EDITOR")).toBe("Can edit");
    expect(roleLabel("VIEWER")).toBe("Can view");
  });
});
