// ── AharSetu Client & Server Idempotency Safeguard Engine ─────────────────────

const activeKeys = new Set<string>();

/**
 * Ensures an operation (e.g. order submission, vendor price confirmation)
 * cannot be double-executed within a 5-second window.
 */
export function checkAndRegisterIdempotencyKey(key: string, ttlMs = 5000): boolean {
  if (activeKeys.has(key)) {
    return false; // Key already active, block duplicate submission
  }
  activeKeys.add(key);
  setTimeout(() => {
    activeKeys.delete(key);
  }, ttlMs);
  return true; // Key registered successfully
}

export function releaseIdempotencyKey(key: string): void {
  activeKeys.delete(key);
}
