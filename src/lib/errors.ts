import { ZodError } from "zod";

/** Errors that are safe to show a user verbatim. Anything else becomes a generic message. */
export class AppError extends Error {
  constructor(
    message: string,
    public code:
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "CONFLICT"
      | "VALIDATION"
      | "RATE_LIMIT"
      | "INTERNAL" = "INTERNAL",
    public status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const unauthorized = (m = "Please sign in to continue.") =>
  new AppError(m, "UNAUTHORIZED", 401);
export const forbidden = (m = "You don't have permission to do this.") =>
  new AppError(m, "FORBIDDEN", 403);
export const notFound = (m = "Not found.") => new AppError(m, "NOT_FOUND", 404);
export const conflict = (m: string) => new AppError(m, "CONFLICT", 409);
export const invalid = (m: string) => new AppError(m, "VALIDATION", 422);
export const rateLimited = (m = "Too many attempts. Please try again later.") =>
  new AppError(m, "RATE_LIMIT", 429);

export type ActionError = {
  ok: false;
  error: string;
  code?: string;
  /** field name → first message, so forms can highlight the offending input. */
  fieldErrors?: Record<string, string>;
};

export type ActionResult<T = undefined> = { ok: true; data: T; message?: string } | ActionError;

export function toActionError(e: unknown): ActionError {
  if (e instanceof AppError) return { ok: false, error: e.message, code: e.code };

  // Schema failures are user errors, not crashes — surface them per field.
  if (e instanceof ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of e.issues) {
      const key = issue.path.join(".") || "form";
      fieldErrors[key] ??= issue.message;
    }
    return {
      ok: false,
      error: e.issues[0]?.message ?? "Please check the highlighted fields.",
      code: "VALIDATION",
      fieldErrors,
    };
  }

  console.error("[unhandled]", e);
  return { ok: false, error: "Something went wrong. Please try again.", code: "INTERNAL" };
}
