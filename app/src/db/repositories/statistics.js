/**
 * Statistics Repository
 * =====================
 * Database statistics and metrics.
 */

import { getDB } from './utils.js';

// ============================================
// STATISTICS
// ============================================

/**
 * Get overall database statistics.
 * @returns {Object} Statistics object
 */
export function getStats() {
  const db = getDB();

  const totalFolders = db.exec('SELECT COUNT(*) FROM folders')[0]?.values[0][0] || 0;
  const totalItems = db.exec('SELECT COUNT(*) FROM items')[0]?.values[0][0] || 0;
  const totalCategories = db.exec('SELECT COUNT(*) FROM categories')[0]?.values[0][0] || 0;

  // Folder stats by sensitivity
  const sensitiveFolders =
    db.exec("SELECT COUNT(*) FROM folders WHERE sensitivity = 'sensitive'")[0]?.values[0][0] || 0;
  const workFolders =
    db.exec("SELECT COUNT(*) FROM folders WHERE sensitivity = 'work'")[0]?.values[0][0] || 0;

  // Item stats - need to compute effective sensitivity
  const inheritItems =
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'inherit'")[0]?.values[0][0] || 0;
  const sensitiveItems =
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'sensitive'")[0]?.values[0][0] || 0;
  const workItems =
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'work'")[0]?.values[0][0] || 0;

  return {
    totalFolders,
    totalItems,
    totalCategories,
    sensitiveFolders,
    workFolders,
    standardFolders: totalFolders - sensitiveFolders - workFolders,
    inheritItems,
    sensitiveItems,
    workItems,
    standardItems: totalItems - inheritItems - sensitiveItems - workItems,
  };
}

/**
 * Get area statistics.
 * @returns {Object} Area statistics
 */
export function getAreaStats() {
  const db = getDB();

  const totalAreas = db.exec('SELECT COUNT(*) FROM areas')[0]?.values[0][0] || 0;

  // Categories per area
  const categoryResults = db.exec(`
    SELECT a.id, a.name, COUNT(c.id) as category_count
    FROM areas a
    LEFT JOIN categories c ON a.id = c.area_id
    GROUP BY a.id
    ORDER BY a.range_start
  `);

  const areasWithCounts =
    categoryResults[0]?.values.map((row) => ({
      id: row[0],
      name: row[1],
      category_count: row[2],
    })) || [];

  return {
    totalAreas,
    areasWithCounts,
  };
}

/**
 * Get category statistics.
 * @returns {Object} Category statistics
 */
export function getCategoryStats() {
  const db = getDB();

  const totalCategories = db.exec('SELECT COUNT(*) FROM categories')[0]?.values[0][0] || 0;

  // Folders per category
  const folderResults = db.exec(`
    SELECT c.id, c.number, c.name, COUNT(f.id) as folder_count
    FROM categories c
    LEFT JOIN folders f ON c.id = f.category_id
    GROUP BY c.id
    ORDER BY c.number
    LIMIT 20
  `);

  const categoriesWithCounts =
    folderResults[0]?.values.map((row) => ({
      id: row[0],
      number: row[1],
      name: row[2],
      folder_count: row[3],
    })) || [];

  return {
    totalCategories,
    topCategories: categoriesWithCounts,
  };
}

/**
 * Get folder statistics.
 * @returns {Object} Folder statistics
 */
export function getFolderStats() {
  const db = getDB();

  const totalFolders = db.exec('SELECT COUNT(*) FROM folders')[0]?.values[0][0] || 0;

  // Items per folder (top 20)
  const itemResults = db.exec(`
    SELECT f.id, f.folder_number, f.name, COUNT(i.id) as item_count
    FROM folders f
    LEFT JOIN items i ON f.id = i.folder_id
    GROUP BY f.id
    ORDER BY item_count DESC
    LIMIT 20
  `);

  const foldersWithCounts =
    itemResults[0]?.values.map((row) => ({
      id: row[0],
      folder_number: row[1],
      name: row[2],
      item_count: row[3],
    })) || [];

  return {
    totalFolders,
    topFolders: foldersWithCounts,
  };
}
