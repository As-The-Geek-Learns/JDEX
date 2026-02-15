/**
 * Database Lifecycle Management
 * ===============================
 * Handles database initialization, persistence, and state management.
 * This module manages the sql.js database instance and localStorage persistence.
 */

import initSqlJs from 'sql.js';
import { STORAGE_KEY } from '../schema/constants.js';
import { initializeSchema } from '../schema/tables.js';
import { runMigrations } from '../schema/migrations.js';
import { seedInitialData } from '../schema/seeds.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * sql.js prepared statement interface
 */
export interface SqlJsStatement {
  bind(params?: unknown[]): boolean;
  step(): boolean;
  get(): unknown[];
  getColumnNames(): string[];
  run(params?: unknown[]): void;
  free(): void;
  reset(): void;
}

/**
 * sql.js Database instance interface
 */
export interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): void;
  exec(sql: string, params?: unknown[]): SqlJsQueryResult[];
  prepare(sql: string): SqlJsStatement;
  export(): Uint8Array;
  close(): void;
}

/**
 * sql.js query result structure
 */
export interface SqlJsQueryResult {
  columns?: string[];
  values?: unknown[][];
}

/**
 * sql.js SQL module interface (constructor)
 */
export interface SqlJsModule {
  Database: new (data?: Uint8Array) => SqlJsDatabase;
}

/**
 * Database statistics
 */
export interface DatabaseStats {
  tables: number;
  size: number;
}

// ============================================
// MODULE STATE
// ============================================

/**
 * The sql.js database instance.
 */
let db: SqlJsDatabase | null = null;

/**
 * The sql.js SQL module (constructor).
 */
let SQL: SqlJsModule | null = null;

// ============================================
// DATABASE ACCESSORS
// ============================================

/**
 * Get the current database instance.
 */
export function getDB(): SqlJsDatabase | null {
  return db;
}

/**
 * Set the database instance.
 * Primarily used for testing or manual database injection.
 */
export function setDB(database: SqlJsDatabase | null): void {
  db = database;
}

/**
 * Get the SQL.js module.
 */
export function getSQL(): SqlJsModule | null {
  return SQL;
}

/**
 * Set the SQL.js module.
 * Primarily used for testing.
 */
export function setSQL(sqlModule: SqlJsModule | null): void {
  SQL = sqlModule;
}

/**
 * Check if the database is initialized.
 */
export function isInitialized(): boolean {
  return db !== null;
}

// ============================================
// PERSISTENCE
// ============================================

/**
 * Save the database to localStorage.
 * Serializes the database to a JSON array of bytes.
 */
export function saveDatabase(): void {
  if (!db) {
    console.warn('[JDex DB] Cannot save: database not initialized');
    return;
  }

  try {
    const data = db.export();
    const arr = Array.from(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (error) {
    console.error('[JDex DB] Failed to save database:', error);
    throw error;
  }
}

/**
 * Load database from localStorage.
 */
export function loadFromStorage(): Uint8Array | null {
  try {
    const savedDb = localStorage.getItem(STORAGE_KEY);
    if (savedDb) {
      return new Uint8Array(JSON.parse(savedDb));
    }
  } catch (error) {
    console.error('[JDex DB] Failed to load from storage:', error);
  }
  return null;
}

/**
 * Clear database from localStorage.
 */
export function clearStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Load sql.js from bundled package.
 * Uses the WASM file from the public folder.
 */
async function loadSqlJs(): Promise<SqlJsModule> {
  if (SQL) {
    return SQL;
  }

  // Determine the base path for the WASM file
  // In production/Electron, files are relative to the HTML file
  // In development, Vite serves from public/
  const wasmPath = import.meta.env.MODE === 'development' ? '/sql-wasm.wasm' : './sql-wasm.wasm';

  SQL = (await initSqlJs({
    locateFile: () => wasmPath,
  })) as unknown as SqlJsModule;

  return SQL;
}

/**
 * Initialize the database.
 * Loads sql.js, restores from localStorage if available, or creates new database.
 */
export async function initDatabase(): Promise<SqlJsDatabase> {
  // Return existing database if already initialized
  if (db) {
    return db;
  }

  // Load sql.js
  await loadSqlJs();

  // Try to load existing database from localStorage
  const savedData = loadFromStorage();

  if (savedData) {
    // Restore existing database
    db = new SQL!.Database(savedData);
    // Run any pending migrations
    runMigrations(db, saveDatabase);
  } else {
    // Create new database
    db = new SQL!.Database();
    // Initialize schema (tables, indexes, version)
    initializeSchema(db);
    // Seed initial data
    seedInitialData(db);
    // Save to localStorage
    saveDatabase();
  }

  return db;
}

/**
 * Reset the database to initial state.
 * Drops all data and re-initializes with seed data.
 */
export function resetDatabase(): SqlJsDatabase {
  if (!SQL) {
    throw new Error('SQL.js not loaded. Call initDatabase first.');
  }

  // Close existing database
  if (db) {
    db.close();
  }

  // Clear localStorage
  clearStorage();

  // Create fresh database
  db = new SQL.Database();
  initializeSchema(db);
  seedInitialData(db);
  saveDatabase();

  console.log('[JDex DB] Database reset to initial state');

  return db;
}

/**
 * Close the database connection.
 * Saves before closing.
 */
export function closeDatabase(): void {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get database statistics.
 */
export function getDatabaseStats(): DatabaseStats | null {
  if (!db) {
    return null;
  }

  try {
    // Count tables
    const tablesResult = db.exec(
      "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    const tableCount = (tablesResult[0]?.values?.[0]?.[0] as number) || 0;

    // Get approximate size from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    const size = saved ? saved.length : 0;

    return {
      tables: tableCount,
      size,
    };
  } catch (error) {
    console.error('[JDex DB] Failed to get stats:', error);
    return null;
  }
}

/**
 * Execute raw SQL and return results.
 * Use with caution - prefer specific query functions.
 */
export function executeSQL(sql: string): SqlJsQueryResult[] {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db.exec(sql);
}

/**
 * Get list of all tables in the database.
 */
export function getTables(): string[] {
  if (!db) {
    return [];
  }

  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  return result[0]?.values?.map((row) => row[0] as string) || [];
}
