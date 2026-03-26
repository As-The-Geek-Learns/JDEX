/**
 * Statistics Repository
 * =====================
 * Database statistics and metrics.
 */

import { requireDB } from './utils.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Overall database statistics.
 */
export interface DatabaseStats {
  totalFolders: number;
  totalItems: number;
  totalCategories: number;
  sensitiveFolders: number;
  workFolders: number;
  standardFolders: number;
  inheritItems: number;
  sensitiveItems: number;
  workItems: number;
  standardItems: number;
}

/**
 * Area with category count.
 */
export interface AreaWithCount {
  id: number;
  name: string;
  category_count: number;
}

/**
 * Area statistics.
 */
export interface AreaStats {
  totalAreas: number;
  areasWithCounts: AreaWithCount[];
}

/**
 * Category with folder count.
 */
export interface CategoryWithCount {
  id: number;
  number: number;
  name: string;
  folder_count: number;
}

/**
 * Category statistics.
 */
export interface CategoryStats {
  totalCategories: number;
  topCategories: CategoryWithCount[];
}

/**
 * Folder with item count.
 */
export interface FolderWithCount {
  id: number;
  folder_number: string;
  name: string;
  item_count: number;
}

/**
 * Folder statistics.
 */
export interface FolderStats {
  totalFolders: number;
  topFolders: FolderWithCount[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get a count from a query result.
 */
function getCount(results: { values?: unknown[][] }[]): number {
  const value = results[0]?.values?.[0]?.[0];
  return typeof value === 'number' ? value : 0;
}

// ============================================
// STATISTICS FUNCTIONS
// ============================================

/**
 * Get overall database statistics.
 */
export function getStats(): DatabaseStats {
  const db = requireDB();

  const totalFolders = getCount(db.exec('SELECT COUNT(*) FROM folders'));
  const totalItems = getCount(db.exec('SELECT COUNT(*) FROM items'));
  const totalCategories = getCount(db.exec('SELECT COUNT(*) FROM categories'));

  // Folder stats by sensitivity
  const sensitiveFolders = getCount(
    db.exec("SELECT COUNT(*) FROM folders WHERE sensitivity = 'sensitive'")
  );
  const workFolders = getCount(db.exec("SELECT COUNT(*) FROM folders WHERE sensitivity = 'work'"));

  // Item stats - need to compute effective sensitivity
  const inheritItems = getCount(
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'inherit'")
  );
  const sensitiveItems = getCount(
    db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'sensitive'")
  );
  const workItems = getCount(db.exec("SELECT COUNT(*) FROM items WHERE sensitivity = 'work'"));

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
 */
export function getAreaStats(): AreaStats {
  const db = requireDB();

  const totalAreas = getCount(db.exec('SELECT COUNT(*) FROM areas'));

  // Categories per area
  const categoryResults = db.exec(`
    SELECT a.id, a.name, COUNT(c.id) as category_count
    FROM areas a
    LEFT JOIN categories c ON a.id = c.area_id
    GROUP BY a.id
    ORDER BY a.range_start
  `);

  const areasWithCounts: AreaWithCount[] =
    categoryResults[0]?.values?.map((row) => ({
      id: row[0] as number,
      name: row[1] as string,
      category_count: row[2] as number,
    })) || [];

  return {
    totalAreas,
    areasWithCounts,
  };
}

/**
 * Get category statistics.
 */
export function getCategoryStats(): CategoryStats {
  const db = requireDB();

  const totalCategories = getCount(db.exec('SELECT COUNT(*) FROM categories'));

  // Folders per category
  const folderResults = db.exec(`
    SELECT c.id, c.number, c.name, COUNT(f.id) as folder_count
    FROM categories c
    LEFT JOIN folders f ON c.id = f.category_id
    GROUP BY c.id
    ORDER BY c.number
    LIMIT 20
  `);

  const categoriesWithCounts: CategoryWithCount[] =
    folderResults[0]?.values?.map((row) => ({
      id: row[0] as number,
      number: row[1] as number,
      name: row[2] as string,
      folder_count: row[3] as number,
    })) || [];

  return {
    totalCategories,
    topCategories: categoriesWithCounts,
  };
}

/**
 * Get folder statistics.
 */
export function getFolderStats(): FolderStats {
  const db = requireDB();

  const totalFolders = getCount(db.exec('SELECT COUNT(*) FROM folders'));

  // Items per folder (top 20)
  const itemResults = db.exec(`
    SELECT f.id, f.folder_number, f.name, COUNT(i.id) as item_count
    FROM folders f
    LEFT JOIN items i ON f.id = i.folder_id
    GROUP BY f.id
    ORDER BY item_count DESC
    LIMIT 20
  `);

  const foldersWithCounts: FolderWithCount[] =
    itemResults[0]?.values?.map((row) => ({
      id: row[0] as number,
      folder_number: row[1] as string,
      name: row[2] as string,
      item_count: row[3] as number,
    })) || [];

  return {
    totalFolders,
    topFolders: foldersWithCounts,
  };
}
