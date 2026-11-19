import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, type UserRow } from "@/db/schema";
import { readSessionUserId } from "@/lib/auth";

export type SessionUser = Pick<UserRow, "id" | "email" | "name">;

export async function getCurrentUser(): Promise<SessionUser | null> {
  const userId = await readSessionUserId();
  if (!userId) return null;

  const rows = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return rows[0] ?? null;
}
