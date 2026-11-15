/**
 * Generates a unique, collision-resistant idempotency key suitable for API headers and request bodies.
 */
export function generateIdempotencyKey(prefix = 'idemp'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
