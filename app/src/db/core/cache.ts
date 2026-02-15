/**
 * TTLCache - Time-based cache for database read operations
 * =========================================================
 *
 * Provides a simple TTL (time-to-live) cache for caching expensive
 * database queries. Entries automatically expire after their TTL.
 *
 * @example
 * const cache = new TTLCache({ defaultTTL: 60000 }); // 60 seconds
 *
 * // Get or compute value
 * const areas = cache.getOrSet('areas:all', () => getAllAreas(), 30000);
 *
 * // Invalidate on write
 * cache.delete('areas:all');
 * cache.deletePattern('areas:*');
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * TTL Cache entry structure
 */
export interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size?: number;
  hitRate?: number;
}

/**
 * Cache options
 */
export interface CacheOptions {
  defaultTTL?: number;
  maxEntries?: number;
  enableStats?: boolean;
}

/**
 * Cache entry metadata (for debugging)
 */
export interface CacheMetadata {
  createdAt: string;
  expiresAt: string;
  ttlRemaining: number;
  isExpired: boolean;
  hits: number;
}

/**
 * Options for cached function wrapper
 */
export interface CachedOptions<TArgs extends unknown[]> {
  cache?: TTLCache;
  keyFn: (...args: TArgs) => string;
  ttl?: number;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Default TTL in milliseconds (60 seconds)
 */
const DEFAULT_TTL = 60000;

/**
 * Maximum number of entries in the cache before cleanup
 */
const MAX_ENTRIES = 1000;

// ============================================
// TTL CACHE CLASS
// ============================================

/**
 * TTL Cache class for caching read results.
 */
export class TTLCache {
  private _defaultTTL: number;
  private _maxEntries: number;
  private _enableStats: boolean;
  private _cache: Map<string, CacheEntry>;
  private _stats: CacheStats;

  /**
   * Create a new TTL cache.
   */
  constructor(options: CacheOptions = {}) {
    this._defaultTTL = options.defaultTTL || DEFAULT_TTL;
    this._maxEntries = options.maxEntries || MAX_ENTRIES;
    this._enableStats = options.enableStats || false;
    this._cache = new Map();
    this._stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  /**
   * Get a value from the cache.
   * Returns undefined if key doesn't exist or is expired.
   */
  get<T = unknown>(key: string): T | undefined {
    const entry = this._cache.get(key);

    if (!entry) {
      if (this._enableStats) this._stats.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      if (this._enableStats) this._stats.misses++;
      return undefined;
    }

    entry.hits++;
    if (this._enableStats) this._stats.hits++;
    return entry.value as T;
  }

  /**
   * Set a value in the cache.
   */
  set<T = unknown>(key: string, value: T, ttl: number = this._defaultTTL): void {
    // Cleanup if cache is too large
    if (this._cache.size >= this._maxEntries) {
      this._cleanup();
    }

    const now = Date.now();
    this._cache.set(key, {
      value,
      expiresAt: now + ttl,
      createdAt: now,
      hits: 0,
    });

    if (this._enableStats) this._stats.sets++;
  }

  /**
   * Get a value from cache, or compute and cache it if missing.
   */
  getOrSet<T>(key: string, compute: () => T, ttl: number = this._defaultTTL): T {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = compute();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get a value from cache, or compute and cache it if missing (async version).
   */
  async getOrSetAsync<T>(
    key: string,
    compute: () => Promise<T>,
    ttl: number = this._defaultTTL
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Check if a key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this._cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this._cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key from the cache.
   */
  delete(key: string): boolean {
    const deleted = this._cache.delete(key);
    if (deleted && this._enableStats) this._stats.deletes++;
    return deleted;
  }

  /**
   * Delete all keys matching a pattern.
   * Supports * as wildcard.
   */
  deletePattern(pattern: string): number {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*'); // Convert * to .*
    const regex = new RegExp(`^${regexPattern}$`);

    let count = 0;
    for (const key of this._cache.keys()) {
      if (regex.test(key)) {
        this._cache.delete(key);
        count++;
      }
    }

    if (this._enableStats) this._stats.deletes += count;
    return count;
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    const size = this._cache.size;
    this._cache.clear();
    if (this._enableStats) this._stats.deletes += size;
  }

  /**
   * Get the number of entries in the cache.
   * Note: May include expired entries until cleanup.
   */
  get size(): number {
    return this._cache.size;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats & { size: number; hitRate: number } {
    const total = this._stats.hits + this._stats.misses;
    return {
      ...this._stats,
      size: this._cache.size,
      hitRate: total > 0 ? (this._stats.hits / total) * 100 : 0,
    };
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this._stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
    };
  }

  /**
   * Get all valid (non-expired) keys.
   */
  keys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];
    for (const [key, entry] of this._cache.entries()) {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      }
    }
    return validKeys;
  }

  /**
   * Get entry metadata (for debugging).
   */
  getMetadata(key: string): CacheMetadata | null {
    const entry = this._cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    return {
      createdAt: new Date(entry.createdAt).toISOString(),
      expiresAt: new Date(entry.expiresAt).toISOString(),
      ttlRemaining: Math.max(0, entry.expiresAt - now),
      isExpired: now > entry.expiresAt,
      hits: entry.hits,
    };
  }

  /**
   * Clean up expired entries and evict LRU entries if over limit.
   * Called automatically when cache exceeds maxEntries.
   */
  private _cleanup(): void {
    const now = Date.now();
    const entries: Array<{ key: string; entry: CacheEntry }> = [];

    // Remove expired and collect others
    for (const [key, entry] of this._cache.entries()) {
      if (now > entry.expiresAt) {
        this._cache.delete(key);
        if (this._enableStats) this._stats.evictions++;
      } else {
        entries.push({ key, entry });
      }
    }

    // If still over limit, evict least recently used
    if (entries.length >= this._maxEntries) {
      // Sort by hits (ascending) and createdAt (ascending)
      entries.sort((a, b) => {
        if (a.entry.hits !== b.entry.hits) {
          return a.entry.hits - b.entry.hits;
        }
        return a.entry.createdAt - b.entry.createdAt;
      });

      // Evict bottom 10%
      const evictCount = Math.ceil(entries.length * 0.1);
      for (let i = 0; i < evictCount; i++) {
        this._cache.delete(entries[i].key);
        if (this._enableStats) this._stats.evictions++;
      }
    }
  }
}

// =============================================================================
// Cache Key Helpers
// =============================================================================

/**
 * Create a cache key from parts.
 */
export function cacheKey(...parts: (string | number)[]): string {
  return parts.map((p) => String(p)).join(':');
}

/**
 * Create a cache key for a database query.
 */
export function queryCacheKey(
  table: string,
  operation: string,
  params: unknown = null
): string {
  const base = `query:${table}:${operation}`;
  if (params === null || params === undefined) {
    return base;
  }
  return `${base}:${JSON.stringify(params)}`;
}

// =============================================================================
// Default Cache Instances
// =============================================================================

/**
 * Default cache instance for the application.
 * Use this for most caching needs.
 */
export const defaultCache = new TTLCache({
  defaultTTL: 60000, // 1 minute
  maxEntries: 500,
  enableStats: true,
});

/**
 * Cache with shorter TTL for frequently-changing data.
 * Use for things like search results, counts, etc.
 */
export const shortCache = new TTLCache({
  defaultTTL: 10000, // 10 seconds
  maxEntries: 100,
  enableStats: true,
});

/**
 * Cache with longer TTL for rarely-changing data.
 * Use for things like schema info, constants, etc.
 */
export const longCache = new TTLCache({
  defaultTTL: 300000, // 5 minutes
  maxEntries: 50,
  enableStats: true,
});

// =============================================================================
// Cache Decorators
// =============================================================================

/**
 * Create a cached version of a function.
 */
export function cached<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  options: CachedOptions<TArgs>
): (...args: TArgs) => TReturn {
  const { cache = defaultCache, keyFn, ttl } = options;

  return function cachedFn(...args: TArgs): TReturn {
    const key = keyFn(...args);
    return cache.getOrSet(key, () => fn(...args), ttl);
  };
}

/**
 * Create a cached version of an async function.
 */
export function cachedAsync<TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: CachedOptions<TArgs>
): (...args: TArgs) => Promise<TReturn> {
  const { cache = defaultCache, keyFn, ttl } = options;

  return async function cachedAsyncFn(...args: TArgs): Promise<TReturn> {
    const key = keyFn(...args);
    return cache.getOrSetAsync(key, () => fn(...args), ttl);
  };
}
