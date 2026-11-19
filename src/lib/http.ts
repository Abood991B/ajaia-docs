import { NextResponse } from "next/server";
import type { ZodType } from "zod";

export function jsonOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "IMPORT_FAILED"
  | "CONFLICT"
  | "INTERNAL";

export function jsonError(
  status: number,
  code: ApiErrorCode,
  message: string,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<ParseResult<T>> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return {
      ok: false,
      response: jsonError(400, "VALIDATION_FAILED", "Request body must be valid JSON."),
    };
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    const first = result.error.issues[0];
    const path = first?.path.join(".");
    return {
      ok: false,
      response: jsonError(
        400,
        "VALIDATION_FAILED",
        path ? `${path}: ${first.message}` : "Request body is invalid.",
      ),
    };
  }

  return { ok: true, data: result.data };
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
