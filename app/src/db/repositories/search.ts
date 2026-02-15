/**
 * Search Repository
 * ==================
 * Search operations across folders and items.
 */

import { requireDB, mapResults, RowObject } from './utils.js';
import { sanitizeText } from '../../utils/validation.js';

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * Folder search result.
 */
export interface FolderSearchResult {
  id: number;
  folder_number: string;
  category_id: number;
  sequence: number;
  name: string;
  description: string | null;
  sensitivity: string;
  location: string | null;
  storage_path: string | null;
  keywords: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category_number: number;
  category_name: string;
  area_name: string;
  area_color: string;
}

/**
 * Item search result.
 */
export interface ItemSearchResult {
  id: number;
  item_number: string;
  folder_id: number;
  sequence: number;
  name: string;
  description: string | null;
  file_type: string | null;
  sensitivity: string;
  location: string | null;
  storage_path: string | null;
  file_size: number | null;
  keywords: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  folder_number: string;
  folder_name: string;
  folder_sensitivity: string;
  category_number: number;
  category_name: string;
  area_name: string;
  area_color: string;
  effective_sensitivity: string;
}

/**
 * Combined search results.
 */
export interface SearchResults {
  folders: FolderSearchResult[];
  items: ItemSearchResult[];
}

// ============================================
// COLUMN DEFINITIONS
// ============================================

const FOLDER_COLUMNS = [
  'id',
  'folder_number',
  'category_id',
  'sequence',
  'name',
  'description',
  'sensitivity',
  'location',
  'storage_path',
  'keywords',
  'notes',
  'created_at',
  'updated_at',
  'category_number',
  'category_name',
  'area_name',
  'area_color',
] as const;

const ITEM_COLUMNS = [
  'id',
  'item_number',
  'folder_id',
  'sequence',
  'name',
  'description',
  'file_type',
  'sensitivity',
  'location',
  'storage_path',
  'file_size',
  'keywords',
  'notes',
  'created_at',
  'updated_at',
  'folder_number',
  'folder_name',
  'folder_sensitivity',
  'category_number',
  'category_name',
  'area_name',
  'area_color',
] as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Add effective sensitivity to item.
 */
function addEffectiveSensitivity(item: RowObject): ItemSearchResult {
  const sensitivity = item.sensitivity as string;
  const folderSensitivity = item.folder_sensitivity as string;

  return {
    ...(item as unknown as Omit<ItemSearchResult, 'effective_sensitivity'>),
    effective_sensitivity: sensitivity === 'inherit' ? folderSensitivity : sensitivity,
  };
}

// ============================================
// SEARCH FUNCTIONS
// ============================================

/**
 * Search folders by text query.
 * Searches folder_number, name, description, keywords, notes, category name, and area name.
 */
export function searchFolders(query: string): FolderSearchResult[] {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const db = requireDB();
  const sanitized = sanitizeText(query);
  const searchPattern = `%${sanitized}%`;

  const searchQuery = `
    SELECT f.*, c.number as category_number, c.name as category_name,
           a.name as area_name, a.color as area_color
    FROM folders f
    JOIN categories c ON f.category_id = c.id
    JOIN areas a ON c.area_id = a.id
    WHERE f.folder_number LIKE ?
       OR f.name LIKE ?
       OR f.description LIKE ?
       OR f.keywords LIKE ?
       OR f.notes LIKE ?
       OR c.name LIKE ?
       OR a.name LIKE ?
    ORDER BY f.folder_number
  `;

  const results = db.exec(searchQuery, [
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
  ]);

  return mapResults(results, FOLDER_COLUMNS) as FolderSearchResult[];
}

/**
 * Search items by text query.
 * Searches item_number, name, description, keywords, notes, folder name, category name, and area name.
 */
export function searchItems(query: string): ItemSearchResult[] {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const db = requireDB();
  const sanitized = sanitizeText(query);
  const searchPattern = `%${sanitized}%`;

  const searchQuery = `
    SELECT i.*, f.folder_number, f.name as folder_name, f.sensitivity as folder_sensitivity,
           c.number as category_number, c.name as category_name,
           a.name as area_name, a.color as area_color
    FROM items i
    JOIN folders f ON i.folder_id = f.id
    JOIN categories c ON f.category_id = c.id
    JOIN areas a ON c.area_id = a.id
    WHERE i.item_number LIKE ?
       OR i.name LIKE ?
       OR i.description LIKE ?
       OR i.keywords LIKE ?
       OR i.notes LIKE ?
       OR f.name LIKE ?
       OR c.name LIKE ?
       OR a.name LIKE ?
    ORDER BY i.item_number
  `;

  const results = db.exec(searchQuery, [
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
    searchPattern,
  ]);

  const items = mapResults(results, ITEM_COLUMNS);
  return items.map(addEffectiveSensitivity);
}

/**
 * Search across both folders and items.
 */
export function searchAll(query: string): SearchResults {
  return {
    folders: searchFolders(query),
    items: searchItems(query),
  };
}
