import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";

/**
 * Server components can't return a status code, so map our domain errors onto
 * Next's own navigation primitives. Without this an AppError thrown by a
 * service (e.g. the care-relationship guard) renders a generic 500.
 */
export async function guarded<T>(work: Promise<T> | (() => Promise<T>)): Promise<T> {
  try {
    return await (typeof work === "function" ? work() : work);
  } catch (e) {
    if (e instanceof AppError) {
      if (e.code === "UNAUTHORIZED") redirect("/login");
      if (e.code === "FORBIDDEN") redirect("/403");
      if (e.code === "NOT_FOUND") notFound();
    }
    throw e;
  }
}
