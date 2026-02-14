/**
 * Johnny Decimal Hierarchy Fixtures
 *
 * Test data for JD areas, categories, folders, and items.
 * Use these in integration tests to set up realistic data scenarios.
 */

// =============================================================================
// Standard JD Hierarchy (Most Common Test Scenario)
// =============================================================================

export const standardAreas = [
  {
    id: 1,
    range_start: 10,
    range_end: 19,
    name: 'Finance',
    description: 'Financial documents and records',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    range_start: 20,
    range_end: 29,
    name: 'Work',
    description: 'Work projects and documents',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    range_start: 30,
    range_end: 39,
    name: 'Personal',
    description: 'Personal items and media',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
];

export const standardCategories = [
  {
    id: 1,
    number: 11,
    area_id: 1,
    name: 'Invoices',
    description: 'Invoice documents',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    number: 12,
    area_id: 1,
    name: 'Receipts',
    description: 'Receipt documents',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    number: 21,
    area_id: 2,
    name: 'Active Projects',
    description: 'Current work projects',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 4,
    number: 22,
    area_id: 2,
    name: 'Completed Projects',
    description: 'Archived work projects',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 5,
    number: 31,
    area_id: 3,
    name: 'Photos',
    description: 'Photo collections',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
];

export const standardFolders = [
  {
    id: 1,
    number: '11.01',
    category_id: 1,
    name: 'Client Invoices',
    description: 'Invoices sent to clients',
    file_path: '/JD/10-19 Finance/11 Invoices/11.01 Client Invoices',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    number: '11.02',
    category_id: 1,
    name: 'Vendor Invoices',
    description: 'Invoices from vendors',
    file_path: '/JD/10-19 Finance/11 Invoices/11.02 Vendor Invoices',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 3,
    number: '12.01',
    category_id: 2,
    name: 'Business Receipts',
    description: 'Business expense receipts',
    file_path: '/JD/10-19 Finance/12 Receipts/12.01 Business Receipts',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 4,
    number: '21.01',
    category_id: 3,
    name: 'ProjectX',
    description: 'Project X documentation',
    file_path: '/JD/20-29 Work/21 Active Projects/21.01 ProjectX',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 5,
    number: '21.02',
    category_id: 3,
    name: 'ProjectY',
    description: 'Project Y documentation',
    file_path: '/JD/20-29 Work/21 Active Projects/21.02 ProjectY',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 6,
    number: '31.01',
    category_id: 5,
    name: 'Family Photos',
    description: 'Family photo collection',
    file_path: '/JD/30-39 Personal/31 Photos/31.01 Family Photos',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 7,
    number: '31.02',
    category_id: 5,
    name: 'Travel Photos',
    description: 'Travel photo collection',
    file_path: '/JD/30-39 Personal/31 Photos/31.02 Travel Photos',
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2025-01-01T00:00:00.000Z',
  },
];

export const standardItems = [
  {
    id: 1,
    number: '11.01.001',
    folder_id: 1,
    name: 'Invoice - Acme Corp Jan 2025',
    description: 'January invoice for Acme Corp',
    file_path:
      '/JD/10-19 Finance/11 Invoices/11.01 Client Invoices/Invoice - Acme Corp Jan 2025.pdf',
    created_at: '2025-01-15T00:00:00.000Z',
    updated_at: '2025-01-15T00:00:00.000Z',
  },
];

/**
 * Complete standard JD hierarchy for integration tests
 */
export const standardJDHierarchy = {
  areas: standardAreas,
  categories: standardCategories,
  folders: standardFolders,
  items: standardItems,
};

// =============================================================================
// Minimal Hierarchy (For Simple Tests)
// =============================================================================

export const minimalJDHierarchy = {
  areas: [
    {
      id: 1,
      range_start: 10,
      range_end: 19,
      name: 'Documents',
      description: 'General documents',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ],
  categories: [
    {
      id: 1,
      number: 11,
      area_id: 1,
      name: 'General',
      description: 'General category',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ],
  folders: [
    {
      id: 1,
      number: '11.01',
      category_id: 1,
      name: 'Inbox',
      description: 'Incoming files',
      file_path: '/JD/10-19 Documents/11 General/11.01 Inbox',
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    },
  ],
  items: [],
};

// =============================================================================
// Empty Hierarchy (For Edge Case Tests)
// =============================================================================

export const emptyJDHierarchy = {
  areas: [],
  categories: [],
  folders: [],
  items: [],
};

// =============================================================================
// Large Hierarchy (For Performance/Scale Tests)
// =============================================================================

/**
 * Generate a large JD hierarchy for testing at scale
 * @param {number} areaCount - Number of areas to create
 * @param {number} categoriesPerArea - Categories per area
 * @param {number} foldersPerCategory - Folders per category
 * @returns {Object} Complete hierarchy
 */
export function generateLargeHierarchy(
  areaCount = 5,
  categoriesPerArea = 5,
  foldersPerCategory = 10
) {
  const areas = [];
  const categories = [];
  const folders = [];

  let areaId = 1;
  let categoryId = 1;
  let folderId = 1;

  for (let a = 0; a < areaCount; a++) {
    const rangeStart = 10 + a * 10;
    areas.push({
      id: areaId,
      range_start: rangeStart,
      range_end: rangeStart + 9,
      name: `Area ${areaId}`,
      description: `Test area ${areaId}`,
      created_at: '2025-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
    });

    for (let c = 0; c < categoriesPerArea; c++) {
      const categoryNumber = rangeStart + c + 1;
      categories.push({
        id: categoryId,
        number: categoryNumber,
        area_id: areaId,
        name: `Category ${categoryNumber}`,
        description: `Test category ${categoryNumber}`,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      });

      for (let f = 0; f < foldersPerCategory; f++) {
        const folderNumber = `${categoryNumber}.${String(f + 1).padStart(2, '0')}`;
        folders.push({
          id: folderId,
          number: folderNumber,
          category_id: categoryId,
          name: `Folder ${folderNumber}`,
          description: `Test folder ${folderNumber}`,
          file_path: `/JD/${folderNumber}`,
          created_at: '2025-01-01T00:00:00.000Z',
          updated_at: '2025-01-01T00:00:00.000Z',
        });
        folderId++;
      }
      categoryId++;
    }
    areaId++;
  }

  return { areas, categories, folders, items: [] };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Find a folder by number in the standard hierarchy
 * @param {string} folderNumber - e.g., '11.01'
 * @returns {Object|undefined} Folder object
 */
export function findStandardFolder(folderNumber) {
  return standardFolders.find((f) => f.number === folderNumber);
}

/**
 * Get all folders for a category
 * @param {number} categoryId
 * @returns {Array} Folders
 */
export function getFoldersForCategory(categoryId) {
  return standardFolders.filter((f) => f.category_id === categoryId);
}

/**
 * Get category by number
 * @param {number} categoryNumber - e.g., 11
 * @returns {Object|undefined} Category object
 */
export function findStandardCategory(categoryNumber) {
  return standardCategories.find((c) => c.number === categoryNumber);
}
