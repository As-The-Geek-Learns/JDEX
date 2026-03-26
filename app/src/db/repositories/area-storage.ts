/**
 * Area Storage Repository
 * =======================
 * CRUD operations for area-to-cloud-drive mappings (Premium Feature).
 * Uses parameterized queries for security.
 */

import { requireDB, saveDatabase, validatePositiveInteger } from './utils.js';
import { logActivity } from './activity-log.js';
import { getDefaultCloudDrive, CloudDrive, DriveType } from './cloud-drives.js';
import { validateRequiredString, validateOptionalString } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Area storage mapping with area and drive details.
 */
export interface AreaStorageMapping {
  area_id: number;
  cloud_drive_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  area_name: string;
  range_start: number;
  range_end: number;
  area_color: string;
  drive_name: string | null;
  base_path: string | null;
  jd_root_path: string | null;
  drive_type: DriveType | null;
}

/**
 * Unmapped area record.
 */
export interface UnmappedArea {
  id: number;
  range_start: number;
  range_end: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

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

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all area-to-drive mappings with area and drive details.
 */
export function getAreaStorageMappings(): AreaStorageMapping[] {
  const db = requireDB();
  const query = `
    SELECT
      ast.area_id,
      ast.cloud_drive_id,
      ast.notes,
      ast.created_at,
      ast.updated_at,
      a.name as area_name,
      a.range_start,
      a.range_end,
      a.color as area_color,
      cd.name as drive_name,
      cd.base_path,
      cd.jd_root_path,
      cd.drive_type
    FROM area_storage ast
    JOIN areas a ON ast.area_id = a.id
    LEFT JOIN cloud_drives cd ON ast.cloud_drive_id = cd.id AND cd.is_active = 1
    ORDER BY a.range_start
  `;

  const results = db.exec(query);
  return (
    results[0]?.values?.map((row) => ({
      area_id: row[0] as number,
      cloud_drive_id: row[1] as string | null,
      notes: row[2] as string | null,
      created_at: row[3] as string,
      updated_at: row[4] as string,
      area_name: row[5] as string,
      range_start: row[6] as number,
      range_end: row[7] as number,
      area_color: row[8] as string,
      drive_name: row[9] as string | null,
      base_path: row[10] as string | null,
      jd_root_path: row[11] as string | null,
      drive_type: row[12] as DriveType | null,
    })) || []
  );
}

/**
 * Get the cloud drive assigned to a specific area.
 * Falls back to the default drive if no specific mapping exists.
 */
export function getAreaCloudDrive(areaId: number | string): CloudDrive | null {
  const db = requireDB();
  const id = validatePositiveInteger(areaId, 'Area ID');

  // First, try to find specific mapping for this area using parameterized query
  const stmt = db.prepare(`
    SELECT cd.*
    FROM area_storage ast
    JOIN cloud_drives cd ON ast.cloud_drive_id = cd.id
    WHERE ast.area_id = ? AND cd.is_active = 1
  `);
  stmt.bind([id]);

  let result: CloudDrive | null = null;
  if (stmt.step()) {
    result = mapRowToCloudDrive(stmt.get());
  }
  stmt.free();

  if (result) {
    return result;
  }

  // Fall back to default drive
  return getDefaultCloudDrive();
}

/**
 * Get areas that don't have a specific cloud drive mapping.
 * These areas will use the default drive.
 */
export function getUnmappedAreas(): UnmappedArea[] {
  const db = requireDB();
  const query = `
    SELECT a.*
    FROM areas a
    LEFT JOIN area_storage ast ON a.id = ast.area_id
    WHERE ast.area_id IS NULL
    ORDER BY a.range_start
  `;

  const results = db.exec(query);
  return (
    results[0]?.values?.map((row) => ({
      id: row[0] as number,
      range_start: row[1] as number,
      range_end: row[2] as number,
      name: row[3] as string,
      description: row[4] as string | null,
      color: row[5] as string,
      created_at: row[6] as string,
    })) || []
  );
}

/**
 * Get the mapping count.
 */
export function getAreaStorageMappingCount(): number {
  const db = requireDB();
  const results = db.exec('SELECT COUNT(*) FROM area_storage');
  const count = results[0]?.values?.[0]?.[0];
  return typeof count === 'number' ? count : 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Set the cloud drive for a specific area.
 * Creates or updates the mapping.
 */
export function setAreaCloudDrive(
  areaId: number | string,
  cloudDriveId: string | null,
  notes: string | null = null
): void {
  const db = requireDB();
  const id = validatePositiveInteger(areaId, 'Area ID');
  const driveId = cloudDriveId ? validateRequiredString(cloudDriveId, 'Drive ID', 50) : null;
  const sanitizedNotes = validateOptionalString(notes, 'Notes', 500);

  // Verify area exists using parameterized query
  const areaStmt = db.prepare('SELECT id FROM areas WHERE id = ?');
  areaStmt.bind([id]);
  const areaExists = areaStmt.step();
  areaStmt.free();

  if (!areaExists) {
    throw new DatabaseError(`Area with ID ${id} not found`, 'query');
  }

  // Verify drive exists if provided using parameterized query
  if (driveId) {
    const driveStmt = db.prepare('SELECT id FROM cloud_drives WHERE id = ? AND is_active = 1');
    driveStmt.bind([driveId]);
    const driveExists = driveStmt.step();
    driveStmt.free();

    if (!driveExists) {
      throw new DatabaseError(`Cloud drive '${driveId}' not found or inactive`, 'query');
    }
  }

  // Use INSERT OR REPLACE (SQLite upsert)
  if (driveId) {
    db.run(
      `
      INSERT OR REPLACE INTO area_storage (area_id, cloud_drive_id, notes, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
      [id, driveId, sanitizedNotes]
    );

    logActivity('update', 'area_storage', `area-${id}`, `Mapped area ${id} to drive ${driveId}`);
  } else {
    // Remove mapping if driveId is null
    db.run('DELETE FROM area_storage WHERE area_id = ?', [id]);
    logActivity('delete', 'area_storage', `area-${id}`, `Removed drive mapping for area ${id}`);
  }

  saveDatabase();
}

/**
 * Remove all mappings for a specific cloud drive.
 * Used when deleting a cloud drive.
 */
export function removeAreaMappingsForDrive(cloudDriveId: string): number {
  const db = requireDB();
  const driveId = validateRequiredString(cloudDriveId, 'Drive ID', 50);

  // Get count before deletion
  const countStmt = db.prepare('SELECT COUNT(*) FROM area_storage WHERE cloud_drive_id = ?');
  countStmt.bind([driveId]);
  countStmt.step();
  const count = countStmt.get()[0] as number;
  countStmt.free();

  if (count > 0) {
    db.run('DELETE FROM area_storage WHERE cloud_drive_id = ?', [driveId]);
    logActivity(
      'delete',
      'area_storage',
      driveId,
      `Removed ${count} area mappings for drive ${driveId}`
    );
    saveDatabase();
  }

  return count;
}
