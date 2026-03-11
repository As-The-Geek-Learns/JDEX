/**
 * Scanned Files Fixtures
 *
 * Test data for file scanning and organization.
 * Includes various file types, sizes, and metadata.
 */

// =============================================================================
// PDF Files (Common for Invoices/Documents)
// =============================================================================

export const pdfFiles = [
  {
    id: 1,
    filename: 'invoice_2025-01-15.pdf',
    path: '/Users/testuser/Downloads/invoice_2025-01-15.pdf',
    file_extension: 'pdf',
    file_size: 102400, // 100 KB
    file_type: 'document',
    created_at: '2025-01-15T10:30:00.000Z',
    modified_at: '2025-01-15T10:30:00.000Z',
  },
  {
    id: 2,
    filename: 'contract_acme_corp.pdf',
    path: '/Users/testuser/Downloads/contract_acme_corp.pdf',
    file_extension: 'pdf',
    file_size: 256000, // 250 KB
    file_type: 'document',
    created_at: '2025-01-10T14:00:00.000Z',
    modified_at: '2025-01-10T14:00:00.000Z',
  },
  {
    id: 3,
    filename: 'receipt_amazon_2025.pdf',
    path: '/Users/testuser/Downloads/receipt_amazon_2025.pdf',
    file_extension: 'pdf',
    file_size: 51200, // 50 KB
    file_type: 'document',
    created_at: '2025-01-20T08:15:00.000Z',
    modified_at: '2025-01-20T08:15:00.000Z',
  },
  {
    id: 4,
    filename: 'INV-00123-client.pdf',
    path: '/Users/testuser/Downloads/INV-00123-client.pdf',
    file_extension: 'pdf',
    file_size: 76800, // 75 KB
    file_type: 'document',
    created_at: '2025-01-22T11:45:00.000Z',
    modified_at: '2025-01-22T11:45:00.000Z',
  },
];

// =============================================================================
// Image Files (Photos)
// =============================================================================

export const imageFiles = [
  {
    id: 10,
    filename: 'family_photo_2025.jpg',
    path: '/Users/testuser/Pictures/family_photo_2025.jpg',
    file_extension: 'jpg',
    file_size: 3145728, // 3 MB
    file_type: 'image',
    created_at: '2025-01-05T16:00:00.000Z',
    modified_at: '2025-01-05T16:00:00.000Z',
  },
  {
    id: 11,
    filename: 'vacation_paris_001.jpg',
    path: '/Users/testuser/Pictures/vacation_paris_001.jpg',
    file_extension: 'jpg',
    file_size: 4194304, // 4 MB
    file_type: 'image',
    created_at: '2024-12-20T09:30:00.000Z',
    modified_at: '2024-12-20T09:30:00.000Z',
  },
  {
    id: 12,
    filename: 'Screenshot 2025-01-25.png',
    path: '/Users/testuser/Desktop/Screenshot 2025-01-25.png',
    file_extension: 'png',
    file_size: 524288, // 500 KB
    file_type: 'image',
    created_at: '2025-01-25T14:22:00.000Z',
    modified_at: '2025-01-25T14:22:00.000Z',
  },
  {
    id: 13,
    filename: 'travel_tokyo_sunset.jpg',
    path: '/Users/testuser/Pictures/travel_tokyo_sunset.jpg',
    file_extension: 'jpg',
    file_size: 5242880, // 5 MB
    file_type: 'image',
    created_at: '2024-11-15T18:45:00.000Z',
    modified_at: '2024-11-15T18:45:00.000Z',
  },
];

// =============================================================================
// Office Documents
// =============================================================================

export const officeFiles = [
  {
    id: 20,
    filename: 'project_spec.docx',
    path: '/Users/testuser/Documents/project_spec.docx',
    file_extension: 'docx',
    file_size: 153600, // 150 KB
    file_type: 'document',
    created_at: '2025-01-18T10:00:00.000Z',
    modified_at: '2025-01-18T10:00:00.000Z',
  },
  {
    id: 21,
    filename: 'requirements_v2.docx',
    path: '/Users/testuser/Documents/requirements_v2.docx',
    file_extension: 'docx',
    file_size: 204800, // 200 KB
    file_type: 'document',
    created_at: '2025-01-19T11:30:00.000Z',
    modified_at: '2025-01-19T11:30:00.000Z',
  },
  {
    id: 22,
    filename: 'budget_2025.xlsx',
    path: '/Users/testuser/Documents/budget_2025.xlsx',
    file_extension: 'xlsx',
    file_size: 81920, // 80 KB
    file_type: 'spreadsheet',
    created_at: '2025-01-02T09:00:00.000Z',
    modified_at: '2025-01-02T09:00:00.000Z',
  },
];

// =============================================================================
// Batch Rename Test Files
// =============================================================================

export const batchRenameFiles = [
  {
    name: 'document_001.txt',
    path: '/Users/testuser/Downloads/document_001.txt',
    size: 1024,
    extension: 'txt',
  },
  {
    name: 'document_002.txt',
    path: '/Users/testuser/Downloads/document_002.txt',
    size: 2048,
    extension: 'txt',
  },
  {
    name: 'document_003.txt',
    path: '/Users/testuser/Downloads/document_003.txt',
    size: 3072,
    extension: 'txt',
  },
  {
    name: 'report_january.pdf',
    path: '/Users/testuser/Downloads/report_january.pdf',
    size: 102400,
    extension: 'pdf',
  },
  {
    name: 'report_february.pdf',
    path: '/Users/testuser/Downloads/report_february.pdf',
    size: 112640,
    extension: 'pdf',
  },
];

// =============================================================================
// Files for Conflict Testing
// =============================================================================

export const conflictTestFiles = {
  source: {
    filename: 'important_document.pdf',
    path: '/Users/testuser/Downloads/important_document.pdf',
    file_extension: 'pdf',
    file_size: 102400,
  },
  existingAtDestination: {
    filename: 'important_document.pdf',
    path: '/JD/11.01/important_document.pdf',
    file_extension: 'pdf',
    file_size: 51200, // Different size (older version)
  },
};

// =============================================================================
// Files with Special Characters
// =============================================================================

export const specialCharFiles = [
  {
    id: 30,
    filename: 'report (final) 2025.pdf',
    path: '/Users/testuser/Downloads/report (final) 2025.pdf',
    file_extension: 'pdf',
    file_size: 102400,
    file_type: 'document',
  },
  {
    id: 31,
    filename: "client's contract.pdf",
    path: "/Users/testuser/Downloads/client's contract.pdf",
    file_extension: 'pdf',
    file_size: 153600,
    file_type: 'document',
  },
  {
    id: 32,
    filename: 'file-with-dashes_and_underscores.docx',
    path: '/Users/testuser/Downloads/file-with-dashes_and_underscores.docx',
    file_extension: 'docx',
    file_size: 81920,
    file_type: 'document',
  },
];

// =============================================================================
// Collections
// =============================================================================

/**
 * All files for comprehensive testing
 */
export const allFiles = [...pdfFiles, ...imageFiles, ...officeFiles];

/**
 * Mixed file set (one of each type)
 */
export const mixedFiles = [pdfFiles[0], imageFiles[0], officeFiles[0]];

/**
 * Large batch of files for performance testing
 */
export function generateLargeFileBatch(count = 100) {
  const files = [];
  const extensions = ['pdf', 'jpg', 'png', 'docx', 'xlsx', 'txt'];
  const types = ['document', 'image', 'image', 'document', 'spreadsheet', 'document'];

  for (let i = 0; i < count; i++) {
    const extIndex = i % extensions.length;
    files.push({
      id: 1000 + i,
      filename: `file_${String(i).padStart(4, '0')}.${extensions[extIndex]}`,
      path: `/Users/testuser/Downloads/file_${String(i).padStart(4, '0')}.${extensions[extIndex]}`,
      file_extension: extensions[extIndex],
      file_size: Math.floor(Math.random() * 5000000) + 10000,
      file_type: types[extIndex],
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      modified_at: new Date().toISOString(),
    });
  }
  return files;
}

// =============================================================================
// Organized Files History (for statistics)
// =============================================================================

export const organizedFilesHistory = [
  {
    id: 1,
    original_path: '/Users/testuser/Downloads/invoice_jan.pdf',
    destination_path: '/JD/11.01/invoice_jan.pdf',
    folder_number: '11.01',
    rule_id: 1,
    organized_at: '2025-01-15T10:30:00.000Z',
    file_size: 102400,
    file_extension: 'pdf',
  },
  {
    id: 2,
    original_path: '/Users/testuser/Pictures/photo.jpg',
    destination_path: '/JD/31.01/photo.jpg',
    folder_number: '31.01',
    rule_id: 2,
    organized_at: '2025-01-16T14:00:00.000Z',
    file_size: 3145728,
    file_extension: 'jpg',
  },
  {
    id: 3,
    original_path: '/Users/testuser/Downloads/receipt.pdf',
    destination_path: '/JD/12.01/receipt.pdf',
    folder_number: '12.01',
    rule_id: 11,
    organized_at: '2025-01-17T09:15:00.000Z',
    file_size: 51200,
    file_extension: 'pdf',
  },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a test file object
 * @param {Object} options
 * @returns {Object} File object
 */
export function createTestFile({
  id = Date.now(),
  filename,
  directory = '/Users/testuser/Downloads',
  extension,
  size = 102400,
  type = 'document',
}) {
  const ext = extension || filename.split('.').pop();
  return {
    id,
    filename,
    path: `${directory}/${filename}`,
    file_extension: ext,
    file_size: size,
    file_type: type,
    created_at: new Date().toISOString(),
    modified_at: new Date().toISOString(),
  };
}

/**
 * Filter files by extension
 * @param {Array} files
 * @param {string} extension
 * @returns {Array} Filtered files
 */
export function filterByExtension(files, extension) {
  return files.filter((f) => f.file_extension === extension);
}

/**
 * Filter files by type
 * @param {Array} files
 * @param {string} type
 * @returns {Array} Filtered files
 */
export function filterByType(files, type) {
  return files.filter((f) => f.file_type === type);
}

/**
 * Get files from a specific directory
 * @param {Array} files
 * @param {string} directory
 * @returns {Array} Filtered files
 */
export function getFilesInDirectory(files, directory) {
  return files.filter((f) => f.path.startsWith(directory));
}

/**
 * Calculate total size of files
 * @param {Array} files
 * @returns {number} Total size in bytes
 */
export function getTotalFileSize(files) {
  return files.reduce((sum, f) => sum + (f.file_size || f.size || 0), 0);
}
