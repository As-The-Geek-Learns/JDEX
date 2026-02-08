import {
  __setMockDbState,
  __resetMockDb,
  __getMockDbState,
} from '../../__mocks__/sql.js.js';

/**
 * Set up mock database with JD hierarchy data for testing
 * @param {Object} data - Object containing areas, categories, folders, items
 * @param {Array<Object>} [data.areas] - Array of area objects
 * @param {Array<Object>} [data.categories] - Array of category objects
 * @param {Array<Object>} [data.folders] - Array of folder objects
 * @param {Array<Object>} [data.items] - Array of item objects
 * @returns {void}
 * @example
 * setupMockJDData({
 *   areas: [{ id: 1, code: '10-19', name: 'Personal' }],
 *   categories: [{ id: 1, area_id: 1, code: '11', name: 'Finance' }],
 *   folders: [{ id: 1, category_id: 1, code: '11.01', name: 'Banking' }],
 *   items: [{ id: 1, folder_id: 1, code: '11.01.001', name: 'Checking Account' }],
 * });
 */
export function setupMockJDData({ areas = [], categories = [], folders = [], items = [] } = {}) {
  const state = {};

  if (areas.length) {
    const values = areas.map((a) => [a.id, a.code, a.name, a.description || '']);
    state['SELECT * FROM areas'] = [
      { values, columns: ['id', 'code', 'name', 'description'] },
    ];
  }

  if (categories.length) {
    const values = categories.map((c) => [
      c.id,
      c.area_id,
      c.code,
      c.name,
      c.description || '',
    ]);
    state['SELECT * FROM categories'] = [
      { values, columns: ['id', 'area_id', 'code', 'name', 'description'] },
    ];
  }

  if (folders.length) {
    const values = folders.map((f) => [
      f.id,
      f.category_id,
      f.code,
      f.name,
      f.description || '',
      f.path || '',
    ]);
    state['SELECT * FROM folders'] = [
      { values, columns: ['id', 'category_id', 'code', 'name', 'description', 'path'] },
    ];
  }

  if (items.length) {
    const values = items.map((i) => [
      i.id,
      i.folder_id,
      i.code,
      i.name,
      i.description || '',
    ]);
    state['SELECT * FROM items'] = [
      { values, columns: ['id', 'folder_id', 'code', 'name', 'description'] },
    ];
  }

  __setMockDbState(state);
}

/**
 * Set up mock database to simulate empty state
 * @returns {void}
 */
export function setupEmptyDb() {
  __resetMockDb();
}

/**
 * Set up mock database to simulate error state
 * @param {string} errorMessage - Error message to throw
 * @returns {void}
 */
export function setupDbError(errorMessage) {
  __setMockDbState({
    __error: new Error(errorMessage),
  });
}

/**
 * Get current mock database state for assertions
 * @returns {Object} Current mock state
 */
export function getMockDbState() {
  return __getMockDbState();
}

// Re-export for direct access if needed
export { __setMockDbState, __resetMockDb };
