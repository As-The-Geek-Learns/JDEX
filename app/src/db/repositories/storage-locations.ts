/**
 * Storage Locations Repository
 * ============================
 * CRUD operations for storage locations (physical/cloud storage tracking).
 */

import {
  requireDB,
  saveDatabase,
  mapResults,
  validatePositiveInteger,
  buildUpdateQuery,
  getLastInsertId,
} from './utils.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Storage location record.
 */
export interface StorageLocation {
  id: number;
  name: string;
  type: string;
  path: string | null;
  is_encrypted: number;
  notes: string | null;
}

/**
 * Storage location type.
 */
export type StorageType = 'local' | 'cloud' | 'external' | 'email' | string;

/**
 * Input for creating a storage location.
 */
export interface CreateStorageLocationInput {
  name: string;
  type: StorageType;
  path?: string | null;
  is_encrypted?: boolean;
  notes?: string;
}

/**
 * Input for updating a storage location.
 */
export interface UpdateStorageLocationInput {
  name?: string;
  type?: StorageType;
  path?: string | null;
  is_encrypted?: boolean;
  notes?: string;
}

// ============================================
// COLUMN DEFINITIONS
// ============================================

const STORAGE_COLUMNS = ['id', 'name', 'type', 'path', 'is_encrypted', 'notes'] as const;

const UPDATABLE_COLUMNS = ['name', 'type', 'path', 'is_encrypted', 'notes'] as const;

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Get all storage locations.
 */
export function getStorageLocations(): StorageLocation[] {
  const db = requireDB();
  const results = db.exec(
    `SELECT ${STORAGE_COLUMNS.join(', ')} FROM storage_locations ORDER BY name`
  );
  return mapResults(results, STORAGE_COLUMNS) as StorageLocation[];
}

/**
 * Get a single storage location by ID.
 */
export function getStorageLocation(id: number | string): StorageLocation | null {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();
  const results = db.exec(
    `SELECT ${STORAGE_COLUMNS.join(', ')} FROM storage_locations WHERE id = ?`,
    [validId]
  );
  const mapped = mapResults(results, STORAGE_COLUMNS) as StorageLocation[];
  return mapped[0] || null;
}

/**
 * Create a new storage location.
 */
export function createStorageLocation(location: CreateStorageLocationInput): number {
  const db = requireDB();
  db.run(
    'INSERT INTO storage_locations (name, type, path, is_encrypted, notes) VALUES (?, ?, ?, ?, ?)',
    [
      location.name,
      location.type,
      location.path || null,
      location.is_encrypted ? 1 : 0,
      location.notes || '',
    ]
  );
  saveDatabase();
  return getLastInsertId();
}

/**
 * Update a storage location.
 */
export function updateStorageLocation(
  id: number | string,
  updates: UpdateStorageLocationInput
): boolean {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();

  const query = buildUpdateQuery('storage_locations', updates, UPDATABLE_COLUMNS, {
    transformers: {
      is_encrypted: (v) => (v ? 1 : 0),
    },
  });

  if (!query) return false;

  db.run(query.sql, [...query.values, validId]);
  saveDatabase();
  return true;
}

/**
 * Delete a storage location.
 */
export function deleteStorageLocation(id: number | string): void {
  const validId = validatePositiveInteger(id, 'id');
  const db = requireDB();
  db.run('DELETE FROM storage_locations WHERE id = ?', [validId]);
  saveDatabase();
}

/**
 * Get storage location count.
 */
export function getStorageLocationCount(): number {
  const db = requireDB();
  const results = db.exec('SELECT COUNT(*) FROM storage_locations');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}
