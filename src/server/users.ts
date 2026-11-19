import "server-only";
import { asc, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export type DirectoryUser = {
  id: string;
  name: string;
  email: string;
};

/** The share dialog picks from the seeded directory rather than sending email. */
export async function listOtherUsers(currentUserId: string): Promise<DirectoryUser[]> {
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(ne(users.id, currentUserId))
    .orderBy(asc(users.name));
}
