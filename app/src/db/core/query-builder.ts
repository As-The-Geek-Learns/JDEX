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

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Allowed query types
 */
export type QueryType = 'select' | 'insert' | 'update' | 'delete';

/**
 * Valid ORDER BY directions
 */
export type OrderDirection = 'ASC' | 'DESC' | 'asc' | 'desc';

/**
 * Allowed table names (prevents table name injection)
 */
export type AllowedTable =
  | 'areas'
  | 'categories'
  | 'folders'
  | 'items'
  | 'cloud_drives'
  | 'area_storage'
  | 'organization_rules'
  | 'organized_files'
  | 'scanned_files'
  | 'watched_folders'
  | 'watch_activity'
  | 'activity_log'
  | 'statistics'
  | 'schema_version';

/**
 * WHERE clause structure
 */
export interface WhereClause {
  condition: string;
  params: unknown[];
  connector: 'AND' | 'OR';
}

/**
 * SET clause structure for UPDATE
 */
export interface SetClause {
  column: string;
  value: unknown;
}

/**
 * ORDER BY clause structure
 */
export interface OrderByClause {
  column: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Result of building a query
 */
export interface QueryResult {
  sql: string;
  params: unknown[];
}

/**
 * Data object for setMany()
 */
export type SetManyData = Record<string, unknown>;

/**
 * sql.js database interface (minimal for query execution)
 */
export interface SqlJsDatabase {
  exec(sql: string, params?: unknown[]): unknown[];
  run(sql: string, params?: unknown[]): void;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Allowed table names - prevents table name injection
 */
export const ALLOWED_TABLES: ReadonlySet<string> = new Set([
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

/**
 * Valid column name pattern (alphanumeric, underscore, dot for table.column)
 */
const VALID_COLUMN_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

/**
 * Valid ORDER BY directions
 */
const VALID_DIRECTIONS: ReadonlySet<string> = new Set(['ASC', 'DESC', 'asc', 'desc']);

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate a table name against the allowlist.
 */
export function validateTable(table: string): void {
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
 */
export function validateColumn(column: string): void {
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
 */
export function validateDirection(direction: string): void {
  if (!VALID_DIRECTIONS.has(direction)) {
    throw new Error(`Invalid ORDER BY direction: ${direction}. Must be ASC or DESC`);
  }
}

// ============================================
// QUERY BUILDER CLASS
// ============================================

/**
 * QueryBuilder class for constructing parameterized SQL queries.
 */
export class QueryBuilder {
  private _type: QueryType | null = null;
  private _table: string | null = null;
  private _columns: string[] = [];
  private _values: unknown[] = [];
  private _sets: SetClause[] = [];
  private _wheres: WhereClause[] = [];
  private _orderBy: OrderByClause[] = [];
  private _limit: number | null = null;
  private _offset: number | null = null;

  /**
   * Start a SELECT query.
   */
  select(...columns: string[]): this {
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
   */
  from(table: string): this {
    validateTable(table);
    this._table = table;
    return this;
  }

  /**
   * Start an INSERT query.
   */
  insert(table: string, columns?: string[]): this {
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
   */
  values(values: unknown[]): this {
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
   */
  update(table: string): this {
    if (this._type) throw new Error('Query type already set');
    this._type = 'update';
    validateTable(table);
    this._table = table;
    return this;
  }

  /**
   * Add a SET clause for UPDATE.
   */
  set(column: string, value: unknown): this {
    if (this._type !== 'update') {
      throw new Error('set() can only be used with UPDATE');
    }
    validateColumn(column);
    this._sets.push({ column, value });
    return this;
  }

  /**
   * Add multiple SET clauses from an object.
   */
  setMany(data: SetManyData): this {
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
   */
  delete(table: string): this {
    if (this._type) throw new Error('Query type already set');
    this._type = 'delete';
    validateTable(table);
    this._table = table;
    return this;
  }

  /**
   * Add a WHERE clause.
   */
  where(condition: string, params: unknown[] = []): this {
    this._wheres.push({ condition, params, connector: 'AND' });
    return this;
  }

  /**
   * Add an AND WHERE clause.
   */
  andWhere(condition: string, params: unknown[] = []): this {
    return this.where(condition, params);
  }

  /**
   * Add an OR WHERE clause.
   */
  orWhere(condition: string, params: unknown[] = []): this {
    this._wheres.push({ condition, params, connector: 'OR' });
    return this;
  }

  /**
   * Add an ORDER BY clause.
   */
  orderBy(column: string, direction: OrderDirection = 'ASC'): this {
    validateColumn(column);
    validateDirection(direction);
    this._orderBy.push({ column, direction: direction.toUpperCase() as 'ASC' | 'DESC' });
    return this;
  }

  /**
   * Add a LIMIT clause.
   */
  limit(n: number): this {
    if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
      throw new Error('LIMIT must be a non-negative integer');
    }
    this._limit = n;
    return this;
  }

  /**
   * Add an OFFSET clause.
   */
  offset(n: number): this {
    if (typeof n !== 'number' || n < 0 || !Number.isInteger(n)) {
      throw new Error('OFFSET must be a non-negative integer');
    }
    this._offset = n;
    return this;
  }

  /**
   * Build the final SQL query and parameters.
   */
  build(): QueryResult {
    if (!this._type) {
      throw new Error('Query type not set. Use select(), insert(), update(), or delete()');
    }
    if (!this._table) {
      throw new Error(
        'Table not specified. Use from() for SELECT or specify table in insert/update/delete()'
      );
    }

    let sql = '';
    const params: unknown[] = [];

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

  private _buildSelect(params: unknown[]): string {
    let sql = `SELECT ${this._columns.join(', ')} FROM ${this._table}`;
    sql += this._buildWhere(params);
    sql += this._buildOrderBy();
    sql += this._buildLimitOffset();
    return sql;
  }

  private _buildInsert(params: unknown[]): string {
    const columns = this._columns.length > 0 ? ` (${this._columns.join(', ')})` : '';
    const placeholders = this._values.map(() => '?').join(', ');
    params.push(...this._values);
    return `INSERT INTO ${this._table}${columns} VALUES (${placeholders})`;
  }

  private _buildUpdate(params: unknown[]): string {
    if (this._sets.length === 0) {
      throw new Error('UPDATE requires at least one SET clause');
    }
    const setClauses = this._sets.map(({ column }) => `${column} = ?`).join(', ');
    params.push(...this._sets.map(({ value }) => value));

    let sql = `UPDATE ${this._table} SET ${setClauses}`;
    sql += this._buildWhere(params);
    return sql;
  }

  private _buildDelete(params: unknown[]): string {
    let sql = `DELETE FROM ${this._table}`;
    sql += this._buildWhere(params);
    return sql;
  }

  private _buildWhere(params: unknown[]): string {
    if (this._wheres.length === 0) return '';

    const clauses = this._wheres.map((w, i) => {
      params.push(...w.params);
      if (i === 0) return w.condition;
      return `${w.connector} ${w.condition}`;
    });

    return ` WHERE ${clauses.join(' ')}`;
  }

  private _buildOrderBy(): string {
    if (this._orderBy.length === 0) return '';
    const clauses = this._orderBy.map((o) => `${o.column} ${o.direction}`);
    return ` ORDER BY ${clauses.join(', ')}`;
  }

  private _buildLimitOffset(): string {
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

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a new QueryBuilder instance.
 */
export function query(): QueryBuilder {
  return new QueryBuilder();
}

/**
 * Execute a query using the provided database.
 */
export function executeQuery(
  db: SqlJsDatabase,
  queryOrBuilder: QueryBuilder | QueryResult
): unknown[] {
  const { sql, params } =
    queryOrBuilder instanceof QueryBuilder ? queryOrBuilder.build() : queryOrBuilder;

  return db.exec(sql, params);
}

/**
 * Run a statement (INSERT/UPDATE/DELETE) using the provided database.
 */
export function runStatement(db: SqlJsDatabase, queryOrBuilder: QueryBuilder | QueryResult): void {
  const { sql, params } =
    queryOrBuilder instanceof QueryBuilder ? queryOrBuilder.build() : queryOrBuilder;

  db.run(sql, params);
}
