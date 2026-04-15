import Redis from 'ioredis';

// Cache TTL constants (seconds)
export const CACHE_TTL = {
  SEARCH: 60 * 5,        // 5 minutes — search results
  BOOKING_DATA: 60 * 2,  // 2 minutes — booking/location data
} as const;

// Build a cache key for the search endpoint
export function searchCacheKey(params: URLSearchParams): string {
  // Normalise: sort keys so order doesn't matter
  const sorted = new URLSearchParams(
    [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
  );
  return `search:v1:${sorted.toString()}`;
}

declare global {
  // Persist the Redis instance across HMR reloads in dev
  // eslint-disable-next-line no-var
  var _redis: Redis | undefined;
}

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    // No Redis configured — cache is disabled (no-op fallback used in route)
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,    // don't block requests if Redis is slow
    connectTimeout: 2000,
    lazyConnect: false,
    enableOfflineQueue: false,  // fail fast if disconnected
    tls: url.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  client.on('error', (err) => {
    // Log but never throw — cache errors must be transparent to users
    console.error('[Redis] connection error:', err.message);
  });

  return client;
}

const redis: Redis | null = global._redis ?? createRedisClient();

if (process.env.NODE_ENV !== 'production' && redis) {
  global._redis = redis;
}

export default redis;

/**
 * Get a cached value, or compute + store it.
 * If Redis is unavailable, always runs the compute function.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>
): Promise<T> {
  if (!redis) return compute();

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch {
    // Redis read failed — fall through to compute
  }

  const value = await compute();

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Redis write failed — return value anyway
  }

  return value;
}
