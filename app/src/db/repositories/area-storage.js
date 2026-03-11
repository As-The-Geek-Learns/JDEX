/**
 * Area Storage Repository
 * =======================
 * CRUD operations for area-to-cloud-drive mappings (Premium Feature).
 * Uses parameterized queries for security.
 */

import { getDB, saveDatabase, validatePositiveInteger } from './utils.js';
import { logActivity } from './activity-log.js';
import { getDefaultCloudDrive } from './cloud-drives.js';
import { validateRequiredString, validateOptionalString } from '../../utils/validation.js';
import { DatabaseError } from '../../utils/errors.js';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map a database row to a cloud drive object.
 * @param {Array} row - Database row from cloud_drives table
 * @returns {Object} Cloud drive object
 */
function mapRowToCloudDrive(row) {
  return {
    id: row[0],
    name: row[1],
    base_path: row[2],
    jd_root_path: row[3],
    is_default: row[4] === 1,
    is_active: row[5] === 1,
    drive_type: row[6],
    created_at: row[7],
    updated_at: row[8],
  };
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all area-to-drive mappings with area and drive details.
 * @returns {Array} Array of mapping objects with joined data
 */
export function getAreaStorageMappings() {
  const db = getDB();
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
    results[0]?.values.map((row) => ({
      area_id: row[0],
      cloud_drive_id: row[1],
      notes: row[2],
      created_at: row[3],
      updated_at: row[4],
      area_name: row[5],
      range_start: row[6],
      range_end: row[7],
      area_color: row[8],
      drive_name: row[9],
      base_path: row[10],
      jd_root_path: row[11],
      drive_type: row[12],
    })) || []
  );
}

/**
 * Get the cloud drive assigned to a specific area.
 * Falls back to the default drive if no specific mapping exists.
 *
 * @param {number} areaId - The area ID
 * @returns {Object|null} The cloud drive for this area, or default, or null
 */
export function getAreaCloudDrive(areaId) {
  const db = getDB();
  const id = validatePositiveInteger(areaId, 'Area ID');

  // First, try to find specific mapping for this area using parameterized query
  const stmt = db.prepare(`
    SELECT cd.*
    FROM area_storage ast
    JOIN cloud_drives cd ON ast.cloud_drive_id = cd.id
    WHERE ast.area_id = ? AND cd.is_active = 1
  `);
  stmt.bind([id]);

  let result = null;
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
 *
 * @returns {Array} Array of unmapped areas
 */
export function getUnmappedAreas() {
  const db = getDB();
  const query = `
    SELECT a.*
    FROM areas a
    LEFT JOIN area_storage ast ON a.id = ast.area_id
    WHERE ast.area_id IS NULL
    ORDER BY a.range_start
  `;

  const results = db.exec(query);
  return (
    results[0]?.values.map((row) => ({
      id: row[0],
      range_start: row[1],
      range_end: row[2],
      name: row[3],
      description: row[4],
      color: row[5],
      created_at: row[6],
    })) || []
  );
}

/**
 * Get the mapping count.
 * @returns {number} Number of area storage mappings
 */
export function getAreaStorageMappingCount() {
  const db = getDB();
  const results = db.exec('SELECT COUNT(*) FROM area_storage');
  return results[0]?.values[0]?.[0] || 0;
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Set the cloud drive for a specific area.
 * Creates or updates the mapping.
 *
 * @param {number} areaId - The area ID
 * @param {string|null} cloudDriveId - The cloud drive ID, or null to remove mapping
 * @param {string} [notes] - Optional notes about this mapping
 */
export function setAreaCloudDrive(areaId, cloudDriveId, notes = null) {
  const db = getDB();
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
 *
 * @param {string} cloudDriveId - The cloud drive ID
 * @returns {number} Number of mappings removed
 */
export function removeAreaMappingsForDrive(cloudDriveId) {
  const db = getDB();
  const driveId = validateRequiredString(cloudDriveId, 'Drive ID', 50);

  // Get count before deletion
  const countStmt = db.prepare('SELECT COUNT(*) FROM area_storage WHERE cloud_drive_id = ?');
  countStmt.bind([driveId]);
  countStmt.step();
  const count = countStmt.get()[0];
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
