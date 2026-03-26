/**
 * QueryBuilder Tests
 * ==================
 */

import { describe, it, expect } from 'vitest';
import { QueryBuilder, query, ALLOWED_TABLES } from '../query-builder.js';

describe('QueryBuilder', () => {
  describe('SELECT queries', () => {
    it('builds a simple SELECT *', () => {
      const q = new QueryBuilder().select().from('areas').build();

      expect(q.sql).toBe('SELECT * FROM areas');
      expect(q.params).toEqual([]);
    });

    it('builds SELECT with specific columns', () => {
      const q = new QueryBuilder().select('id', 'name', 'created_at').from('areas').build();

      expect(q.sql).toBe('SELECT id, name, created_at FROM areas');
      expect(q.params).toEqual([]);
    });

    it('builds SELECT with WHERE clause', () => {
      const q = new QueryBuilder().select('*').from('areas').where('id = ?', [42]).build();

      expect(q.sql).toBe('SELECT * FROM areas WHERE id = ?');
      expect(q.params).toEqual([42]);
    });

    it('builds SELECT with multiple WHERE conditions (AND)', () => {
      const q = new QueryBuilder()
        .select('*')
        .from('folders')
        .where('category_id = ?', [5])
        .andWhere('name LIKE ?', ['%test%'])
        .build();

      expect(q.sql).toBe('SELECT * FROM folders WHERE category_id = ? AND name LIKE ?');
      expect(q.params).toEqual([5, '%test%']);
    });

    it('builds SELECT with OR conditions', () => {
      const q = new QueryBuilder()
        .select('*')
        .from('items')
        .where('folder_id = ?', [1])
        .orWhere('folder_id = ?', [2])
        .build();

      expect(q.sql).toBe('SELECT * FROM items WHERE folder_id = ? OR folder_id = ?');
      expect(q.params).toEqual([1, 2]);
    });

    it('builds SELECT with ORDER BY', () => {
      const q = new QueryBuilder().select('*').from('areas').orderBy('name', 'ASC').build();

      expect(q.sql).toBe('SELECT * FROM areas ORDER BY name ASC');
    });

    it('builds SELECT with multiple ORDER BY', () => {
      const q = new QueryBuilder()
        .select('*')
        .from('folders')
        .orderBy('category_id', 'ASC')
        .orderBy('name', 'DESC')
        .build();

      expect(q.sql).toBe('SELECT * FROM folders ORDER BY category_id ASC, name DESC');
    });

    it('builds SELECT with LIMIT', () => {
      const q = new QueryBuilder().select('*').from('items').limit(10).build();

      expect(q.sql).toBe('SELECT * FROM items LIMIT 10');
    });

    it('builds SELECT with LIMIT and OFFSET', () => {
      const q = new QueryBuilder().select('*').from('items').limit(10).offset(20).build();

      expect(q.sql).toBe('SELECT * FROM items LIMIT 10 OFFSET 20');
    });

    it('builds complete SELECT query', () => {
      const q = new QueryBuilder()
        .select('id', 'name')
        .from('folders')
        .where('category_id = ?', [5])
        .orderBy('name', 'ASC')
        .limit(10)
        .offset(0)
        .build();

      expect(q.sql).toBe(
        'SELECT id, name FROM folders WHERE category_id = ? ORDER BY name ASC LIMIT 10 OFFSET 0'
      );
      expect(q.params).toEqual([5]);
    });

    it('allows SQL functions in SELECT', () => {
      const q = new QueryBuilder()
        .select('COUNT(*)', 'MAX(priority)')
        .from('organization_rules')
        .build();

      expect(q.sql).toBe('SELECT COUNT(*), MAX(priority) FROM organization_rules');
    });

    it('allows column aliases', () => {
      const q = new QueryBuilder().select('name AS folder_name', 'id').from('folders').build();

      expect(q.sql).toBe('SELECT name AS folder_name, id FROM folders');
    });
  });

  describe('INSERT queries', () => {
    it('builds INSERT with columns and values', () => {
      const q = new QueryBuilder()
        .insert('areas', ['name', 'range_start', 'range_end'])
        .values(['Admin', '10', '19'])
        .build();

      expect(q.sql).toBe('INSERT INTO areas (name, range_start, range_end) VALUES (?, ?, ?)');
      expect(q.params).toEqual(['Admin', '10', '19']);
    });

    it('builds INSERT with single value', () => {
      const q = new QueryBuilder().insert('areas', ['name']).values(['Test']).build();

      expect(q.sql).toBe('INSERT INTO areas (name) VALUES (?)');
      expect(q.params).toEqual(['Test']);
    });
  });

  describe('UPDATE queries', () => {
    it('builds UPDATE with single SET', () => {
      const q = new QueryBuilder()
        .update('areas')
        .set('name', 'New Name')
        .where('id = ?', [1])
        .build();

      expect(q.sql).toBe('UPDATE areas SET name = ? WHERE id = ?');
      expect(q.params).toEqual(['New Name', 1]);
    });

    it('builds UPDATE with multiple SET', () => {
      const q = new QueryBuilder()
        .update('folders')
        .set('name', 'Updated')
        .set('description', 'New desc')
        .where('id = ?', [5])
        .build();

      expect(q.sql).toBe('UPDATE folders SET name = ?, description = ? WHERE id = ?');
      expect(q.params).toEqual(['Updated', 'New desc', 5]);
    });

    it('builds UPDATE with setMany', () => {
      const q = new QueryBuilder()
        .update('items')
        .setMany({ name: 'Item', description: 'Desc', file_path: '/path' })
        .where('id = ?', [10])
        .build();

      expect(q.sql).toBe('UPDATE items SET name = ?, description = ?, file_path = ? WHERE id = ?');
      expect(q.params).toEqual(['Item', 'Desc', '/path', 10]);
    });
  });

  describe('DELETE queries', () => {
    it('builds DELETE with WHERE', () => {
      const q = new QueryBuilder().delete('areas').where('id = ?', [1]).build();

      expect(q.sql).toBe('DELETE FROM areas WHERE id = ?');
      expect(q.params).toEqual([1]);
    });

    it('builds DELETE with multiple conditions', () => {
      const q = new QueryBuilder()
        .delete('items')
        .where('folder_id = ?', [5])
        .andWhere('name LIKE ?', ['temp%'])
        .build();

      expect(q.sql).toBe('DELETE FROM items WHERE folder_id = ? AND name LIKE ?');
      expect(q.params).toEqual([5, 'temp%']);
    });
  });

  describe('Validation', () => {
    it('rejects invalid table names', () => {
      expect(() => {
        new QueryBuilder().select().from('invalid_table').build();
      }).toThrow(/Invalid table name/);
    });

    it('rejects SQL injection in table names', () => {
      expect(() => {
        new QueryBuilder().select().from('areas; DROP TABLE areas').build();
      }).toThrow(/Invalid table name/);
    });

    it('rejects invalid column names', () => {
      expect(() => {
        new QueryBuilder().select('id; DROP TABLE areas').from('areas').build();
      }).toThrow(/Invalid column name/);
    });

    it('rejects invalid ORDER BY direction', () => {
      expect(() => {
        new QueryBuilder().select().from('areas').orderBy('id', 'INVALID').build();
      }).toThrow(/Invalid ORDER BY direction/);
    });

    it('rejects negative LIMIT', () => {
      expect(() => {
        new QueryBuilder().select().from('areas').limit(-1).build();
      }).toThrow(/LIMIT must be a non-negative integer/);
    });

    it('rejects non-integer LIMIT', () => {
      expect(() => {
        new QueryBuilder().select().from('areas').limit(1.5).build();
      }).toThrow(/LIMIT must be a non-negative integer/);
    });

    it('rejects setting query type twice', () => {
      expect(() => {
        new QueryBuilder().select().insert('areas', ['name']);
      }).toThrow(/Query type already set/);
    });

    it('requires SET for UPDATE', () => {
      expect(() => {
        new QueryBuilder().update('areas').where('id = ?', [1]).build();
      }).toThrow(/UPDATE requires at least one SET/);
    });

    it('validates value count matches column count', () => {
      expect(() => {
        new QueryBuilder().insert('areas', ['name', 'description']).values(['Only one']).build();
      }).toThrow(/Value count.*must match column count/);
    });
  });

  describe('query() helper', () => {
    it('creates a new QueryBuilder instance', () => {
      const q = query().select().from('areas').build();
      expect(q.sql).toBe('SELECT * FROM areas');
    });
  });

  describe('ALLOWED_TABLES', () => {
    it('includes all JDex tables', () => {
      expect(ALLOWED_TABLES.has('areas')).toBe(true);
      expect(ALLOWED_TABLES.has('categories')).toBe(true);
      expect(ALLOWED_TABLES.has('folders')).toBe(true);
      expect(ALLOWED_TABLES.has('items')).toBe(true);
      expect(ALLOWED_TABLES.has('cloud_drives')).toBe(true);
      expect(ALLOWED_TABLES.has('organization_rules')).toBe(true);
    });
  });
});
