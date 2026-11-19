import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { jsonError, jsonOk, parseBody } from "@/lib/http";

const loginSchema = z.object({
  email: z.string().trim().min(3).max(320),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginSchema);
  if (!parsed.ok) return parsed.response;

  const email = parsed.data.email.toLowerCase();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];

  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return jsonError(
      401,
      "UNAUTHENTICATED",
      "That email and password do not match an account.",
    );
  }

  await createSession(user.id);

  return jsonOk({
    user: { id: user.id, name: user.name, email: user.email },
  });
}
