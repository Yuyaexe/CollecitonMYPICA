/** Extract a readable message from Error / Postgrest / unknown throws. */
export function errorMessage(error: unknown, fallback = "Operation failed"): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const obj = error as { message?: unknown; error?: unknown; details?: unknown; hint?: unknown };
    if (typeof obj.message === "string" && obj.message.trim()) return obj.message;
    if (typeof obj.error === "string" && obj.error.trim()) return obj.error;
    const details = typeof obj.details === "string" ? obj.details : "";
    const hint = typeof obj.hint === "string" ? obj.hint : "";
    const combined = [details, hint].filter(Boolean).join(" — ");
    if (combined) return combined;
  }
  return fallback;
}

export function isAnimeShareSchemaError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("schema cache") ||
    m.includes("anime_workspace") ||
    m.includes("accept_anime_workspace_invites") ||
    m.includes("could not find the function") ||
    m.includes("could not find the table")
  );
}

export function toError(error: unknown, fallback = "Operation failed"): Error {
  if (error instanceof Error) return error;
  return new Error(errorMessage(error, fallback));
}
