/**
 * Cache Tests
 * ===========
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TTLCache, cacheKey, queryCacheKey, cached, cachedAsync } from '../cache.js';

describe('TTLCache', () => {
  let cache;

  beforeEach(() => {
    cache = new TTLCache({ defaultTTL: 1000, enableStats: true });
  });

  describe('get/set', () => {
    it('stores and retrieves values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('returns undefined for missing keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('returns undefined for expired keys', async () => {
      cache.set('expiring', 'value', 50); // 50ms TTL
      expect(cache.get('expiring')).toBe('value');

      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(cache.get('expiring')).toBeUndefined();
    });

    it('uses default TTL if not specified', () => {
      const shortCache = new TTLCache({ defaultTTL: 100 });
      shortCache.set('key', 'value');

      const metadata = shortCache.getMetadata('key');
      expect(metadata.ttlRemaining).toBeLessThanOrEqual(100);
      expect(metadata.ttlRemaining).toBeGreaterThan(0);
    });
  });

  describe('getOrSet', () => {
    it('returns cached value if exists', () => {
      cache.set('cached', 'original');
      const compute = vi.fn(() => 'computed');

      const result = cache.getOrSet('cached', compute);

      expect(result).toBe('original');
      expect(compute).not.toHaveBeenCalled();
    });

    it('computes and caches value if missing', () => {
      const compute = vi.fn(() => 'computed');

      const result = cache.getOrSet('new', compute);

      expect(result).toBe('computed');
      expect(compute).toHaveBeenCalledTimes(1);
      expect(cache.get('new')).toBe('computed');
    });

    it('recomputes after expiration', async () => {
      let callCount = 0;
      const compute = () => `call-${++callCount}`;

      cache.getOrSet('key', compute, 50);
      expect(cache.get('key')).toBe('call-1');

      await new Promise((resolve) => setTimeout(resolve, 60));

      cache.getOrSet('key', compute, 50);
      expect(cache.get('key')).toBe('call-2');
    });
  });

  describe('getOrSetAsync', () => {
    it('handles async compute functions', async () => {
      const compute = vi.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'async-value';
      });

      const result = await cache.getOrSetAsync('async', compute);

      expect(result).toBe('async-value');
      expect(compute).toHaveBeenCalledTimes(1);
    });

    it('returns cached value without calling compute', async () => {
      cache.set('cached', 'existing');
      const compute = vi.fn(async () => 'new');

      const result = await cache.getOrSetAsync('cached', compute);

      expect(result).toBe('existing');
      expect(compute).not.toHaveBeenCalled();
    });
  });

  describe('has', () => {
    it('returns true for existing keys', () => {
      cache.set('exists', 'value');
      expect(cache.has('exists')).toBe(true);
    });

    it('returns false for missing keys', () => {
      expect(cache.has('missing')).toBe(false);
    });

    it('returns false for expired keys', async () => {
      cache.set('expiring', 'value', 50);
      await new Promise((resolve) => setTimeout(resolve, 60));
      expect(cache.has('expiring')).toBe(false);
    });
  });

  describe('delete', () => {
    it('removes a key', () => {
      cache.set('key', 'value');
      expect(cache.delete('key')).toBe(true);
      expect(cache.get('key')).toBeUndefined();
    });

    it('returns false for missing keys', () => {
      expect(cache.delete('nonexistent')).toBe(false);
    });
  });

  describe('deletePattern', () => {
    it('deletes matching keys', () => {
      cache.set('areas:all', 'v1');
      cache.set('areas:1', 'v2');
      cache.set('areas:2', 'v3');
      cache.set('folders:all', 'v4');

      const count = cache.deletePattern('areas:*');

      expect(count).toBe(3);
      expect(cache.get('areas:all')).toBeUndefined();
      expect(cache.get('folders:all')).toBe('v4');
    });

    it('handles exact match patterns', () => {
      cache.set('exact', 'value');
      cache.set('exactlynot', 'other');

      const count = cache.deletePattern('exact');

      expect(count).toBe(1);
      expect(cache.get('exact')).toBeUndefined();
      expect(cache.get('exactlynot')).toBe('other');
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('returns number of entries', () => {
      expect(cache.size).toBe(0);
      cache.set('a', 1);
      expect(cache.size).toBe(1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });
  });

  describe('keys', () => {
    it('returns valid keys', () => {
      cache.set('a', 1);
      cache.set('b', 2);

      const keys = cache.keys();

      expect(keys).toContain('a');
      expect(keys).toContain('b');
      expect(keys.length).toBe(2);
    });

    it('excludes expired keys', async () => {
      cache.set('short', 'v', 50);
      cache.set('long', 'v', 5000);

      await new Promise((resolve) => setTimeout(resolve, 60));

      const keys = cache.keys();
      expect(keys).not.toContain('short');
      expect(keys).toContain('long');
    });
  });

  describe('getMetadata', () => {
    it('returns entry metadata', () => {
      cache.set('key', 'value', 5000);

      const metadata = cache.getMetadata('key');

      expect(metadata).toBeDefined();
      expect(metadata.isExpired).toBe(false);
      expect(metadata.ttlRemaining).toBeGreaterThan(0);
      expect(metadata.hits).toBe(0);
    });

    it('tracks hits', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('key');
      cache.get('key');

      expect(cache.getMetadata('key').hits).toBe(3);
    });

    it('returns null for missing keys', () => {
      expect(cache.getMetadata('missing')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('tracks cache statistics', () => {
      cache.set('key', 'value');
      cache.get('key');
      cache.get('key');
      cache.get('missing');

      const stats = cache.getStats();

      expect(stats.sets).toBe(1);
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(66.67, 0);
    });
  });

  describe('cleanup', () => {
    it('evicts entries when over maxEntries', () => {
      const smallCache = new TTLCache({ maxEntries: 5, enableStats: true });

      for (let i = 0; i < 10; i++) {
        smallCache.set(`key${i}`, `value${i}`);
      }

      expect(smallCache.size).toBeLessThan(10);
    });
  });
});

describe('Cache Key Helpers', () => {
  describe('cacheKey', () => {
    it('joins parts with colon', () => {
      expect(cacheKey('areas', 'all')).toBe('areas:all');
      expect(cacheKey('folder', 123)).toBe('folder:123');
      expect(cacheKey('a', 'b', 'c')).toBe('a:b:c');
    });
  });

  describe('queryCacheKey', () => {
    it('creates query cache key without params', () => {
      expect(queryCacheKey('areas', 'all')).toBe('query:areas:all');
    });

    it('creates query cache key with params', () => {
      const key = queryCacheKey('folders', 'byCategory', { categoryId: 5 });
      expect(key).toBe('query:folders:byCategory:{"categoryId":5}');
    });
  });
});

describe('Cache Decorators', () => {
  describe('cached', () => {
    it('caches function results', () => {
      const cache = new TTLCache();
      let callCount = 0;
      const fn = () => ++callCount;

      const cachedFn = cached(fn, {
        cache,
        keyFn: () => 'test-key',
        ttl: 1000,
      });

      expect(cachedFn()).toBe(1);
      expect(cachedFn()).toBe(1);
      expect(cachedFn()).toBe(1);
      expect(callCount).toBe(1);
    });

    it('uses keyFn to generate cache keys', () => {
      const cache = new TTLCache();
      const fn = (id) => `result-${id}`;

      const cachedFn = cached(fn, {
        cache,
        keyFn: (id) => `item:${id}`,
        ttl: 1000,
      });

      expect(cachedFn(1)).toBe('result-1');
      expect(cachedFn(2)).toBe('result-2');
      expect(cachedFn(1)).toBe('result-1'); // Cached
    });
  });

  describe('cachedAsync', () => {
    it('caches async function results', async () => {
      const cache = new TTLCache();
      let callCount = 0;
      const fn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return ++callCount;
      };

      const cachedFn = cachedAsync(fn, {
        cache,
        keyFn: () => 'async-key',
        ttl: 1000,
      });

      expect(await cachedFn()).toBe(1);
      expect(await cachedFn()).toBe(1);
      expect(callCount).toBe(1);
    });
  });
});
