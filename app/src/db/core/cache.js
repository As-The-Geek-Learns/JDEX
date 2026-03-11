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

/**
 * Default TTL in milliseconds (60 seconds)
 */
const DEFAULT_TTL = 60000;

/**
 * Maximum number of entries in the cache before cleanup
 */
const MAX_ENTRIES = 1000;

/**
 * TTL Cache entry structure
 * @typedef {Object} CacheEntry
 * @property {any} value - Cached value
 * @property {number} expiresAt - Timestamp when entry expires
 * @property {number} createdAt - Timestamp when entry was created
 * @property {number} hits - Number of times entry was accessed
 */

/**
 * TTL Cache class for caching read results.
 */
export class TTLCache {
  /**
   * Create a new TTL cache.
   * @param {Object} options - Cache options
   * @param {number} options.defaultTTL - Default TTL in milliseconds (default: 60000)
   * @param {number} options.maxEntries - Maximum entries before cleanup (default: 1000)
   * @param {boolean} options.enableStats - Track cache statistics (default: false)
   */
  constructor(options = {}) {
    this._defaultTTL = options.defaultTTL || DEFAULT_TTL;
    this._maxEntries = options.maxEntries || MAX_ENTRIES;
    this._enableStats = options.enableStats || false;

    /** @type {Map<string, CacheEntry>} */
    this._cache = new Map();

    // Statistics
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
   *
   * @param {string} key - Cache key
   * @returns {any|undefined} Cached value or undefined
   */
  get(key) {
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
    return entry.value;
  }

  /**
   * Set a value in the cache.
   *
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - TTL in milliseconds (default: defaultTTL)
   */
  set(key, value, ttl = this._defaultTTL) {
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
   *
   * @param {string} key - Cache key
   * @param {Function} compute - Function to compute value if not cached
   * @param {number} ttl - TTL in milliseconds (default: defaultTTL)
   * @returns {any} Cached or computed value
   *
   * @example
   * const areas = cache.getOrSet('areas:all', () => db.getAllAreas());
   */
  getOrSet(key, compute, ttl = this._defaultTTL) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = compute();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Get a value from cache, or compute and cache it if missing (async version).
   *
   * @param {string} key - Cache key
   * @param {Function} compute - Async function to compute value if not cached
   * @param {number} ttl - TTL in milliseconds (default: defaultTTL)
   * @returns {Promise<any>} Cached or computed value
   *
   * @example
   * const areas = await cache.getOrSetAsync('areas:all', async () => fetchAreas());
   */
  async getOrSetAsync(key, compute, ttl = this._defaultTTL) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await compute();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Check if a key exists and is not expired.
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
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
   *
   * @param {string} key - Cache key
   * @returns {boolean} True if key was deleted
   */
  delete(key) {
    const deleted = this._cache.delete(key);
    if (deleted && this._enableStats) this._stats.deletes++;
    return deleted;
  }

  /**
   * Delete all keys matching a pattern.
   * Supports * as wildcard.
   *
   * @param {string} pattern - Pattern with * wildcard
   * @returns {number} Number of keys deleted
   *
   * @example
   * cache.deletePattern('areas:*'); // Deletes areas:all, areas:1, etc.
   */
  deletePattern(pattern) {
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
  clear() {
    const size = this._cache.size;
    this._cache.clear();
    if (this._enableStats) this._stats.deletes += size;
  }

  /**
   * Get the number of entries in the cache.
   * Note: May include expired entries until cleanup.
   *
   * @returns {number} Number of entries
   */
  get size() {
    return this._cache.size;
  }

  /**
   * Get cache statistics.
   *
   * @returns {Object} Statistics object
   */
  getStats() {
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
  resetStats() {
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
   *
   * @returns {string[]} Array of valid keys
   */
  keys() {
    const now = Date.now();
    const validKeys = [];
    for (const [key, entry] of this._cache.entries()) {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      }
    }
    return validKeys;
  }

  /**
   * Get entry metadata (for debugging).
   *
   * @param {string} key - Cache key
   * @returns {Object|null} Entry metadata or null
   */
  getMetadata(key) {
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
  _cleanup() {
    const now = Date.now();
    const entries = [];

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
 *
 * @param {...string} parts - Key parts to join
 * @returns {string} Cache key
 *
 * @example
 * cacheKey('areas', 'all'); // 'areas:all'
 * cacheKey('folder', 123); // 'folder:123'
 */
export function cacheKey(...parts) {
  return parts.map((p) => String(p)).join(':');
}

/**
 * Create a cache key for a database query.
 *
 * @param {string} table - Table name
 * @param {string} operation - Operation name (e.g., 'all', 'byId', 'search')
 * @param {any} params - Query parameters (will be JSON-stringified)
 * @returns {string} Cache key
 *
 * @example
 * queryCacheKey('areas', 'all'); // 'query:areas:all'
 * queryCacheKey('folders', 'byCategory', { categoryId: 5 }); // 'query:folders:byCategory:{"categoryId":5}'
 */
export function queryCacheKey(table, operation, params = null) {
  const base = `query:${table}:${operation}`;
  if (params === null || params === undefined) {
    return base;
  }
  return `${base}:${JSON.stringify(params)}`;
}

// =============================================================================
// Default Cache Instance
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
 *
 * @param {Function} fn - Function to cache
 * @param {Object} options - Options
 * @param {TTLCache} options.cache - Cache instance to use
 * @param {Function} options.keyFn - Function to generate cache key from args
 * @param {number} options.ttl - TTL in milliseconds
 * @returns {Function} Cached function
 *
 * @example
 * const cachedGetAreas = cached(getAllAreas, {
 *   cache: defaultCache,
 *   keyFn: () => 'areas:all',
 *   ttl: 30000
 * });
 */
export function cached(fn, options) {
  const { cache = defaultCache, keyFn, ttl } = options;

  return function cachedFn(...args) {
    const key = keyFn(...args);
    return cache.getOrSet(key, () => fn(...args), ttl);
  };
}

/**
 * Create a cached version of an async function.
 *
 * @param {Function} fn - Async function to cache
 * @param {Object} options - Options (same as cached())
 * @returns {Function} Cached async function
 */
export function cachedAsync(fn, options) {
  const { cache = defaultCache, keyFn, ttl } = options;

  return async function cachedAsyncFn(...args) {
    const key = keyFn(...args);
    return cache.getOrSetAsync(key, () => fn(...args), ttl);
  };
}
