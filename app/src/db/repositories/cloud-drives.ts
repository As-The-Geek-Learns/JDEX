/**
 * Cloud Drives Repository
 * =======================
 * CRUD operations for cloud drive configurations (Premium Feature).
 * Uses parameterized queries for security.
 */

import { requireDB, saveDatabase } from './utils.js';
import { logActivity } from './activity-log.js';
import { validateRequiredString, validateOptionalString } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Valid drive types.
 */
export type DriveType = 'icloud' | 'dropbox' | 'onedrive' | 'google' | 'proton' | 'generic';

/**
 * Cloud drive record.
 */
export interface CloudDrive {
  id: string;
  name: string;
  base_path: string;
  jd_root_path: string | null;
  is_default: boolean;
  is_active: boolean;
  drive_type: DriveType;
  created_at: string;
  updated_at: string;
}

/**
 * Input for creating a cloud drive.
 */
export interface CreateCloudDriveInput {
  id: string;
  name: string;
  base_path: string;
  jd_root_path?: string | null;
  is_default?: boolean;
  drive_type?: DriveType;
}

/**
 * Input for updating a cloud drive.
 */
export interface UpdateCloudDriveInput {
  name?: string;
  base_path?: string;
  jd_root_path?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  drive_type?: DriveType;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Valid drive types for cloud_drives.drive_type column.
 */
export const VALID_DRIVE_TYPES: readonly DriveType[] = [
  'icloud',
  'dropbox',
  'onedrive',
  'google',
  'proton',
  'generic',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to a cloud drive object.
 */
function mapRowToCloudDrive(row: unknown[]): CloudDrive {
  return {
    id: row[0] as string,
    name: row[1] as string,
    base_path: row[2] as string,
    jd_root_path: row[3] as string | null,
    is_default: row[4] === 1,
    is_active: row[5] === 1,
    drive_type: row[6] as DriveType,
    created_at: row[7] as string,
    updated_at: row[8] as string,
  };
}

/**
 * Validate drive type, defaulting to 'generic' if invalid.
 */
function validateDriveType(driveType: unknown): DriveType {
  return driveType && VALID_DRIVE_TYPES.includes(driveType as DriveType)
    ? (driveType as DriveType)
    : 'generic';
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all configured cloud drives.
 */
export function getCloudDrives(): CloudDrive[] {
  const db = requireDB();
  const results = db.exec(
    'SELECT * FROM cloud_drives WHERE is_active = 1 ORDER BY is_default DESC, name ASC'
  );
  return results[0]?.values?.map(mapRowToCloudDrive) || [];
}

/**
 * Get a single cloud drive by ID.
 */
export function getCloudDrive(driveId: string): CloudDrive | null {
  const db = requireDB();
  const id = validateRequiredString(driveId, 'Drive ID', 50);

  const stmt = db.prepare('SELECT * FROM cloud_drives WHERE id = ?');
  stmt.bind([id]);

  let result: CloudDrive | null = null;
  if (stmt.step()) {
    result = mapRowToCloudDrive(stmt.get());
  }
  stmt.free();

  return result;
}

/**
 * Get the default cloud drive.
 */
export function getDefaultCloudDrive(): CloudDrive | null {
  const db = requireDB();
  const results = db.exec(
    'SELECT * FROM cloud_drives WHERE is_default = 1 AND is_active = 1 LIMIT 1'
  );

  if (!results[0]?.values?.[0]) return null;
  return mapRowToCloudDrive(results[0].values[0]);
}

/**
 * Get count of active cloud drives.
 */
export function getCloudDriveCount(): number {
  const db = requireDB();
  const results = db.exec('SELECT COUNT(*) FROM cloud_drives WHERE is_active = 1');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new cloud drive configuration.
 * Uses parameterized queries for security.
 */
export function createCloudDrive(drive: CreateCloudDriveInput): string {
  const db = requireDB();

  try {
    // Validate inputs
    const id = validateRequiredString(drive.id, 'Drive ID', 50);
    const name = validateRequiredString(drive.name, 'Name', 100);
    const basePath = validateRequiredString(drive.base_path, 'Base path', 500);
    const jdRootPath = validateOptionalString(drive.jd_root_path ?? null, 'JD root path', 500);
    const driveType = validateDriveType(drive.drive_type);

    // If this is set as default, unset any existing default
    if (drive.is_default) {
      db.run('UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1');
    }

    // Insert using parameterized query
    const stmt = db.prepare(`
      INSERT INTO cloud_drives (id, name, base_path, jd_root_path, is_default, is_active, drive_type)
      VALUES (?, ?, ?, ?, ?, 1, ?)
    `);

    stmt.run([id, name, basePath, jdRootPath, drive.is_default ? 1 : 0, driveType]);
    stmt.free();

    logActivity('create', 'cloud_drive', id, `Added cloud drive: ${name}`);
    saveDatabase();

    return id;
  } catch (error) {
    if ((error as Error).name === 'ValidationError') {
      throw error;
    }
    throw new DatabaseError(`Failed to create cloud drive: ${(error as Error).message}`, 'insert');
  }
}

/**
 * Update a cloud drive configuration.
 */
export function updateCloudDrive(driveId: string, updates: UpdateCloudDriveInput): void {
  const db = requireDB();

  try {
    const id = validateRequiredString(driveId, 'Drive ID', 50);

    const validColumns = [
      'name',
      'base_path',
      'jd_root_path',
      'is_default',
      'is_active',
      'drive_type',
    ];
    const fields: string[] = [];
    const values: unknown[] = [];

    // Handle is_default specially - unset others first
    if (updates.is_default === true) {
      db.run('UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1');
    }

    Object.entries(updates).forEach(([key, value]) => {
      if (validColumns.includes(key) && value !== undefined) {
        let processedValue: unknown = value;

        // Validate string fields
        if (key === 'name') {
          processedValue = validateRequiredString(value as string, 'Name', 100);
        } else if (key === 'base_path') {
          processedValue = validateRequiredString(value as string, 'Base path', 500);
        } else if (key === 'jd_root_path') {
          processedValue = validateOptionalString(value as string | null, 'JD root path', 500);
        } else if (key === 'drive_type') {
          processedValue = validateDriveType(value);
        } else if (key === 'is_default' || key === 'is_active') {
          processedValue = value ? 1 : 0;
        }

        fields.push(`${key} = ?`);
        values.push(processedValue);
      }
    });

    if (fields.length === 0) return;

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.run(`UPDATE cloud_drives SET ${fields.join(', ')} WHERE id = ?`, values);

    logActivity('update', 'cloud_drive', id, `Updated cloud drive: ${id}`);
    saveDatabase();
  } catch (error) {
    if ((error as Error).name === 'ValidationError') {
      throw error;
    }
    throw new DatabaseError(`Failed to update cloud drive: ${(error as Error).message}`, 'update');
  }
}

/**
 * Delete a cloud drive configuration.
 * Uses soft delete (sets is_active = 0) to preserve history.
 */
export function deleteCloudDrive(driveId: string): void {
  const db = requireDB();
  const id = validateRequiredString(driveId, 'Drive ID', 50);

  // Soft delete - just mark as inactive
  db.run('UPDATE cloud_drives SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    id,
  ]);

  logActivity('delete', 'cloud_drive', id, `Removed cloud drive: ${id}`);
  saveDatabase();
}

/**
 * Set a cloud drive as the default.
 */
export function setDefaultCloudDrive(driveId: string): void {
  const db = requireDB();
  const id = validateRequiredString(driveId, 'Drive ID', 50);

  // Unset current default
  db.run('UPDATE cloud_drives SET is_default = 0 WHERE is_default = 1');

  // Set new default
  db.run('UPDATE cloud_drives SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    id,
  ]);

  logActivity('update', 'cloud_drive', id, `Set as default cloud drive: ${id}`);
  saveDatabase();
}
