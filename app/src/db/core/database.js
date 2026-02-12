/**
 * Database Lifecycle Management
 * ===============================
 * Handles database initialization, persistence, and state management.
 * This module manages the sql.js database instance and localStorage persistence.
 */

import { STORAGE_KEY } from '../schema/constants.js';
import { initializeSchema } from '../schema/tables.js';
import { runMigrations } from '../schema/migrations.js';
import { seedInitialData } from '../schema/seeds.js';

// ============================================
// MODULE STATE
// ============================================

/**
 * The sql.js database instance.
 * @type {Object|null}
 */
let db = null;

/**
 * The sql.js SQL module (constructor).
 * @type {Object|null}
 */
let SQL = null;

// ============================================
// DATABASE ACCESSORS
// ============================================

/**
 * Get the current database instance.
 * @returns {Object|null} The sql.js database instance or null if not initialized
 */
export function getDB() {
  return db;
}

/**
 * Set the database instance.
 * Primarily used for testing or manual database injection.
 * @param {Object|null} database - The sql.js database instance
 */
export function setDB(database) {
  db = database;
}

/**
 * Get the SQL.js module.
 * @returns {Object|null} The sql.js SQL module or null if not loaded
 */
export function getSQL() {
  return SQL;
}

/**
 * Set the SQL.js module.
 * Primarily used for testing.
 * @param {Object|null} sqlModule - The sql.js SQL module
 */
export function setSQL(sqlModule) {
  SQL = sqlModule;
}

/**
 * Check if the database is initialized.
 * @returns {boolean} True if database is ready
 */
export function isInitialized() {
  return db !== null;
}

// ============================================
// PERSISTENCE
// ============================================

/**
 * Save the database to localStorage.
 * Serializes the database to a JSON array of bytes.
 */
export function saveDatabase() {
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
 * @returns {Uint8Array|null} The database bytes or null if not found
 */
export function loadFromStorage() {
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
export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Load sql.js from CDN if not already loaded.
 * @returns {Promise<Object>} The sql.js SQL module
 */
async function loadSqlJs() {
  if (SQL) {
    return SQL;
  }

  // Load sql.js script from CDN if not present
  if (!window.initSqlJs) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sql.js.org/dist/sql-wasm.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  SQL = await window.initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  return SQL;
}

/**
 * Initialize the database.
 * Loads sql.js, restores from localStorage if available, or creates new database.
 * @returns {Promise<Object>} The initialized database instance
 */
export async function initDatabase() {
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
    db = new SQL.Database(savedData);
    // Run any pending migrations
    runMigrations(db, saveDatabase);
  } else {
    // Create new database
    db = new SQL.Database();
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
 * @returns {Object} The fresh database instance
 */
export function resetDatabase() {
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
export function closeDatabase() {
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
 * @returns {{ tables: number, size: number }|null} Stats or null if not initialized
 */
export function getDatabaseStats() {
  if (!db) {
    return null;
  }

  try {
    // Count tables
    const tablesResult = db.exec(
      "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    const tableCount = tablesResult[0]?.values[0]?.[0] || 0;

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
 * @param {string} sql - SQL statement to execute
 * @returns {Array} Query results
 */
export function executeSQL(sql) {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db.exec(sql);
}

/**
 * Get list of all tables in the database.
 * @returns {string[]} Array of table names
 */
export function getTables() {
  if (!db) {
    return [];
  }

  const result = db.exec(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );

  return result[0]?.values.map((row) => row[0]) || [];
}
