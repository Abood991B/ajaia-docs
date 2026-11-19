import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { newId } from "@/db/seed";
import { createSession, hashPassword } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/http";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Use at least two characters.").max(80),
  email: z.string().trim().max(320).email("That does not look like an email address."),
  password: z.string().min(8, "Use at least eight characters.").max(200),
});

export async function POST(request: Request) {
  const parsed = await parseBody(request, registerSchema);
  if (!parsed.ok) return parsed.response;

  const email = parsed.data.email.toLowerCase();
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing.length > 0) {
    return jsonError(
      409,
      "CONFLICT",
      "An account with that email already exists. Sign in instead.",
    );
  }

  const user = {
    id: newId("usr"),
    email,
    name: parsed.data.name,
    passwordHash: hashPassword(parsed.data.password),
    createdAt: new Date(),
  };

  await db.insert(users).values(user);
  await createSession(user.id);

  return jsonOk(
    { user: { id: user.id, name: user.name, email: user.email } },
    201,
  );
}
