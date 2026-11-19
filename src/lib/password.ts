import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Kept free of Next.js imports so seed scripts and tests can use it directly.
 * scrypt is in the Node standard library, which avoids a native dependency.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  if (expectedBuffer.length !== actual.length) return false;
  return timingSafeEqual(actual, expectedBuffer);
}
