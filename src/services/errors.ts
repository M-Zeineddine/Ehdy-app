// The backend's error envelope is { success: false, error: { code, message } }.
// The api interceptors rewrap axios failures into plain Errors and attach the
// backend's stable `code` here, so callers can branch on codes instead of
// matching message substrings that break when backend copy changes.
export interface ApiError extends Error {
  code?: string;
}

export function getErrorCode(err: unknown): string | null {
  if (err instanceof Error) {
    const code = (err as ApiError).code;
    if (typeof code === 'string') return code;
  }
  return null;
}

export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
