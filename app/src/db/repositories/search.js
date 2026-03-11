/**
 * Search Repository
 * ==================
 * Search operations across folders and items.
 */

import { getDB, mapResults } from './utils.js';
import { sanitizeText } from '../../utils/validation.js';

// Column definitions for folder search results
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
];

// Column definitions for item search results
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
];

/**
 * Add effective sensitivity to item.
 * @param {Object} item - Raw item object
 * @returns {Object} Item with effective_sensitivity computed
 */
function addEffectiveSensitivity(item) {
  return {
    ...item,
    effective_sensitivity:
      item.sensitivity === 'inherit' ? item.folder_sensitivity : item.sensitivity,
  };
}

/**
 * Search folders by text query.
 * Searches folder_number, name, description, keywords, notes, category name, and area name.
 * @param {string} query - Search query string
 * @returns {Array<Object>} Array of matching folder objects
 */
export function searchFolders(query) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const db = getDB();
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

  return mapResults(results, FOLDER_COLUMNS);
}

/**
 * Search items by text query.
 * Searches item_number, name, description, keywords, notes, folder name, category name, and area name.
 * @param {string} query - Search query string
 * @returns {Array<Object>} Array of matching item objects with effective_sensitivity
 */
export function searchItems(query) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  const db = getDB();
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
 * @param {string} query - Search query string
 * @returns {Object} Object with folders and items arrays
 */
export function searchAll(query) {
  return {
    folders: searchFolders(query),
    items: searchItems(query),
  };
}
