/**
 * QueryBuilder - Fluent API for constructing parameterized SQL queries
 * =====================================================================
 *
 * Prevents SQL injection by enforcing parameterized queries.
 * All user-provided values are passed as parameters, never interpolated.
 *
 * @example
 * // SELECT with WHERE
 * const q = new QueryBuilder()
 *   .select('id', 'name', 'created_at')
 *   .from('areas')
 *   .where('id = ?', [42])
 *   .build();
 * // { sql: 'SELECT id, name, created_at FROM areas WHERE id = ?', params: [42] }
 *
 * @example
 * // INSERT
 * const q = new QueryBuilder()
 *   .insert('areas', ['name', 'range_start', 'range_end'])
 *   .values(['Admin', '10', '19'])
 *   .build();
 * // { sql: 'INSERT INTO areas (name, range_start, range_end) VALUES (?, ?, ?)', params: [...] }
 *
 * @example
 * // UPDATE with multiple conditions
 * const q = new QueryBuilder()
 *   .update('folders')
 *   .set('name', 'New Name')
 *   .set('updated_at', new Date().toISOString())
 *   .where('id = ?', [123])
 *   .build();
 */

// Allowed table names - prevents table name injection
const ALLOWED_TABLES = new Set([
  'areas',
  'categories',
  'folders',
  'items',
  'cloud_drives',
  'area_storage',
  'organization_rules',
  'organized_files',
  'scanned_files',
  'watched_folders',
  'watch_activity',
  'activity_log',
  'statistics',
  'schema_version',
]);

// Valid column name pattern (alphanumeric, underscore, dot for table.column)
const VALID_COLUMN_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

// Valid ORDER BY directions
const VALID_DIRECTIONS = new Set(['ASC', 'DESC', 'asc', 'desc']);

/**
 * Validate a table name against the allowlist.
 * @param {string} table - Table name to validate
 * @throws {Error} If table name is not in allowlist
 */
function validateTable(table) {
  if (!table || typeof table !== 'string') {
    throw new Error('Table name is required and must be a string');
  }
  if (!ALLOWED_TABLES.has(table.toLowerCase())) {
    throw new Error(
      `Invalid table name: ${table}. Must be one of: ${[...ALLOWED_TABLES].join(', ')}`
    );
  }
}

/**
 * Validate a column name.
 * @param {string} column - Column name to validate
 * @throws {Error} If column name contains invalid characters
 */
function validateColumn(column) {
  if (!column || typeof column !== 'string') {
    throw new Error('Column name is required and must be a string');
  }
  // Allow * for SELECT *
  if (column === '*') return;
  // Allow SQL functions like COUNT(*), MAX(column), etc.
  if (/^[A-Z_]+\s*\(.*\)$/i.test(column)) return;
  // Allow aliased columns like "column AS alias"
  const parts = column.split(/\s+AS\s+/i);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed && !VALID_COLUMN_PATTERN.test(trimmed)) {
      throw new Error(`Invalid column name: ${column}`);
    }
  }
}

/**
 * Validate ORDER BY direction.
 * @param {string} direction - Direction to validate (ASC or DESC)
 * @throws {Error} If direction is invalid
 */
function validateDirection(direction) {
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new Error(`Invalid ORDER BY direction: ${direction}. Must be ASC or DESC`);
  }
}

/**
 * QueryBuilder class for constructing parameterized SQL queries.
 */
export class QueryBuilder {
  constructor() {
    this._type = null; // 'select', 'insert', 'update', 'delete'
    this._table = null;
    this._columns = [];
    this._values = [];
    this._sets = []; // For UPDATE: [{ column, value }]
    this._wheres = []; // [{ condition, params, connector }]
    this._orderBy = []; // [{ column, direction }]
    this._limit = null;
    this._offset = null;
    this._params = [];
  }

  /**
   * Start a SELECT query.
   * @param {...string} columns - Columns to select (use '*' for all)
   * @returns {QueryBuilder} this for chaining
   */
  select(...columns) {
    if (this._type) throw new Error('Query type already set');
    this._type = 'select';
    if (columns.length === 0) {
      this._columns = ['*'];
    } else {
      columns.forEach(validateColumn);
      this._columns = columns;
    }
    return this;
  }

  /**
   * Specify the table for the query.
   * @param {string} table - Table name
   * @returns {QueryBuilder} this for chaining
   */
  from(table) {
    validateTable(table);
    this._table = table;
    return this;
  }

  /**
   * Start an INSERT query.
   * @param {string} table - Table to insert into
   * @param {string[]} columns - Columns to insert
   * @returns {QueryBuilder} this for chaining
   */
  insert(table, columns) {
    if (this._type) throw new Error('Query type already set');
    this._type = 'insert';
    validateTable(table);
    this._table = table;
    if (columns && columns.length > 0) {
      columns.forEach(validateColumn);
      this._columns = columns;
    }
    return this;
  }

  /**
   * Specify values for INSERT.
   * @param {any[]} values - Values to insert (must match column count)
   * @returns {QueryBuilder} this for chaining
   */
  values(values) {
    if (this._type !== 'insert') {
      throw new Error('values() can only be used with INSERT');
    }
    if (this._columns.length > 0 && values.length !== this._columns.length) {
      throw new Error(
        `Value count (${values.length}) must match column count (${this._columns.length})`
      );
    }
    this._values = values;
    return this;
  }

  /**
   * Start an UPDATE query.
   * @param {string} table - Table to update
   * @returns {QueryBuilder} this for chaining
   */
  update(table) {
    if (this._type) throw new Error('Query type already set');
    this._type = 'update';
    validateTable(table);
    this._table = table;
    return this;
  }

  /**
   * Add a SET clause for UPDATE.
   * @param {string} column - Column to update
   * @param {any} value - New value
   * @returns {QueryBuilder} this for chaining
   */
  set(column, value) {
    if (this._type !== 'update') {
      throw new Error('set() can only be used with UPDATE');
    }
    validateColumn(column);
    this._sets.push({ column, value });
    return this;
  }

  /**
   * Add multiple SET clauses from an object.
   * @param {Object} data - Object with column: value pairs
   * @returns {QueryBuilder} this for chaining
   */
  setMany(data) {
    if (this._type !== 'update') {
      throw new Error('setMany() can only be used with UPDATE');
    }
    for (const [column, value] of Object.entries(data)) {
      validateColumn(column);
      this._sets.push({ column, value });
    }
    return this;
  }

  /**
   * Start a DELETE query.
   * @param {string} table - Table to delete from
   * @returns {QueryBuilder} this for chaining
   */
  delete(table) {
    if (this._type) throw new Error('Query type already set');
    this._type = 'delete';
    validateTable(table);
    this._table = table;
    return this;
  }

  /**
   * Add a WHERE clause.
   * @param {string} condition - SQL condition with ? placeholders
   * @param {any[]} params - Parameter values
   * @returns {QueryBuilder} this for chaining
   */
  where(condition, params = []) {
    this._wheres.push({ condition, params, connector: 'AND' });
    return this;
  }

  /**
   * Add an AND WHERE clause.
   * @param {string} condition - SQL condition with ? placeholders
   * @param {any[]} params - Parameter values
   * @returns {QueryBuilder} this for chaining
   */
  andWhere(condition, params = []) {
    return this.where(condition, params);
  }

  /**
   * Add an OR WHERE clause.
   * @param {string} condition - SQL condition with ? placeholders
   * @param {any[]} params - Parameter values
   * @returns {QueryBuilder} this for chaining
   */
  orWhere(condition, params = []) {
    this._wheres.push({ condition, params, connector: 'OR' });
    return this;
  }

  /**
   * Add an ORDER BY clause.
   * @param {string} column - Column to order by
   * @param {string} direction - 'ASC' or 'DESC' (default: 'ASC')
   * @returns {QueryBuilder} this for chaining
   */
  orderBy(column, direction = 'ASC') {
    validateColumn(column);
    validateDirection(direction);
    this._orderBy.push({ column, direction: direction.toUpperCase() });
    return this;
  }

  /**
   * Add a LIMIT clause.
   * @param {number} n - Maximum rows to return
   * @returns {QueryBuilder} this for chaining
   */
  limit(n) {
    if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
      throw new Error('LIMIT must be a non-negative integer');
    }
    this._limit = n;
    return this;
  }

  /**
   * Add an OFFSET clause.
   * @param {number} n - Number of rows to skip
   * @returns {QueryBuilder} this for chaining
   */
  offset(n) {
    if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
      throw new Error('OFFSET must be a non-negative integer');
    }
    this._offset = n;
    return this;
  }

  /**
   * Build the final SQL query and parameters.
   * @returns {{ sql: string, params: any[] }} The query and parameters
   */
  build() {
    if (!this._type) {
      throw new Error('Query type not set. Use select(), insert(), update(), or delete()');
    }
    if (!this._table) {
      throw new Error(
        'Table not specified. Use from() for SELECT or specify table in insert/update/delete()'
      );
    }

    let sql = '';
    const params = [];

    switch (this._type) {
      case 'select':
        sql = this._buildSelect(params);
        break;
      case 'insert':
        sql = this._buildInsert(params);
        break;
      case 'update':
        sql = this._buildUpdate(params);
        break;
      case 'delete':
        sql = this._buildDelete(params);
        break;
    }

    return { sql, params };
  }

  _buildSelect(params) {
    let sql = `SELECT ${this._columns.join(', ')} FROM ${this._table}`;
    sql += this._buildWhere(params);
    sql += this._buildOrderBy();
    sql += this._buildLimitOffset();
    return sql;
  }

  _buildInsert(params) {
    const columns = this._columns.length > 0 ? ` (${this._columns.join(', ')})` : '';
    const placeholders = this._values.map(() => '?').join(', ');
    params.push(...this._values);
    return `INSERT INTO ${this._table}${columns} VALUES (${placeholders})`;
  }

  _buildUpdate(params) {
    if (this._sets.length === 0) {
      throw new Error('UPDATE requires at least one SET clause');
    }
    const setClauses = this._sets.map(({ column }) => `${column} = ?`).join(', ');
    params.push(...this._sets.map(({ value }) => value));

    let sql = `UPDATE ${this._table} SET ${setClauses}`;
    sql += this._buildWhere(params);
    return sql;
  }

  _buildDelete(params) {
    let sql = `DELETE FROM ${this._table}`;
    sql += this._buildWhere(params);
    return sql;
  }

  _buildWhere(params) {
    if (this._wheres.length === 0) return '';

    const clauses = this._wheres.map((w, i) => {
      params.push(...w.params);
      if (i === 0) return w.condition;
      return `${w.connector} ${w.condition}`;
    });

    return ` WHERE ${clauses.join(' ')}`;
  }

  _buildOrderBy() {
    if (this._orderBy.length === 0) return '';
    const clauses = this._orderBy.map((o) => `${o.column} ${o.direction}`);
    return ` ORDER BY ${clauses.join(', ')}`;
  }

  _buildLimitOffset() {
    let sql = '';
    if (this._limit !== null) {
      sql += ` LIMIT ${this._limit}`;
    }
    if (this._offset !== null) {
      sql += ` OFFSET ${this._offset}`;
    }
    return sql;
  }
}

/**
 * Create a new QueryBuilder instance.
 * @returns {QueryBuilder} A new query builder
 */
export function query() {
  return new QueryBuilder();
}

/**
 * Execute a query using the provided database.
 * @param {Object} db - sql.js database instance
 * @param {QueryBuilder|Object} queryOrBuilder - QueryBuilder instance or { sql, params } object
 * @returns {any[]} Query results
 */
export function executeQuery(db, queryOrBuilder) {
  const { sql, params } =
    queryOrBuilder instanceof QueryBuilder ? queryOrBuilder.build() : queryOrBuilder;

  return db.exec(sql, params);
}

/**
 * Run a statement (INSERT/UPDATE/DELETE) using the provided database.
 * @param {Object} db - sql.js database instance
 * @param {QueryBuilder|Object} queryOrBuilder - QueryBuilder instance or { sql, params } object
 */
export function runStatement(db, queryOrBuilder) {
  const { sql, params } =
    queryOrBuilder instanceof QueryBuilder ? queryOrBuilder.build() : queryOrBuilder;

  db.run(sql, params);
}

// Export the table allowlist for testing and admin functions
export { ALLOWED_TABLES };
