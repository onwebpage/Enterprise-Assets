// Simple in-memory rate limiter for admin login
interface Attempt { count: number; firstAt: number; lockedUntil?: number }
const store = new Map<string, Attempt>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const LOCKOUT_MS = 15 * 60 * 1000; // 15 min

export function checkRateLimit(key: string): { allowed: boolean; remaining: number; retryAfterMs?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (entry) {
    // Locked out?
    if (entry.lockedUntil && now < entry.lockedUntil) {
      return { allowed: false, remaining: 0, retryAfterMs: entry.lockedUntil - now };
    }
    // Reset window if expired
    if (now - entry.firstAt > WINDOW_MS) {
      store.delete(key);
    }
  }

  const current = store.get(key) ?? { count: 0, firstAt: now };
  current.count += 1;

  if (current.count > MAX_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_MS;
    store.set(key, current);
    return { allowed: false, remaining: 0, retryAfterMs: LOCKOUT_MS };
  }

  store.set(key, current);
  return { allowed: true, remaining: MAX_ATTEMPTS - current.count };
}

export function recordSuccess(key: string): void {
  store.delete(key);
}
